// js/main.js
import { parseLunchFile } from "./parser.js";
import {
  formatMonthlySummary,
  formatPersonDetail
} from "./formatter.js";

// 全域變數用於儲存解析後的資料
let lunchData = {};
let currentMonthDot = "";

// DOM 元素
const nameSelect = document.getElementById("nameSelect");
const resultContainer = document.getElementById("resultContainer");
const summaryResult = document.getElementById("summaryResult");
const detailResult = document.getElementById("detailResult");
const summaryTab = document.getElementById("summaryTab");
const detailTab = document.getElementById("detailTab");
const calcBtn = document.getElementById("calcBtn");

// --- 分頁邏輯 ---
function switchTab(target) {
  if (target === "summary") {
    summaryTab.classList.add("active");
    detailTab.classList.remove("active");
    summaryContent.classList.remove("hidden");
    detailContent.classList.add("hidden");
  } else if (target === "detail") {
    summaryTab.classList.remove("active");
    detailTab.classList.add("active");
    summaryContent.classList.add("hidden");
    detailContent.classList.remove("hidden");

    // 切換到明細頁時，如果已經有人名被選擇，立即顯示明細
    if (nameSelect.value) {
      showPersonDetail(nameSelect.value);
    }
  }
}

summaryTab.addEventListener("click", () => switchTab("summary"));
detailTab.addEventListener("click", () => switchTab("detail"));

// --- 人名下拉選單邏輯 ---
function populateNameSelect(data) {
  const allNames = new Set();
  Object.values(data).forEach(day => {
    Object.keys(day).forEach(name => allNames.add(name));
  });

  const names = Array.from(allNames).sort();
  
  // 清空現有選項
  nameSelect.innerHTML = '<option value="">- 請選擇查詢人員 -</option>';

  names.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    nameSelect.appendChild(option);
  });

  nameSelect.disabled = false;
  nameSelect.selectedIndex = 0;
  detailResult.textContent = "請選擇查詢人員";
}

function showPersonDetail(personName) {
  if (!personName || !lunchData) {
    detailResult.textContent = "查無資料";
    return;
  }
  detailResult.textContent = formatPersonDetail(lunchData, personName, currentMonthDot);
}

nameSelect.addEventListener("change", (e) => {
  const personName = e.target.value;
  if (personName) {
    showPersonDetail(personName);
    // 如果不在明細頁，自動切換
    if (!detailTab.classList.contains("active")) {
      switchTab("detail");
    }
  } else {
    detailResult.textContent = "請選擇查詢人員";
  }
});

// --- 主要計算邏輯 ---
calcBtn.addEventListener("click", () => {
  const file = document.getElementById("fileInput").files[0];
  const monthInput = document.getElementById("monthInput");
  const monthDot = monthInput.value.trim();

  if (!file || !monthDot) {
    alert("請選檔案並輸入月份（YYYY.MM）");
    return;
  }
  
  // 清空上次結果
  summaryResult.textContent = "資料讀取中...";
  resultContainer.classList.add("hidden");
  nameSelect.disabled = true;

  const reader = new FileReader();
  reader.onload = () => {
    lunchData = parseLunchFile(reader.result, monthDot);
    currentMonthDot = monthDot;

    if (Object.keys(lunchData).length === 0) {
      summaryResult.textContent = "查無資料";
      resultContainer.classList.remove("hidden");
      return;
    }

    // 1. 顯示總表
    summaryResult.textContent = formatMonthlySummary(lunchData, currentMonthDot);
    resultContainer.classList.remove("hidden");
    
    // 2. 填充人名下拉選單
    populateNameSelect(lunchData);

    // 3. 預設切換到總表頁
    switchTab("summary");
  };

  reader.readAsText(file, "utf-8");
});
