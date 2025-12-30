// js/formatter.js
export function formatPersonalDetail(personData) {
    let html = '';
    const sortedDates = Object.keys(personData.dates).sort();
    sortedDates.forEach(date => {
        const day = personData.dates[date];
        const items = [...day.meals, ...day.drinks].map(i => i.name).join('、');
        html += `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;">
                    <span>${date}：${items}</span>
                    <span style="font-weight:bold; color:#d9534f;">${day.total}</span>
                 </div>`;
    });
    html += `<div style="text-align:right; font-weight:bold; padding-top:10px;">總計：${personData.total} 元</div>`;
    return html;
}

export function formatForLine(name, personData, month) {
    let text = `【${name} ${month.replace('.','年')}月餐點明細】\n`;
    Object.keys(personData.dates).sort().forEach(date => {
        const day = personData.dates[date];
        const items = [...day.meals, ...day.drinks].map(i => i.name).join('、');
        text += `${date} ${items}，金額:${day.total}\n`;
    });
    text += `-------------------\n總計：${personData.total} 元`;
    return text;
}