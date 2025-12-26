// js/formatter.js

// ① 月總表
export function formatMonthlySummary(data, monthDot) {
  const total = {};
  let grandTotal = 0;

  Object.values(data).forEach(day => {
    Object.entries(day).forEach(([name, { mealPrice, drinkPrice }]) => {
      const sum = mealPrice + drinkPrice;
      total[name] = (total[name] || 0) + sum;
      grandTotal += sum;
    });
  });

  let output = "";

  Object.entries(total)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, sum]) => {
      output += `${name} ${sum}\n`;
    });

  output += `\n總金額：${grandTotal}\n`;
  return output;
}

// ② 單人每日明細
export function formatPersonDetail(data, personName, monthDot) {
  let output = ``;
  let personTotal = 0;

  Object.entries(data)
    .sort()
    .forEach(([date, people]) => {
      if (!people[personName]) return;

      const { mealName, mealPrice, drinkName, drinkPrice } = people[personName];
      const day = date.slice(8, 10);
      const sum = mealPrice + drinkPrice;

      if (sum === 0) return; // 沒訂餐/飲料則跳過這一天

      personTotal += sum;

      output += `${monthDot}.${day}\n`;
      if (mealPrice > 0) {
        output += `  餐點：${mealName} ${mealPrice}\n`;
      }
      if (drinkPrice > 0) {
        output += `  飲料：${drinkName} ${drinkPrice}\n`;
      }
      output += `  小計：${sum}\n\n`; // 每天結束多一個換行
    });

  output += `\n${personName} 總金額：${personTotal}\n`;
  return output;
}
