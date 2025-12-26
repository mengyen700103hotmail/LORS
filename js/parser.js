// js/parser.js
export function parseLunchFile(text, targetMonthDot) {
  const targetMonth = targetMonthDot.replace(".", "-"); // 2025-09
  const lines = text.split(/\r?\n/);

  // date -> name -> { mealName, mealPrice, drinkName, drinkPrice }
  const result = {};

  let currentDate = null;
  let currentType = null;
  let inSettlement = false;
  let tempDaily = null;
  let afterFinalClose = false;

  function ensurePerson(name) {
    if (!tempDaily[name]) {
      tempDaily[name] = {
        mealName: "",
        mealPrice: 0,
        drinkName: "",
        drinkPrice: 0
      };
    }
  }

  function commitDaily() {
    if (currentDate && tempDaily && Object.keys(tempDaily).length > 0) {
      result[currentDate] = tempDaily;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 日期行
    const dm = line.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
    if (dm) {
      commitDaily();
      currentDate = `${dm[1]}-${dm[2]}-${dm[3]}`;
      tempDaily = null;
      inSettlement = false;
      afterFinalClose = false;
      continue;
    }

    // 開始新的結單（以下xx結單）
    if (line.includes("以下") && line.includes("結單")) {
      commitDaily();

      if (currentDate && currentDate.startsWith(targetMonth)) {
        tempDaily = {};
        inSettlement = true;
        afterFinalClose = false;
        currentType = null;
      }
      continue;
    }

    // 結單結束標記
    if (line.includes("結單~")) {
      inSettlement = false;
      afterFinalClose = true;
      continue;
    }

    if (!currentDate || !currentDate.startsWith(targetMonth) || !tempDaily) {
      continue;
    }

    // 午餐 / 飲料
    if (line === "午餐") {
      currentType = "meal";
      continue;
    }
    if (line === "飲料") {
      currentType = "drink";
      continue;
    }

    // === 正常結單內容 ===
    if (inSettlement && currentType) {
      const m = line.match(/^([^-$\d]+?)-(.*?)\s*(\d+)$/);
      if (!m) continue;

      const name = m[1].trim();
      const item = m[2].trim();
      const price = Number(m[3]);

      ensurePerson(name);

      if (currentType === "meal") {
        tempDaily[name].mealName = item;
        tempDaily[name].mealPrice = price;
      } else {
        tempDaily[name].drinkName = item;
        tempDaily[name].drinkPrice = price;
      }
      continue;
    }

    // === 結單後「扣款修正」格式：149-13=136 ===
    if (afterFinalClose) {
      const fix = line.match(/^([^-$\d]+?)-.*?(\d+)\s*-\s*(\d+)\s*=\s*(\d+)/);
      if (!fix) continue;

      const name = fix[1].trim();
      const finalPrice = Number(fix[4]);

      ensurePerson(name);

      // 👉 修正一律視為「餐點金額覆蓋」
      tempDaily[name].mealPrice = finalPrice;
    }
  }

  commitDaily();
  return result;
}
