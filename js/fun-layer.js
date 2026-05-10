const ACHIEVEMENT_KEY = "boat.achievements.v1";
const unlocked = new Set(JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY) || "[]"));
const shownMilestones = new Set();
const $ = (selector) => document.querySelector(selector);

const hud = $(".hud");
const speedEl = $("#speed");
const distanceEl = $("#distance");
const resultPanel = $("#resultPanel");
const resultText = $("#resultText");
const startButton = $("#startButton");
const shareButton = $("#shareButton");
const wheelZone = $("#wheelZone");

const toastHost = document.createElement("div");
toastHost.className = "fun-toast-host";
toastHost.setAttribute("aria-live", "polite");
document.body.append(toastHost);

const comboBanner = document.createElement("div");
comboBanner.className = "combo-banner";
comboBanner.hidden = true;
comboBanner.setAttribute("aria-live", "polite");
document.body.append(comboBanner);

const confettiLayer = document.createElement("div");
confettiLayer.className = "confetti-layer";
confettiLayer.setAttribute("aria-hidden", "true");
document.body.append(confettiLayer);

function saveAchievements() {
  localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify([...unlocked]));
}

function vibrate(pattern = 18) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

function showToast(title, text, tone = "normal") {
  const toast = document.createElement("div");
  toast.className = `fun-toast is-${tone}`;
  toast.innerHTML = `<strong>${title}</strong><span>${text}</span>`;
  toastHost.append(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function unlock(id, title, text) {
  if (unlocked.has(id)) return;
  unlocked.add(id);
  saveAchievements();
  showToast(title, text, "achievement");
  vibrate([18, 40, 18]);
}

function parseMetricNumber(node) {
  return Number((node?.textContent || "").replace(",", ".").match(/\d+(?:\.\d+)?/)?.[0] || 0);
}

function pulseCombo(text) {
  comboBanner.textContent = text;
  comboBanner.hidden = false;
  comboBanner.classList.remove("is-visible");
  requestAnimationFrame(() => comboBanner.classList.add("is-visible"));
  window.clearTimeout(pulseCombo.timeout);
  pulseCombo.timeout = window.setTimeout(() => {
    comboBanner.classList.remove("is-visible");
    window.setTimeout(() => { comboBanner.hidden = true; }, 240);
  }, 1250);
}

function spawnConfetti(count = 42) {
  confettiLayer.textContent = "";
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("i");
    piece.style.setProperty("--x", `${Math.random() * 100}vw`);
    piece.style.setProperty("--delay", `${Math.random() * 0.32}s`);
    piece.style.setProperty("--duration", `${1.6 + Math.random() * 1.8}s`);
    piece.style.setProperty("--spin", `${Math.random() > 0.5 ? 1 : -1}`);
    piece.dataset.shape = String(i % 4);
    confettiLayer.append(piece);
  }
  window.setTimeout(() => { confettiLayer.textContent = ""; }, 3600);
}

let lastSpeed = 0;
let lastProgress = 0;
let lastResultVisible = false;
let fastSince = 0;

function watchRaceFeel(now) {
  const speed = parseMetricNumber(speedEl);
  const progress = parseMetricNumber(distanceEl);

  if (speed > 39 && speed - lastSpeed > 4) {
    pulseCombo("¡Racha de viento!");
    vibrate(12);
  }

  if (speed > 43) {
    fastSince = fastSince || now;
    if (now - fastSince > 2200) unlock("high-speed", "Logro desbloqueado", "Mantén una velocidad de capitán");
  } else {
    fastSince = 0;
  }

  if (speed >= 47) unlock("full-sail", "Vela a tope", "Has superado los 47 nudos");

  for (const milestone of [25, 50, 75]) {
    if (progress >= milestone && lastProgress < milestone && !shownMilestones.has(milestone)) {
      shownMilestones.add(milestone);
      pulseCombo(`${milestone}% de regata`);
    }
  }

  hud?.classList.toggle("is-fast", speed >= 40);
  lastSpeed = speed;
  lastProgress = progress;
}

function watchFinish() {
  const resultVisible = resultPanel && !resultPanel.hidden;
  if (resultVisible && !lastResultVisible) {
    spawnConfetti(resultText?.textContent?.includes("1") ? 64 : 42);
    unlock("finish-line", "Primera meta", "Ya tienes una regata terminada");
    vibrate([30, 60, 30]);
  }
  lastResultVisible = resultVisible;
}

function loop(now) {
  watchRaceFeel(now);
  watchFinish();
  requestAnimationFrame(loop);
}

startButton?.addEventListener("click", () => {
  shownMilestones.clear();
  lastProgress = 0;
  showToast("¡Zarpa!", "Busca las corrientes y apura las boyas", "normal");
  vibrate(14);
});

shareButton?.addEventListener("click", () => unlock("shared", "Patrón social", "Has preparado tu resultado para compartir"));
wheelZone?.addEventListener("pointerdown", () => vibrate(8), { passive: true });

requestAnimationFrame(loop);
