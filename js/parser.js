// js/parser.js
export function parseLunchFile(text, targetMonthDot) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const result = {};
    const targetPattern = targetMonthDot.replace(/\./g, "-");
    const datePositions = [];

    lines.forEach((line, idx) => {
        const m = line.trim().match(/^(\d{4}\.\d{2}\.\d{2})/);
        if (m) datePositions.push({ idx, date: m[1].replace(/\./g, "-") });
    });

    for (let i = 0; i < datePositions.length; i++) {
        const { idx: start, date } = datePositions[i];
        if (!date.startsWith(targetPattern)) continue;
        const end = datePositions[i + 1] ? datePositions[i + 1].idx : lines.length;
        const dayBlock = lines.slice(start, end);
        let lastHeaderIdx = -1;
        for (let j = dayBlock.length - 1; j >= 0; j--) {
            if (dayBlock[j].trim() === "午餐") { lastHeaderIdx = j; break; }
        }
        if (lastHeaderIdx !== -1) {
            result[date] = processFinalStructure(dayBlock.slice(lastHeaderIdx));
        }
    }
    return result;
}

function processFinalStructure(lines) {
    const dayData = {};
    let mode = "meal";

    lines.forEach(line => {
        let t = line.trim();
        if (t === "---" || t.includes("飲料")) { mode = "drink"; return; }
        if (t === "午餐") { mode = "meal"; return; }
        if (!t || t.includes("$$月結") || t.includes("結單")) return;

        // 強制解析 [名字-內容數字]
        const match = t.match(/^([^\d\s\-:：]{2,8})\s*[-:：]{1,2}(.*)$/);
        if (match) {
            const name = match[1].trim().replace(/^\$/, '');
            let content = match[2].trim();
            if (!dayData[name]) dayData[name] = { meals: [], drinks: [], mealPrice: 0, drinkPrice: 0, hasError: false, total: 0 };

            let price = null;
            // 抓取最後一組數字 (無論前方有無空格)
            const priceMatch = content.match(/(\d+)$/);
            if (content.includes('=')) {
                const parts = content.split('=');
                const lastPart = parts[parts.length-1].match(/\d+/);
                if (lastPart) price = parseInt(lastPart[0]);
            } else if (priceMatch) {
                price = parseInt(priceMatch[1]);
            }

            if (price === null) {
                dayData[name].hasError = true;
                const errItem = { name: "⚠️ " + content, price: 0 };
                if (mode === "meal") dayData[name].meals.push(errItem);
                else dayData[name].drinks.push(errItem);
            } else {
                const itemName = content.replace(price.toString(), "").trim() || content;
                const item = { name: itemName, price: price };
                if (mode === "meal") { dayData[name].meals.push(item); dayData[name].mealPrice += price; }
                else { dayData[name].drinks.push(item); dayData[name].drinkPrice += price; }
            }
            dayData[name].total = dayData[name].mealPrice + dayData[name].drinkPrice;
        }
    });
    return dayData;
}