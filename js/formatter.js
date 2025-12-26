// js/formatter.js

export function formatMonthlySummary(data) {
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

export function formatPersonDetail(data, personName, monthDot) {
  let output = "";
  let personTotal = 0;

  Object.entries(data)
    .sort()
    .forEach(([date, people]) => {
      if (!people[personName]) return;

      const { mealName, mealPrice, drinkName, drinkPrice } = people[personName];
      const sum = mealPrice + drinkPrice;
      if (sum === 0) return;

      const day = date.slice(8, 10);
      personTotal += sum;

      output += `${monthDot}.${day}\n`;
      if (mealPrice > 0) {
        output += `  餐點：${mealName || "午餐"} ${mealPrice}\n`;
      }
      if (drinkPrice > 0) {
        output += `  飲料：${drinkName || "飲料"} ${drinkPrice}\n`;
      }
      output += `  小計：${sum}\n\n`;
    });

  output += `\n${personName} 總金額：${personTotal}\n`;
  return output;
}
