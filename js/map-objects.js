const $ = (selector) => document.querySelector(selector);

const MAP_OBJECTS = {
  river: ["reeds", "ducks", "logs"],
  sea: ["lighthouse", "islands", "foam"],
  slalom: ["flags", "rings", "crowd"],
  mangrove: ["roots", "logs", "fireflies", "shortcut"],
  canyon: ["rocks", "arches", "eagles", "warning"],
  storm: ["lightning", "barrels", "wreck", "rain"]
};

const OBJECT_LABELS = {
  reeds: "Juncos",
  ducks: "Patos",
  logs: "Troncos",
  lighthouse: "Faro",
  islands: "Islas",
  foam: "Espuma",
  flags: "Banderines",
  rings: "Aros turbo",
  crowd: "Grada",
  roots: "Raíces",
  fireflies: "Luciérnagas",
  shortcut: "Atajo",
  rocks: "Rocas",
  arches: "Arcos",
  eagles: "Águilas",
  warning: "Señales",
  lightning: "Rayos",
  barrels: "Barriles",
  wreck: "Naufragio",
  rain: "Lluvia"
};

const courseButtons = [...document.querySelectorAll(".course-button")];
const distanceEl = $("#distance");
const speedEl = $("#speed");
const modePanel = $("#modePanel");
const resultPanel = $("#resultPanel");
const startButton = $("#startButton");

const layer = document.createElement("div");
layer.className = "map-object-layer";
layer.setAttribute("aria-hidden", "true");
document.body.append(layer);

const notice = document.createElement("div");
notice.className = "map-object-notice";
notice.setAttribute("aria-live", "polite");
document.body.append(notice);

let currentCourse = document.querySelector(".course-button.is-active")?.dataset.course || "river";
let lastProgress = 0;
let objectCycle = 0;
let noticed = new Set();
let lastLightning = 0;

function numberFrom(node) {
  return Number((node?.textContent || "").replace(",", ".").match(/\d+(?:\.\d+)?/)?.[0] || 0);
}

function showNotice(text) {
  notice.textContent = text;
  notice.classList.remove("is-visible");
  requestAnimationFrame(() => notice.classList.add("is-visible"));
  clearTimeout(showNotice.timeout);
  showNotice.timeout = setTimeout(() => notice.classList.remove("is-visible"), 1700);
}

function activeObjects() {
  return MAP_OBJECTS[currentCourse] || MAP_OBJECTS.river;
}

function createObject(type, index) {
  const item = document.createElement("i");
  item.className = `map-object map-object--${type}`;
  item.dataset.type = type;
  item.dataset.label = OBJECT_LABELS[type] || type;
  item.style.setProperty("--x", `${8 + Math.random() * 84}%`);
  item.style.setProperty("--y", `${10 + Math.random() * 78}%`);
  item.style.setProperty("--delay", `${index * 0.11}s`);
  item.style.setProperty("--drift", `${Math.random() > 0.5 ? 1 : -1}`);
  return item;
}

function paintMapObjects() {
  const objects = activeObjects();
  layer.textContent = "";
  const count = currentCourse === "storm" ? 12 : currentCourse === "mangrove" ? 14 : 10;
  for (let i = 0; i < count; i += 1) {
    layer.append(createObject(objects[i % objects.length], i));
  }
  document.body.dataset.courseTheme = currentCourse;
}

function syncCourse(event) {
  const button = event.target.closest?.(".course-button");
  if (!button) return;
  currentCourse = button.dataset.course;
  noticed.clear();
  lastProgress = 0;
  paintMapObjects();
  showNotice(`Mapa: ${button.textContent}`);
}

function milestoneObject(progress, speed) {
  const objects = activeObjects();
  const milestone = Math.floor(progress / 20) * 20;
  if (milestone > 0 && milestone < 100 && !noticed.has(milestone)) {
    noticed.add(milestone);
    const object = OBJECT_LABELS[objects[(milestone / 20) % objects.length]] || "objeto";
    showNotice(`${object} en ruta · ${milestone}%`);
  }

  if (speed >= 44 && !noticed.has("fast-object")) {
    noticed.add("fast-object");
    showNotice(currentCourse === "storm" ? "¡Surfea la tormenta!" : "¡Turbo por corriente!");
  }
}

function animateObjects(progress, speed) {
  objectCycle += 1;
  layer.style.setProperty("--scroll", `${progress}`);
  layer.style.setProperty("--speed", `${Math.min(speed, 60)}`);
  layer.classList.toggle("is-racing", modePanel?.hidden && !resultPanel?.hidden === false);
  layer.classList.toggle("is-fast", speed >= 40);

  if (currentCourse === "storm" && performance.now() - lastLightning > 2600 && Math.random() > 0.965) {
    lastLightning = performance.now();
    layer.classList.add("is-lightning");
    showNotice("¡Rayo cerca!");
    setTimeout(() => layer.classList.remove("is-lightning"), 260);
  }
}

function tick() {
  const progress = numberFrom(distanceEl);
  const speed = numberFrom(speedEl);
  if (progress < lastProgress || !modePanel?.hidden) noticed.clear();
  if (progress !== lastProgress) milestoneObject(progress, speed);
  animateObjects(progress, speed);
  lastProgress = progress;
  requestAnimationFrame(tick);
}

courseButtons.forEach((button) => button.addEventListener("click", syncCourse));
startButton?.addEventListener("click", () => {
  noticed.clear();
  lastProgress = 0;
  paintMapObjects();
});

paintMapObjects();
requestAnimationFrame(tick);
