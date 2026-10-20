// Safe image URL resolver
function getAssetPath(filename) {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL(filename);
    }
  } catch (e) {}
  return filename;
}

// Header Title Logo
const titleLogo = document.getElementById("titleLogo");
if (titleLogo) {
  titleLogo.src = getAssetPath("Pro.png");
}

const pngBalls = [
  "0.png", "1.png", "2.png", "3.png", "4.png",
  "5.png", "6.png", "7.png", "8.png", "9.png"
];

// Elements
const countdownTimer = document.getElementById("countdownTimer");
const periodDisplay = document.getElementById("periodDisplay");
const ballCenter = document.getElementById("ballCenter");
const ballLeft = document.getElementById("ballLeft");
const ballRight = document.getElementById("ballRight");
const sizeBadge = document.getElementById("sizeBadge");
const colorBadge = document.getElementById("colorBadge");
const closePopupBtn = document.getElementById("closePopupBtn");

// 'X' button
if (closePopupBtn) {
  closePopupBtn.addEventListener("click", () => {
    window.location.href = "popup.html";
  });
}

// WinGo Rules
const rules = {
  0: { size: "SMALL", color: "VIOLET", bg: "linear-gradient(180deg, #9333ea, #dc2626)" },
  1: { size: "SMALL", color: "GREEN", bg: "linear-gradient(180deg, #22c55e, #16a34a)" },
  2: { size: "SMALL", color: "RED", bg: "linear-gradient(180deg, #ef4444, #dc2626)" },
  3: { size: "SMALL", color: "GREEN", bg: "linear-gradient(180deg, #22c55e, #16a34a)" },
  4: { size: "SMALL", color: "RED", bg: "linear-gradient(180deg, #ef4444, #dc2626)" },
  5: { size: "BIG", color: "VIOLET", bg: "linear-gradient(180deg, #9333ea, #22c55e)" },
  6: { size: "BIG", color: "RED", bg: "linear-gradient(180deg, #ef4444, #dc2626)" },
  7: { size: "BIG", color: "GREEN", bg: "linear-gradient(180deg, #22c55e, #16a34a)" },
  8: { size: "BIG", color: "RED", bg: "linear-gradient(180deg, #ef4444, #dc2626)" },
  9: { size: "BIG", color: "GREEN", bg: "linear-gradient(180deg, #22c55e, #16a34a)" }
};

let lastPeriodId = null;

// Available modes
const modes = [
  { label: "1 Min", interval: 60,  prefix: "10001" },
  { label: "30s",   interval: 30,  prefix: "10005" },
  { label: "3 Min", interval: 180, prefix: "10002" },
  { label: "5 Min", interval: 300, prefix: "10003" }
];
let currentModeIndex = 0; // Default WinGo 1 Min

// Sirf countdownTimer par tap karne se mode switch hoga (Design 0% bhi touch nahi hoga)
if (countdownTimer) {
  countdownTimer.style.cursor = "pointer";
  countdownTimer.addEventListener("click", () => {
    currentModeIndex = (currentModeIndex + 1) % modes.length;
    syncOkWinTime();
  });
}

// Result Update
function updatePredictionResult() {
  try {
    const randomIndex = Math.floor(Math.random() * pngBalls.length);
    const selectedPNG = pngBalls[randomIndex];
    const data = rules[randomIndex];
    const fullPath = getAssetPath(selectedPNG);

    if (ballCenter) ballCenter.src = fullPath;
    if (ballLeft) ballLeft.src = fullPath;
    if (ballRight) ballRight.src = fullPath;

    if (sizeBadge) sizeBadge.textContent = data.size;
    if (colorBadge) {
      colorBadge.textContent = data.color;
      colorBadge.style.background = data.bg;
    }
  } catch (e) {}
}

// Sync calculation loop
function syncOkWinTime() {
  const activeMode = modes[currentModeIndex];

  const now = new Date();
  const totalSeconds = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();

  // Countdown timer
  let remainingSeconds = (activeMode.interval - (totalSeconds % activeMode.interval)) - 1;
  if (remainingSeconds < 0) {
    remainingSeconds = activeMode.interval - 1;
  }

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  if (countdownTimer) {
    countdownTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Period ID calculation
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  const roundSeq = Math.floor(totalSeconds / activeMode.interval) + 1;
  const currentPeriod = `${year}${month}${day}${activeMode.prefix}${String(roundSeq).padStart(4, '0')}`;

  if (periodDisplay) {
    periodDisplay.textContent = currentPeriod;
  }

  if (lastPeriodId !== currentPeriod) {
    if (lastPeriodId !== null) {
      updatePredictionResult();
    }
    lastPeriodId = currentPeriod;
  }
}

// Start
updatePredictionResult();
syncOkWinTime();
setInterval(syncOkWinTime, 250);