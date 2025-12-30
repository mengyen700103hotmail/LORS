// js/main.js
import { parseLunchFile } from './parser.js';
import { formatPersonalDetail, formatForLine } from './formatter.js';

let globalParsedData = {};
let personalStats = {};
let rawFileText = ""; 

const fileInput = document.getElementById('fileInput');
const monthSelect = document.getElementById('monthSelect');
const personSelect = document.getElementById('personSelect');
const summaryBody = document.querySelector('#summaryTable tbody');
const copyBtn = document.getElementById('copyBtn');

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        rawFileText = event.target.result;
        updateMonthOptions(rawFileText);
        runAnalysis();
    };
    reader.readAsText(file);
});

monthSelect.addEventListener('change', runAnalysis);

function updateMonthOptions(text) {
    const monthSet = new Set();
    const dateMatches = text.match(/\d{4}\.\d{2}\.\d{2}/g);
    if (dateMatches) {
        dateMatches.forEach(d => monthSet.add(d.substring(0, 7)));
    }
    const sorted = Array.from(monthSet).sort().reverse();
    monthSelect.innerHTML = sorted.map(m => `<option value="${m}">${m.replace('.','年')}月</option>`).join('');
}

function runAnalysis() {
    const month = monthSelect.value;
    globalParsedData = parseLunchFile(rawFileText, month);
    personalStats = {};
    for (const date in globalParsedData) {
        const dayData = globalParsedData[date];
        for (const name in dayData) {
            if (!personalStats[name]) personalStats[name] = { total: 0, dates: {}, hasError: false };
            personalStats[name].dates[date] = dayData[name];
            personalStats[name].total += dayData[name].total;
            if (dayData[name].hasError) personalStats[name].hasError = true;
        }
    }
    renderSummary();
}

function renderSummary() {
    summaryBody.innerHTML = '';
    personSelect.innerHTML = '<option value="">-- 選擇人員 --</option>';
    Object.keys(personalStats).sort().forEach(name => {
        const isError = personalStats[name].hasError;
        const star = isError ? '<span style="color:red">*</span>' : '';
        const row = document.createElement('tr');
        row.innerHTML = `<td>${name}${star}</td><td>${personalStats[name].total}</td>`;
        row.style.cursor = "pointer";
        row.onclick = () => { personSelect.value = name; displayDetail(name); };
        summaryBody.appendChild(row);
        
        // 選單也加上 *
        const option = document.createElement('option');
        option.value = name;
        option.textContent = isError ? `${name}*` : name;
        personSelect.appendChild(option);
    });
}

function displayDetail(name) {
    if (!name || !personalStats[name]) return;
    document.getElementById('selectedPersonName').textContent = name;
    document.getElementById('personalDetail').innerHTML = formatPersonalDetail(personalStats[name]);
    copyBtn.style.display = 'inline-block';
    copyBtn.onclick = () => {
        const text = formatForLine(name, personalStats[name], monthSelect.value);
        navigator.clipboard.writeText(text).then(() => alert('已複製明細'));
    };
}