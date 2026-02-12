import fitz  # PyMuPDF
import json
import os
import time
import io
import traceback
import gc
from PIL import Image
from google import genai
from google.genai import types
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

class UrbanPlanAIParser:
    """
    都市計畫 AI 解析核心 (V26.4: Anti-Stuck & Safe JSON Parsing)
    
    1. 防呆解析：強制去除非標準的 JSON 雜訊 (如 Markdown 格式)，避免解析當機。
    2. 視覺強化：【最高優先】精確辨識分區文字（嚴格區分六與四）。
    3. 錯誤捕捉：若查無資料庫或發生異常，確實回傳 error / not_found 狀態給前端。
    """

    def __init__(self, api_key=None):
        self.api_key = api_key
        self.client = None
        self.db = None
        
        if self.api_key:
            try:
                self.client = genai.Client(
                    api_key=self.api_key, 
                    http_options={'api_version': 'v1beta'}
                )
            except Exception as e:
                print(f"[Error] Gemini 設定失敗: {e}")

        try:
            if not firebase_admin._apps:
                firebase_creds_json = os.environ.get("FIREBASE_CREDENTIALS")
                if firebase_creds_json:
                    cred_dict = json.loads(firebase_creds_json)
                    cred = credentials.Certificate(cred_dict)
                    firebase_admin.initialize_app(cred)
            
            if firebase_admin._apps:
                self.db = firestore.client()
        except Exception as e:
            print(f"[Error] Firebase 初始化失敗: {e}")

    def _normalize_place_name(self, name):
        if not name: return ""
        return str(name).replace(" ", "").replace("　", "").replace("台", "臺").lower()

    def _safe_parse_json(self, text):
        """強制去除 Markdown 標記，防止 json.loads 卡死"""
        try:
            text = text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text.strip())
        except Exception as e:
            raise ValueError(f"AI 回傳格式非標準 JSON: {text}")

    def query_land_by_image(self, image_path, site_area=None, roads=None):
        if not self.client: return {"status": "error", "message": "API Key 未設定"}
        if not self.db: return {"status": "error", "message": "資料庫未連線"}

        try:
            with open(image_path, "rb") as f:
                image_bytes = f.read()
            user_img = Image.open(io.BytesIO(image_bytes))

            # 1. 視覺分析
            location_prompt = """
            分析這張都市計畫圖：
            1. **【分區辨識】**：精確辨識基地上的文字（如住六-一、住八）。必須嚴格區分「六」與「四」，請放大檢視筆畫特徵。
            2. **【道路辨識】**：尋找基地面臨的每一條道路寬度（如 15M, 20M）。
            3. **【品質檢核】**：若分區模糊或看不見道路數字，請在 feedback_suggestion 給出建議（如「請局部放大」或「加大擷取範圍」）。
            
            必須只輸出純 JSON 格式（不可包含 Markdown）：
            {
              "district": "行政區",
              "detected_zone": "分區名稱",
              "detected_roads": [{"width": "數字", "type": "plan_road"}],
              "is_confident": true/false,
              "feedback_suggestion": "若無則為空字串"
            }
            """
            loc_resp = self.client.models.generate_content(
                model='gemini-flash-latest',
                contents=[location_prompt, user_img],
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            
            loc_data = self._safe_parse_json(loc_resp.text)
            
            # 診斷建議邏輯
            if not loc_data.get("is_confident") and loc_data.get("feedback_suggestion"):
                 return {"status": "need_better_image", "message": loc_data.get("feedback_suggestion")}
            if not loc_data.get("detected_roads") and loc_data.get("detected_zone") and not roads:
                return {"status": "need_better_image", "message": loc_data.get("feedback_suggestion") or "無法辨識基地臨路寬度，請手動輸入道路寬度或加大截圖範圍。"}

            target_district_clean = self._normalize_place_name(loc_data.get("district", ""))

            # 2. 檢索資料庫
            docs = self.db.collection("urban_plans").stream()
            matched_plan = None
            for doc in docs:
                data = doc.to_dict()
                db_district = self._normalize_place_name(data.get("district", ""))
                if target_district_clean in db_district or db_district in target_district_clean:
                    matched_plan = data
                    break

            if not matched_plan:
                return {"status": "not_found", "message": f"資料庫中尚未建立「{loc_data.get('district') or '該區域'}」的細部計畫資料。請先使用【資料庫建置】功能上傳 PDF。"}

            plan_content = json.dumps(matched_plan, ensure_ascii=False, default=str)
            final_roads = roads if (roads and any(r.get('width') for r in roads)) else loc_data.get("detected_roads", [])

            # 3. 法律深度試算
            analysis_prompt = f"""
            你是一位法律顧問。請針對該基地進行全項獎勵試算。
            
            【輸入數據】：分區 {loc_data.get('detected_zone')}, 道路 {json.dumps(final_roads, ensure_ascii=False)}
            【法規資料庫】：{plan_content}
            
            【指令】：
            1. **容積移轉上限**：基準(最高 30%) + 加成(重劃區/空地 10%) = 總上限(最高 40%)。
            2. **其他獎勵**：條列針對此分區的特定項目（如增額容積30%、低碳獎勵10%等）。
            
            必須只輸出純 JSON 格式（不可包含 Markdown）：
            {{
                "matched_area": "區域名稱",
                "reasoning": "說明 30%+10% 與分區判定",
                "regulations_summary": {{
                    "zone": "判定分區",
                    "max_tdr_bonus": "上限%",
                    "max_open_space_bonus": "上限%",
                    "other_incentives": "在此條列其他獎勵項目",
                    "setback": "退縮要求",
                    "bonus_conflict": "互斥說明"
                }}
            }}
            """
            
            final_resp = self.client.models.generate_content(
                model='gemini-flash-latest',
                contents=[analysis_prompt, user_img],
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            
            return {
                "status": "success",
                "doc_id": f"{matched_plan.get('district')}_{matched_plan.get('version_date')}",
                "analysis": self._safe_parse_json(final_resp.text)
            }
        except Exception as e:
            # 發生任何錯誤都會回傳給前端，不再死當
            return {"status": "error", "message": str(e)}

    def save_manual_data(self, json_data):
        if not self.db: return {"status": "error"}
        doc_id = f"{json_data.get('district')}_{json_data.get('version_date')}"
        self.db.collection("urban_plans").document(doc_id).set(json_data, merge=True)
        return {"status": "success", "doc_id": doc_id}

    def process_document_background(self, pdf_path):
        pass