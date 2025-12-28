// js/formatter.js (部分修正)
export function formatForLine(name, personData, currentMonth) {
    const sortedDates = Object.keys(personData.dates).sort();
    const displayMonth = currentMonth.replace('.', '年') + '月';
    let text = `【${name} ${displayMonth}餐點明細】\n`;
    
    sortedDates.forEach(date => {
        const day = personData.dates[date];
        const mealItems = day.meals.map(m => `${m.name} ${m.price}`);
        const drinkItems = day.drinks.map(d => `${d.name} ${d.price}`);
        const allItems = [...mealItems, ...drinkItems].join('、');
        text += `${date} ${allItems}，小計:${day.mealPrice + day.drinkPrice}\n`;
    });
    
    text += `-------------------\n總計：${personData.total} 元`;
    return text;
}
// formatPersonalDetail 函數維持不變即可