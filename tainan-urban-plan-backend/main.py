from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Body, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
import json
from typing import Dict, Any, Optional
from urban_plan_ai_parser import UrbanPlanAIParser

app = FastAPI(title="Tainan Urban Plan AI API (V26.4)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def read_root():
    return {"status": "API Online", "version": "26.4"}

@app.post("/query-location/")
async def query_location(
    file: UploadFile = File(...),
    site_area: Optional[float] = Form(None),
    roads: Optional[str] = Form(None), 
    x_api_key: str = Header(..., description="Google Gemini API Key")
):
    if not x_api_key or len(x_api_key) < 5:
        raise HTTPException(status_code=400, detail="無效 API Key")
    
    api_key = x_api_key.split(',')[0].strip()
    unique_filename = f"query_{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        roads_data = None
        if roads:
            try:
                parsed_roads = json.loads(roads)
                # 預處理 JSON，過濾掉未填寫寬度的空資料
                roads_data = [r for r in parsed_roads if r.get('width')]
            except:
                roads_data = None
            
        parser = UrbanPlanAIParser(api_key=api_key)
        # 執行分析，若出錯 parser 現在會確實回傳 error dictionary
        result = parser.query_land_by_image(file_path, site_area, roads_data)
        return result
        
    except Exception as e:
        # 如果是外部層級當機，回傳 500 給前端 catch
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/upload-pdf/")
async def upload_plan_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    x_api_key: str = Header(..., description="Google Gemini API Key")
):
    api_key = x_api_key.split(',')[0].strip()
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    parser = UrbanPlanAIParser(api_key=api_key) 
    background_tasks.add_task(parser.process_document_background, file_path)
    return {"status": "queued", "message": "背景解析任務已排入。"}

@app.post("/chat/")
async def chat_with_plan_api(
    body: Dict[Any, Any] = Body(...),
    x_api_key: str = Header(..., description="Google Gemini API Key")
):
    api_key = x_api_key.split(',')[0].strip()
    parser = UrbanPlanAIParser(api_key=api_key)
    return parser.chat_with_plan(body.get("doc_id"), body.get("question"), body.get("history", []))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)