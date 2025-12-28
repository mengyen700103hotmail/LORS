// js/main.js
import { parseLunchFile } from './parser.js';
import { formatPersonalDetail, formatForLine } from './formatter.js';

let globalParsedData = {};
let personalStats = {};
let rawFileText = ""; 

// 初始化
const fileInput = document.getElementById('fileInput');
const monthSelect = document.getElementById('monthSelect');
const personSelect = document.getElementById('personSelect');
const copyBtn = document.getElementById('copyBtn');

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        rawFileText = event.target.result;
        console.log("檔案讀取完成，長度：", rawFileText.length);
        
        const hasMonths = updateMonthOptions(rawFileText);
        
        if (hasMonths) {
            runAnalysis(); // 強制執行分析
        } else {
            alert("在檔案中找不到任何日期標記（格式需為 YYYY.MM.DD）");
        }
    };
    reader.readAsText(file);
});

monthSelect.addEventListener('change', () => {
    if (rawFileText) runAnalysis();
});

function updateMonthOptions(text) {
    const monthSet = new Set();
    // 修正的正則表達式，確保能抓到 LINE 格式的日期
    const dateMatches = text.match(/\d{4}\.\d{2}\.\d{2}/g);
    
    if (!dateMatches) return false;

    dateMatches.forEach(dateStr => {
        const parts = dateStr.split('.');
        monthSet.add(`${parts[0]}.${parts[1]}`); 
    });

    const sortedMonths = Array.from(monthSet).sort().reverse();
    
    if (sortedMonths.length > 0) {
        monthSelect.innerHTML = ''; 
        sortedMonths.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m.replace('.', '年') + '月';
            monthSelect.appendChild(opt);
        });
        return true;
    }
    return false;
}

function runAnalysis() {
    const month = monthSelect.value;
    if (!month) return;

    console.log("正在分析月份：", month);
    globalParsedData = parseLunchFile(rawFileText, month);
    
    processStats();
    renderSummary();
}

function processStats() {
    personalStats = {};
    for (const date in globalParsedData) {
        const dayData = globalParsedData[date];
        for (const name in dayData) {
            if (!personalStats[name]) {
                personalStats[name] = { total: 0, dates: {} };
            }
            personalStats[name].dates[date] = dayData[name];
            personalStats[name].total += (dayData[name].mealPrice + dayData[name].drinkPrice);
        }
    }
}

function renderSummary() {
    const summaryBody = document.querySelector('#summaryTable tbody');
    summaryBody.innerHTML = '';
    personSelect.innerHTML = '<option value="">-- 選擇人員 --</option>';

    const sortedNames = Object.keys(personalStats).sort();
    
    if (sortedNames.length === 0) {
        summaryBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">該月份無點餐紀錄</td></tr>';
        return;
    }

    sortedNames.forEach(name => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${name}</td><td>${personalStats[name].total}</td>`;
        summaryBody.appendChild(row);

        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        personSelect.appendChild(option);
    });

    document.getElementById('selectedPersonName').textContent = '-';
    document.getElementById('personalDetail').innerHTML = '<p style="color: #999; text-align: center;">請選擇人員查看明細</p>';
    copyBtn.style.display = 'none';
}

personSelect.addEventListener('change', (e) => {
    const name = e.target.value;
    const detailDiv = document.getElementById('personalDetail');
    const titleSpan = document.getElementById('selectedPersonName');
    const currentMonth = monthSelect.value;

    if (name && personalStats[name]) {
        titleSpan.textContent = name;
        detailDiv.innerHTML = formatPersonalDetail(personalStats[name]);
        copyBtn.style.display = 'inline-block';
        
        copyBtn.onclick = () => {
            const textToCopy = formatForLine(name, personalStats[name], currentMonth);
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '✅ 已複製';
                setTimeout(() => copyBtn.innerHTML = originalText, 2000);
            });
        };
    } else {
        titleSpan.textContent = '-';
        detailDiv.innerHTML = '<p style="color: #999; text-align: center;">請選擇人員</p>';
        copyBtn.style.display = 'none';
    }
});