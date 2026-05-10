const COURSE_META = {
  river: { length: 7600, laps: 1 },
  sea: { length: 3600, laps: 3 },
  slalom: { length: 6400, laps: 1 },
  mangrove: { length: 7200, laps: 1 },
  canyon: { length: 8200, laps: 1 },
  storm: { length: 4200, laps: 2 }
};

const COURSE_OBJECTS = {
  river: ["reed", "duck", "log", "foam"],
  sea: ["island", "lighthouse", "foam", "barrel"],
  slalom: ["flag", "gate", "crowd", "foam"],
  mangrove: ["root", "log", "firefly", "reed"],
  canyon: ["rock", "arch", "eagle", "flag"],
  storm: ["lightning", "barrel", "wreck", "rain"]
};

const courseButtons = [...document.querySelectorAll(".course-button")];
const shell = document.querySelector(".game-shell");
const distanceEl = document.querySelector("#distance");
const speedEl = document.querySelector("#speed");
const modePanel = document.querySelector("#modePanel");

const canvas = document.createElement("canvas");
canvas.id = "mapObjects";
canvas.setAttribute("aria-hidden", "true");
shell?.insertBefore(canvas, shell.querySelector(".hud"));
const ctx = canvas.getContext("2d");

let dpr = 1;
let width = 0;
let height = 0;
let currentCourse = document.querySelector(".course-button.is-active")?.dataset.course || "river";
let lightningUntil = 0;
let noticeUntil = 0;
let noticeText = "";
let objects = [];

function seeded(seed) {
  const x = Math.sin(seed * 999.9) * 10000;
  return x - Math.floor(x);
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.floor(window.innerWidth);
  height = Math.floor(window.innerHeight);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function playerScreenY() {
  return height * 0.64;
}

function riverWidthAt(worldY) {
  const base = Math.min(width * 0.74, 430);
  const factor = currentCourse === "canyon" ? 0.74 : currentCourse === "mangrove" ? 0.9 : currentCourse === "storm" ? 1.06 : 1;
  const squeeze = currentCourse === "canyon" ? Math.sin(worldY * 0.006) * 38 : 0;
  return base * factor + Math.sin(worldY * 0.0017) * 28 + Math.sin(worldY * 0.0041) * 18 + squeeze;
}

function riverCenterAt(worldY) {
  const amp = Math.min(width * 0.22, 124) * (currentCourse === "canyon" ? 0.72 : currentCourse === "storm" ? 1.12 : 1);
  const stormWobble = currentCourse === "storm" ? Math.sin(worldY * 0.009) * 28 : 0;
  return width * 0.5 + Math.sin(worldY * 0.00135 + 0.5) * amp + Math.sin(worldY * 0.0032) * amp * 0.38 + stormWobble;
}

function boundsAt(worldY) {
  if (currentCourse === "sea") return { left: 22, right: width - 22, center: width * 0.5, width: width - 44 };
  const w = riverWidthAt(worldY);
  const center = riverCenterAt(worldY);
  return { left: center - w * 0.5, right: center + w * 0.5, center, width: w };
}

function worldToScreen(worldY, progress) {
  return playerScreenY() - (worldY - progress);
}

function metricNumber(node) {
  return Number((node?.textContent || "").replace(",", ".").match(/\d+(?:\.\d+)?/)?.[0] || 0);
}

function progressWorld() {
  const meta = COURSE_META[currentCourse] || COURSE_META.river;
  return Math.min(metricNumber(distanceEl), 100) / 100 * meta.length * meta.laps;
}

function showNotice(text) {
  noticeText = text;
  noticeUntil = performance.now() + 1500;
}

function buildObjects() {
  const meta = COURSE_META[currentCourse] || COURSE_META.river;
  const types = COURSE_OBJECTS[currentCourse] || COURSE_OBJECTS.river;
  const totalLength = meta.length * meta.laps;
  const count = currentCourse === "storm" ? 56 : currentCourse === "sea" ? 38 : 46;
  objects = Array.from({ length: count }, (_, i) => ({
    type: types[i % types.length],
    worldY: 260 + i * (totalLength / count) + seeded(i + 3) * 180,
    side: seeded(i + 17) > 0.5 ? 1 : -1,
    lane: seeded(i + 29),
    wobble: seeded(i + 71) * Math.PI * 2,
    size: 0.82 + seeded(i + 101) * 0.6
  }));
}

function switchCourse(course) {
  currentCourse = course;
  buildObjects();
  showNotice(`Mapa: ${document.querySelector(`.course-button[data-course="${course}"]`)?.textContent || course}`);
}

function drawObject(type, x, y, size, now) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(size, size);
  ctx.imageSmoothingEnabled = false;

  if (type === "log" || type === "root") {
    ctx.rotate(type === "root" ? -0.45 : 0.24);
    ctx.fillStyle = type === "root" ? "#5b351a" : "#7a411e";
    ctx.fillRect(-18, -5, 36, 10);
    ctx.fillStyle = "#e7a84b";
    ctx.fillRect(-13, -3, 8, 3);
    ctx.fillRect(5, 1, 9, 3);
  } else if (type === "reed") {
    ctx.fillStyle = "#8bd35a";
    for (let i = -1; i <= 1; i += 1) ctx.fillRect(i * 6, -18 + i * 2, 4, 28);
    ctx.fillStyle = "#d6b46c";
    ctx.fillRect(-8, -20, 5, 9);
    ctx.fillRect(6, -16, 5, 9);
  } else if (type === "duck" || type === "eagle") {
    ctx.fillStyle = type === "duck" ? "#ffcc4d" : "#743827";
    ctx.fillRect(-12, -4, 22, 10);
    ctx.fillRect(7, -10, 8, 8);
    ctx.fillStyle = type === "duck" ? "#f05a43" : "#fff4c8";
    ctx.fillRect(14, -7, 6, 3);
  } else if (type === "foam" || type === "firefly" || type === "gate") {
    const pulse = 1 + Math.sin(now * 0.008 + x) * 0.18;
    ctx.strokeStyle = type === "firefly" ? "#ffe483" : "#d8fbff";
    ctx.lineWidth = 3;
    ctx.globalAlpha = type === "firefly" ? 0.78 : 0.56;
    ctx.strokeRect(-10 * pulse, -10 * pulse, 20 * pulse, 20 * pulse);
  } else if (type === "island" || type === "rock") {
    ctx.fillStyle = type === "rock" ? "#6d6d67" : "#3f7a34";
    ctx.beginPath();
    ctx.moveTo(-20, 8);
    ctx.lineTo(-10, -13);
    ctx.lineTo(12, -16);
    ctx.lineTo(22, 4);
    ctx.lineTo(11, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = type === "rock" ? "#3d3d3a" : "#8bd35a";
    ctx.fillRect(-4, -7, 10, 5);
  } else if (type === "lighthouse") {
    ctx.fillStyle = "#fff4c8";
    ctx.fillRect(-6, -28, 12, 32);
    ctx.fillStyle = "#f05a43";
    ctx.fillRect(-6, -20, 12, 5);
    ctx.fillRect(-6, -9, 12, 5);
    ctx.fillStyle = "rgba(255, 244, 200, 0.45)";
    ctx.fillRect(-42, -30, 84, 6);
  } else if (type === "barrel") {
    ctx.fillStyle = "#f05a43";
    ctx.fillRect(-9, -13, 18, 26);
    ctx.fillStyle = "#fff4c8";
    ctx.fillRect(-9, -5, 18, 4);
    ctx.fillRect(-9, 6, 18, 4);
  } else if (type === "flag") {
    ctx.fillStyle = "#fff4c8";
    ctx.fillRect(-2, -18, 4, 34);
    ctx.fillStyle = "#f05a43";
    ctx.fillRect(2, -18, 20, 12);
  } else if (type === "crowd") {
    for (let i = -2; i <= 2; i += 1) {
      ctx.fillStyle = i % 2 ? "#ffcc4d" : "#65d6e8";
      ctx.fillRect(i * 8, -8, 6, 12);
    }
  } else if (type === "arch") {
    ctx.strokeStyle = "#c98945";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 10, 22, Math.PI, 0);
    ctx.stroke();
  } else if (type === "lightning") {
    ctx.fillStyle = "#ffe483";
    ctx.beginPath();
    ctx.moveTo(2, -24);
    ctx.lineTo(-10, 1);
    ctx.lineTo(1, 1);
    ctx.lineTo(-5, 25);
    ctx.lineTo(13, -6);
    ctx.lineTo(3, -6);
    ctx.closePath();
    ctx.fill();
  } else if (type === "wreck") {
    ctx.rotate(-0.22);
    ctx.fillStyle = "#7a411e";
    ctx.fillRect(-20, -6, 40, 12);
    ctx.fillStyle = "#fff4c8";
    ctx.fillRect(-2, -28, 4, 24);
    ctx.fillRect(2, -24, 18, 14);
  } else if (type === "rain") {
    ctx.strokeStyle = "#65d6e8";
    ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 9, -18);
      ctx.lineTo(i * 9 - 8, 12);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawAmbient(progress, speed, now) {
  ctx.clearRect(0, 0, width, height);

  if (currentCourse === "storm" && now > lightningUntil && Math.random() > 0.986) {
    lightningUntil = now + 180;
    showNotice("¡Rayo cerca!");
  }

  if (now < lightningUntil) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = "#d8fbff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  for (const object of objects) {
    const y = worldToScreen(object.worldY, progress);
    if (y < -80 || y > height + 80) continue;
    const bounds = boundsAt(object.worldY);
    const inWater = ["log", "foam", "barrel", "wreck", "rain", "gate"].includes(object.type);
    const x = inWater
      ? bounds.left + bounds.width * (0.22 + object.lane * 0.56)
      : object.side < 0
        ? bounds.left - 20 - object.lane * 72
        : bounds.right + 20 + object.lane * 72;
    drawObject(object.type, x + Math.sin(now * 0.0015 + object.wobble) * 8, y, object.size, now);
  }

  if (speed > 40) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#d8fbff";
    for (let y = -20 - (now * 0.18 % 46); y < height + 40; y += 46) {
      ctx.fillRect(width * 0.5 - 70, y, 140, 3);
    }
    ctx.restore();
  }

  if (now < noticeUntil) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (noticeUntil - now) / 240);
    ctx.fillStyle = "#14212c";
    ctx.fillRect(Math.round(width * 0.5 - 130), Math.round(height - 230), 260, 34);
    ctx.strokeStyle = "#65d6e8";
    ctx.lineWidth = 3;
    ctx.strokeRect(Math.round(width * 0.5 - 130), Math.round(height - 230), 260, 34);
    ctx.fillStyle = "#fff4c8";
    ctx.font = "700 14px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(noticeText, width * 0.5, height - 208);
    ctx.restore();
  }
}

function loop(now) {
  const progress = modePanel?.hidden ? progressWorld() : 0;
  const speed = metricNumber(speedEl);
  drawAmbient(progress, speed, now);
  requestAnimationFrame(loop);
}

courseButtons.forEach((button) => {
  button.addEventListener("click", () => switchCourse(button.dataset.course));
});

window.addEventListener("resize", resize);
resize();
buildObjects();
requestAnimationFrame(loop);
