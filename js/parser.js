// js/parser.js
export function parseLunchFile(text, targetMonthDot) {
  const targetMonth = targetMonthDot.replace(".", "-"); // 2025-11
  const lines = text.split(/\r?\n/);

  // date -> name -> { mealName, mealPrice, drinkName, drinkPrice }
  const result = {}; 

  let currentDate = null;
  let currentType = null;
  let inSettlement = false;
  let tempDaily = null;

  function commitDaily() {
    if (currentDate && tempDaily && Object.keys(tempDaily).length > 0) {
      result[currentDate] = tempDaily;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 日期行：2025.11.07
    const dm = line.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
    if (dm) {
      // ✅ 新日期出現 → 結算前一天
      commitDaily();

      currentDate = `${dm[1]}-${dm[2]}-${dm[3]}`;
      inSettlement = false;
      tempDaily = null;
      continue;
    }

    // 開始新的結單（會覆蓋前一次）
    if (line.includes("結單")) {
      commitDaily();

      if (currentDate && currentDate.startsWith(targetMonth)) {
        tempDaily = {};
        inSettlement = true;
        currentType = null;
      }
      continue;
    }

    if (!inSettlement || !currentDate || !currentDate.startsWith(targetMonth)) {
      continue;
    }

    if (line === "午餐") {
      currentType = "meal";
      continue;
    }

    if (line === "飲料") {
      currentType = "drink";
      continue;
    }

    // 人名-品項 金額
    if (currentType) {
      // 匹配：人名(m[1])-品項(m[2]) 金額(m[3])
      const m = line.match(/^([^-$\d]+?)-(.*?)\s*(\d+)$/);
      if (!m) continue;

      const name = m[1].trim();
      const item = m[2].trim();
      const price = Number(m[3]);

      if (!tempDaily[name]) {
        tempDaily[name] = { 
          mealName: "", mealPrice: 0, 
          drinkName: "", drinkPrice: 0 
        };
      }

      // ✅ 同結單、同人、同類型 → 覆蓋
      if (currentType === "meal") {
        tempDaily[name].mealName = item;
        tempDaily[name].mealPrice = price;
      } else if (currentType === "drink") {
        tempDaily[name].drinkName = item;
        tempDaily[name].drinkPrice = price;
      }
    }
  }

  // ✅ 檔案結尾一定要再 commit 一次
  commitDaily();

  return result;
}
