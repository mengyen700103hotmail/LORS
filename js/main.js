// js/main.js
import { parseLunchFile } from "./parser.js";
import { formatMonthlySummary, formatPersonDetail } from "./formatter.js";

let lunchData = {};
let currentMonthDot = "";

const nameSelect = document.getElementById("nameSelect");
const summaryResult = document.getElementById("summaryResult");
const detailResult = document.getElementById("detailResult");
const calcBtn = document.getElementById("calcBtn");

calcBtn.addEventListener("click", () => {
  const file = document.getElementById("fileInput").files[0];
  const monthDot = document.getElementById("monthInput").value.trim();

  if (!file || !monthDot) {
    alert("請選檔案並輸入月份（YYYY.MM）");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    lunchData = parseLunchFile(reader.result, monthDot);
    currentMonthDot = monthDot;

    summaryResult.textContent = formatMonthlySummary(lunchData);

    // 顯示結果區域
    const resultContainer = document.getElementById("resultContainer");
    if (resultContainer) {
      resultContainer.classList.remove("hidden");
    }

    // 填人名
    const names = new Set();
    Object.values(lunchData).forEach(day =>
      Object.keys(day).forEach(n => names.add(n))
    );

    nameSelect.innerHTML = `<option value="">請選擇人員</option>`;
    nameSelect.disabled = false;
    [...names].sort().forEach(n => {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = n;
      nameSelect.appendChild(opt);
    });
  };

  reader.readAsText(file, "utf-8");
});

// 頁籤切換邏輯
const summaryTab = document.getElementById("summaryTab");
const detailTab = document.getElementById("detailTab");
const summaryContent = document.getElementById("summaryContent");
const detailContent = document.getElementById("detailContent");

summaryTab.addEventListener("click", () => {
  summaryTab.classList.add("active");
  detailTab.classList.remove("active");
  summaryContent.classList.remove("hidden");
  detailContent.classList.add("hidden");
});

detailTab.addEventListener("click", () => {
  detailTab.classList.add("active");
  summaryTab.classList.remove("active");
  detailContent.classList.remove("hidden");
  summaryContent.classList.add("hidden");
});

nameSelect.addEventListener("change", e => {
  if (!e.target.value) return;
  detailResult.textContent = formatPersonDetail(
    lunchData,
    e.target.value,
    currentMonthDot
  );
});
