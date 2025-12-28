// js/parser.js
export function parseLunchFile(text, targetMonthDot) {
    const lines = text.split(/\r?\n/);
    const result = {};
    const targetPattern = targetMonthDot.replace(/\./g, "-");

    const datePositions = [];
    lines.forEach((line, idx) => {
        const m = line.match(/^(\d{4}\.\d{2}\.\d{2})/);
        if (m) datePositions.push({ idx, date: m[1].replace(/\./g, "-") });
    });

    for (let i = 0; i < datePositions.length; i++) {
        const { idx: start, date } = datePositions[i];
        if (!date.startsWith(targetPattern)) continue;
        const end = datePositions[i + 1] ? datePositions[i + 1].idx : lines.length;
        const dayBlock = lines.slice(start, end);

        let lastHeaderIdx = -1;
        for (let j = dayBlock.length - 1; j >= 0; j--) {
            if (dayBlock[j].trim() === "午餐") {
                lastHeaderIdx = j;
                break;
            }
        }

        if (lastHeaderIdx !== -1) {
            result[date] = processFinalStructure(dayBlock.slice(lastHeaderIdx));
        }
    }
    return result;
}

function processFinalStructure(lines) {
    const dayData = {};
    let mode = null;

    lines.forEach(line => {
        const t = line.trim();
        if (!t) return;

        if (t === "午餐") { mode = "meal"; return; }
        if (t === "---" || t.includes("飲料")) { mode = "drink"; return; }
        if (t.match(/^[13]F/) || t.includes("結單") || t.includes("$$月結")) return;
        if (t.includes("+") && t.includes("=") && !t.includes("-")) return;

        const mainMatch = t.match(/^([^\d\s\-:：]{2,5})\s*[-:：]\s*(.*)$/);
        if (mainMatch && mode) {
            let name = mainMatch[1].trim();
            const fullContent = mainMatch[2].trim();

            if (!dayData[name]) {
                dayData[name] = { meals: [], mealPrice: 0, drinks: [], drinkPrice: 0, hasError: false };
            }

            // 處理等號結構 (優先)
            if (fullContent.includes('=')) {
                const parts = fullContent.split('=');
                const rightPart = parts[parts.length - 1].trim();
                const totalPriceMatch = rightPart.match(/\d+/);
                
                if (totalPriceMatch) {
                    const price = parseInt(totalPriceMatch[0], 10);
                    const itemName = parts[0].trim(); 
                    addEntry(dayData[name], mode, itemName, price);
                    return;
                }
            }

            // 處理普通結構或 A+B
            const items = fullContent.split('+');
            items.forEach(itemStr => {
                const allNumbers = itemStr.match(/\d+/g);
                if (allNumbers) {
                    const priceStr = allNumbers[allNumbers.length - 1];
                    const price = parseInt(priceStr, 10);
                    
                    // 【關鍵修正】: 移除品項名稱末尾的金額數字，避免重複
                    // 尋找最後一個數字的位置並切除
                    const lastNumIndex = itemStr.lastIndexOf(priceStr);
                    const itemName = itemStr.substring(0, lastNumIndex).trim();
                    
                    // 如果切完後 itemName 為空 (例如只有數字 80)，則保留原樣
                    const finalItemName = itemName || itemStr.replace(priceStr, "").trim();

                    addEntry(dayData[name], mode, finalItemName, price);
                } else {
                    markError(dayData[name], mode, itemStr.trim(), "找不到金額數字");
                }
            });
        }
    });

    const finalData = {};
    for (const name in dayData) {
        const displayName = dayData[name].hasError ? `${name}*` : name;
        finalData[displayName] = dayData[name];
    }
    return finalData;
}

function addEntry(personObj, mode, itemName, price) {
    if (mode === "meal") {
        personObj.meals.push({ name: itemName, price: price });
        personObj.mealPrice += price;
    } else {
        personObj.drinks.push({ name: itemName, price: price });
        personObj.drinkPrice += price;
    }
}

function markError(personObj, mode, content, reason) {
    personObj.hasError = true;
    const errorItem = { name: `⚠️ 無法判斷: ${content} (${reason})`, price: 0 };
    if (mode === "meal") personObj.meals.push(errorItem);
    else personObj.drinks.push(errorItem);
}