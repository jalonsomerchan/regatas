const gameCanvas = document.querySelector("#game");
const mapCanvas = document.querySelector("#mapObjects");
const courseButtons = [...document.querySelectorAll(".course-button")];

const COURSE_FILTERS = {
  river: "none",
  sea: "saturate(1.08) brightness(1.02)",
  slalom: "saturate(1.12) hue-rotate(-8deg)",
  mangrove: "sepia(0.18) hue-rotate(28deg) saturate(1.25) brightness(0.9)",
  canyon: "sepia(0.36) hue-rotate(-20deg) saturate(1.18) brightness(0.96)",
  storm: "saturate(0.78) hue-rotate(12deg) brightness(0.72) contrast(1.18)"
};

function applyLayerStyles() {
  if (gameCanvas) {
    gameCanvas.style.zIndex = "0";
  }

  if (mapCanvas) {
    mapCanvas.style.position = "absolute";
    mapCanvas.style.inset = "0";
    mapCanvas.style.display = "block";
    mapCanvas.style.pointerEvents = "none";
    mapCanvas.style.zIndex = "1";
    mapCanvas.style.imageRendering = "pixelated";
  }

  document.querySelectorAll(".hud, .mode-panel, .race-result, .about-panel, .controls").forEach((node) => {
    node.style.zIndex = node.classList.contains("controls") ? "4" : "5";
  });
}

function applyCourseTheme(course) {
  document.body.dataset.courseTheme = course;
  if (gameCanvas) {
    gameCanvas.style.filter = COURSE_FILTERS[course] || "none";
  }
}

courseButtons.forEach((button) => {
  button.addEventListener("click", () => applyCourseTheme(button.dataset.course));
});

applyLayerStyles();
applyCourseTheme(document.querySelector(".course-button.is-active")?.dataset.course || "river");
