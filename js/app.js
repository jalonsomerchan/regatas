import { ASSETS, COURSES, DIFFICULTY } from "./config.js";
import { createI18n } from "./i18n.js";
import { clamp, dist, formatTime, loadImages, rand } from "./utils.js";

export function startGameApp() {
  const i18n = createI18n();
  const { t } = i18n;
  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d");
  const timeEl = document.querySelector("#time");
  const speedEl = document.querySelector("#speed");
  const distanceEl = document.querySelector("#distance");
  const progressLabel = document.querySelector("#progressLabel");
  const modePanel = document.querySelector("#modePanel");
  const resultPanel = document.querySelector("#resultPanel");
  const resultTitle = document.querySelector("#resultTitle");
  const resultText = document.querySelector("#resultText");
  const shareButton = document.querySelector("#shareButton");
  const bestTimeEl = document.querySelector("#bestTime");
  const startButton = document.querySelector("#startButton");
  const restartButton = document.querySelector("#restartButton");
  const aboutButton = document.querySelector("#aboutButton");
  const aboutPanel = document.querySelector("#aboutPanel");
  const closeAboutButton = document.querySelector("#closeAboutButton");
  const modeButtons = [...document.querySelectorAll(".mode-button")];
  const courseButtons = [...document.querySelectorAll(".course-button")];
  const difficultyButtons = [...document.querySelectorAll(".difficulty-button")];
  const difficultyPanel = document.querySelector("#difficultyPanel");
  const wheelZone = document.querySelector("#wheelZone");
  const wheel = document.querySelector("#wheel");

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    mode: "time",
    course: "river",
    difficulty: "easy",
    running: false,
    finished: false,
    last: 0,
    elapsed: 0,
    courseLength: 7600,
    steerTarget: 0,
    steer: 0,
    wheelPointer: null,
    best: Number(localStorage.getItem("boat.bestTime.snes") || 0),
    lastResult: null,
    player: null,
    rivals: [],
    rapids: [],
    marks: [],
    gates: [],
    particles: []
  };

  const sprites = { player: [], rivals: [] };

  function loadImages(paths) {
    return Promise.all(paths.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    })));
  }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.floor(window.innerWidth);
    state.height = Math.floor(window.innerHeight);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (state.player) {
      state.player.y = playerScreenY();
      keepBoatInBounds(state.player, 0);
    }
  }

  function playerScreenY() {
    return state.height * 0.64;
  }

  function riverWidthAt(y) {
    return Math.min(state.width * 0.74, 430) + Math.sin(y * 0.0017) * 28 + Math.sin(y * 0.0041) * 18;
  }

  function riverCenterAt(y) {
    const amp = Math.min(state.width * 0.22, 124);
    return state.width * 0.5 + Math.sin(y * 0.00135 + 0.5) * amp + Math.sin(y * 0.0032) * amp * 0.38;
  }

  function riverBoundsAt(y) {
    const width = riverWidthAt(y);
    const center = riverCenterAt(y);
    return {
      left: center - width * 0.5,
      right: center + width * 0.5,
      center,
      width
    };
  }

  function resetGame() {
    const course = COURSES[state.course];
    state.elapsed = 0;
    state.running = false;
    state.finished = false;
    state.steer = 0;
    state.steerTarget = 0;
    state.particles = [];
    state.courseLength = course.length * course.laps;
    state.player = {
      x: courseCenterAt(0),
      y: playerScreenY(),
      progress: 0,
      speed: 230,
      boost: 0,
      rapid: 0,
      angle: 0,
      hitCooldown: 0,
      radius: 21,
      rank: 1
    };
    buildCourse();
    updateHud();
    setWheel(0);
    difficultyPanel.hidden = state.mode !== "race";
  }

  function buildCourse() {
    state.rapids = [];
    state.marks = [];
    state.gates = [];

    if (state.course === "sea") buildSeaCourse();
    if (state.course === "slalom") buildSlalomCourse();

    const rapidCount = state.course === "river" ? 18 : state.course === "slalom" ? 24 : 0;
    for (let i = 0; i < rapidCount; i += 1) {
      const y = 360 + i * 390 + rand(-70, 70);
      const bounds = courseBoundsAt(y);
      state.rapids.push({
        x: bounds.center + rand(-bounds.width * 0.24, bounds.width * 0.24),
        y,
        r: rand(38, 54),
        force: rand(-0.32, 0.32),
        used: false,
        pulse: Math.random() * Math.PI * 2
      });
    }

    state.rivals = [];
    if (state.mode === "race") {
      const diff = DIFFICULTY[state.difficulty];
      const offsets = [-92, 42, 104];
      for (let i = 0; i < 3; i += 1) {
        const progress = -i * 62;
        const cruise = (224 + i * 12) * diff.speed;
        state.rivals.push({
          x: courseCenterAt(progress) + offsets[i],
          progress,
          cruise,
          speed: cruise,
          boost: 0,
          rapid: 0,
          targetX: courseCenterAt(progress) + offsets[i],
          sprite: i + 1,
          angle: 0,
          radius: 20,
          hitCooldown: 0,
          think: 0,
          mistake: rand(-1, 1)
        });
      }
    }
  }

  function buildSeaCourse() {
    const lapLength = COURSES.sea.length;
    const spread = Math.min(state.width * 0.34, 150);
    for (let lap = 0; lap < COURSES.sea.laps; lap += 1) {
      const base = lap * lapLength;
      for (let i = 0; i < 4; i += 1) {
        state.marks.push({
          x: state.width * 0.5 + (i % 2 === 0 ? -spread : spread),
          y: base + 520 + i * 760,
          color: i % 2 === 0 ? "#ffcc4d" : "#f05a43"
        });
      }
    }
  }

  function buildSlalomCourse() {
    for (let i = 0; i < 14; i += 1) {
      const y = 430 + i * 420;
      const bounds = courseBoundsAt(y);
      state.gates.push({
        x: bounds.center + Math.sin(i * 1.3) * bounds.width * 0.28,
        y,
        width: 92
      });
    }
  }

  function startGame() {
    resetGame();
    state.running = true;
    modePanel.hidden = true;
    resultPanel.hidden = true;
    state.last = performance.now();
  }

  function finishGame() {
    state.running = false;
    state.finished = true;
    const playerTime = state.elapsed;
    let placement = "Has cruzado la meta";

    if (state.mode === "race") {
      const ahead = state.rivals.filter((rival) => rival.progress >= state.player.progress).length;
      state.player.rank = Math.min(ahead + 1, 4);
      placement = state.player.rank === 1
        ? t("result.victory", { course: courseLabel(state.course).toLowerCase() })
        : t("result.position", { rank: state.player.rank });
    } else if (!state.best || playerTime < state.best) {
      state.best = playerTime;
      localStorage.setItem("boat.bestTime.snes", String(playerTime));
      placement = t("result.newBest");
    }

    resultTitle.textContent = placement;
    state.lastResult = {
      time: formatTime(playerTime),
      course: courseLabel(state.course),
      speed: Math.round(state.player.speed / 7),
      placement
    };
    resultText.textContent = t("result.summary", state.lastResult);
    bestTimeEl.textContent = bestTimeText();
    resultPanel.hidden = false;
  }

  function tick(now) {
    const dt = Math.min((now - state.last) / 1000 || 0, 0.033);
    state.last = now;
    if (state.running) update(dt);
    draw(now);
    requestAnimationFrame(tick);
  }

  function update(dt) {
    const player = state.player;
    state.elapsed += dt * 1000;
    state.steer += (state.steerTarget - state.steer) * Math.min(1, dt * 8);
    player.angle = state.steer * 0.58;
    player.x += state.steer * steeringPower() * dt;
    updateBoatSpeed(player, dt, 250);
    player.progress += player.speed * dt;
    applyCourseForces(player, dt, true);
    updateRivals(dt);
    resolveBoatCollisions();
    updateParticles(dt);
    if (player.progress >= state.courseLength) finishGame();
    updateHud();
  }

  function updateBoatSpeed(boat, dt, baseSpeed) {
    boat.boost = Math.max(0, boat.boost - dt);
    boat.rapid = Math.max(0, boat.rapid - dt);
    boat.hitCooldown = Math.max(0, boat.hitCooldown - dt);
    const boostFactor = boat.boost > 0 ? 1.32 : 1;
    const rapidFactor = boat.rapid > 0 ? 1.18 : 1;
    const target = baseSpeed * boostFactor * rapidFactor;
    boat.speed += (target - boat.speed) * Math.min(1, dt * 3.7);
  }

  function applyCourseForces(boat, dt, isPlayer) {
    const bounds = courseBoundsAt(boat.progress);
    const currentPush = state.course === "sea" ? 0 : (courseCenterAt(boat.progress + 40) - courseCenterAt(boat.progress - 40)) * 0.01;
    boat.x += currentPush * boat.speed * dt;

    for (const rapid of state.rapids) {
      const d = dist(boat.x, boat.progress, rapid.x, rapid.y);
      if (d < rapid.r) {
        boat.rapid = 1.15;
        boat.x += rapid.force * 42 * dt;
        if (isPlayer && !rapid.used) {
          rapid.used = true;
          burst(boat.x, boat.y + 8, "#f8f8f8", 18);
        }
      }
    }

    const minX = bounds.left + boat.radius;
    const maxX = bounds.right - boat.radius;
    if (boat.x < minX || boat.x > maxX) {
      boat.x = clamp(boat.x, minX, maxX);
      if (state.course !== "sea" && boat.hitCooldown <= 0) {
        boat.speed *= 0.54;
        boat.hitCooldown = 0.65;
        if (isPlayer) burst(boat.x, boat.y + 2, "#c98945", 14);
      }
    }

    if (state.course === "sea") applySeaMarks(boat, isPlayer);
    if (state.course === "slalom") applySlalomGates(boat, isPlayer);
  }

  function applySeaMarks(boat, isPlayer) {
    for (const mark of state.marks) {
      if (Math.abs(boat.progress - mark.y) < 34 && Math.abs(boat.x - mark.x) < 72) {
        boat.rapid = Math.max(boat.rapid, 0.8);
        if (isPlayer) burst(boat.x, boat.y, "#fff4c8", 5);
      }
    }
  }

  function applySlalomGates(boat, isPlayer) {
    for (const gate of state.gates) {
      if (Math.abs(boat.progress - gate.y) < 28) {
        const inside = Math.abs(boat.x - gate.x) < gate.width * 0.5;
        if (inside) {
          boat.boost = Math.max(boat.boost, 0.65);
          if (isPlayer) burst(boat.x, boat.y, "#d8fbff", 5);
        } else if (isPlayer && boat.hitCooldown <= 0) {
          boat.speed *= 0.78;
          boat.hitCooldown = 0.35;
        }
      }
    }
  }

  function updateRivals(dt) {
    const diff = DIFFICULTY[state.difficulty];
    for (const rival of state.rivals) {
      rival.think -= dt;
      if (rival.think <= 0) {
        rival.think = rand(0.18, 0.42);
        rival.mistake = rand(-1, 1) * diff.mistakes;
      }
      const lookY = rival.progress + 240;
      const lookBounds = courseBoundsAt(lookY);
      const nearRapid = state.rapids.find((rapid) => Math.abs(rapid.y - rival.progress) < 300);
      const playerNear = Math.abs(state.player.progress - rival.progress) < 180;
      const avoidPlayer = playerNear ? -Math.sign(state.player.x - rival.x || 1) * 58 * (1 - diff.aggression) : 0;
      const playerBias = playerNear ? (state.player.x - lookBounds.center) * diff.aggression * 0.12 : 0;
      const rapidBias = nearRapid ? (nearRapid.x - lookBounds.center) * diff.boost * 0.28 : 0;
      const boatAvoidance = rivalAvoidance(rival, lookBounds);
      rival.targetX = lookBounds.center + playerBias + rapidBias + avoidPlayer + boatAvoidance + rival.mistake * lookBounds.width * 0.34;
      rival.targetX = clamp(rival.targetX, lookBounds.left + 28, lookBounds.right - 28);
      const steer = clamp((rival.targetX - rival.x) / 105, -1, 1);
      rival.x += steer * 205 * diff.steering * dt;
      rival.angle = steer * 0.5;
      updateBoatSpeed(rival, dt, rival.cruise);
      rival.progress += rival.speed * dt;
      applyCourseForces(rival, dt, false);
    }
  }

  function rivalAvoidance(rival, bounds) {
    let push = 0;
    for (const other of [state.player, ...state.rivals]) {
      if (other === rival) continue;
      const gapY = Math.abs(other.progress - rival.progress);
      const gapX = Math.abs(other.x - rival.x);
      if (gapY < 150 && gapX < 74) {
        push -= Math.sign(other.x - rival.x || 1) * (74 - gapX);
      }
    }
    return clamp(push, -bounds.width * 0.28, bounds.width * 0.28);
  }

  function resolveBoatCollisions() {
    const boats = [state.player, ...state.rivals];
    for (let i = 0; i < boats.length; i += 1) {
      for (let j = i + 1; j < boats.length; j += 1) {
        const a = boats[i];
        const b = boats[j];
        if (Math.abs(a.progress - state.player.progress) > 460 && Math.abs(b.progress - state.player.progress) > 460) continue;
        const dx = a.x - b.x;
        const dy = a.progress - b.progress;
        const minDist = a.radius + b.radius;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < minDist && a.hitCooldown <= 0.05 && b.hitCooldown <= 0.05) {
          const front = a.progress >= b.progress ? a : b;
          const rear = front === a ? b : a;
          const side = Math.sign(front.x - rear.x || 1);
          front.progress += 34;
          rear.progress = Math.max(0, rear.progress - 46);
          front.x += side * 18;
          rear.x -= side * 22;
          front.speed = Math.max(front.speed, 260);
          rear.speed *= 0.58;
          keepBoatInBounds(front, 2);
          keepBoatInBounds(rear, 2);
          a.hitCooldown = Math.max(a.hitCooldown, 0.24);
          b.hitCooldown = Math.max(b.hitCooldown, 0.24);
          if (i === 0 || j === 0) burst(state.player.x, state.player.y, "#ffffff", 8);
        }
      }
    }
  }

  function updateParticles(dt) {
    state.particles = state.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 10 * dt;
      return p.life > 0;
    });
  }

  function draw(now) {
    const frame = Math.floor(now / 220) % 4;
    drawCourse(now);
    drawRapids(now);
    drawEntities(frame);
    drawParticles();
    drawFinish();
  }

  function drawCourse(now) {
    if (state.course === "sea") {
      drawSea();
      return;
    }
    const scroll = state.player ? state.player.progress : 0;
    ctx.fillStyle = state.course === "slalom" ? "#347d3e" : "#4f8f3a";
    ctx.fillRect(0, 0, state.width, state.height);
    drawGroundTiles(scroll);
    drawRiverBody(scroll, now);
    drawBanks(scroll);
    if (state.course === "slalom") drawSlalomGates();
  }

  function drawSea() {
    const scroll = state.player ? state.player.progress : 0;
    ctx.fillStyle = "#176c9b";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#2387b7";
    for (let y = -20 - (scroll % 48); y < state.height + 48; y += 48) {
      for (let x = 16; x < state.width; x += 72) {
        ctx.fillRect(Math.round(x + ((y / 48) % 2) * 18), Math.round(y), 24, 4);
      }
    }
    drawSeaMarks();
  }

  function drawGroundTiles(scroll) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    for (let y = -16 - (scroll % 32); y < state.height + 32; y += 32) {
      for (let x = 0; x < state.width; x += 32) {
        const n = Math.sin((x * 17 + Math.floor((y + scroll) / 32) * 31) * 0.05);
        ctx.fillStyle = n > 0 ? "#63a846" : "#3f7a34";
        ctx.fillRect(x, y, 12, 12);
      }
    }
    ctx.restore();
  }

  function drawRiverBody(scroll) {
    const points = riverScreenPoints(scroll);
    ctx.save();
    ctx.fillStyle = "#176c9b";
    ctx.beginPath();
    points.left.forEach((p, index) => {
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    [...points.right].reverse().forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#2387b7";
    ctx.globalAlpha = 1;
    ctx.beginPath();
    points.left.forEach((p, index) => {
      const inset = 18;
      const c = courseCenterAt(p.worldY);
      const x = p.x + Math.sign(c - p.x) * inset;
      if (index === 0) ctx.moveTo(x, p.y);
      else ctx.lineTo(x, p.y);
    });
    [...points.right].reverse().forEach((p) => {
      const inset = 18;
      const c = courseCenterAt(p.worldY);
      ctx.lineTo(p.x + Math.sign(c - p.x) * inset, p.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#6ed4e8";
    ctx.globalAlpha = 0.58;
    for (let y = -24; y < state.height + 32; y += 56) {
      const worldY = scroll + playerScreenY() - y;
      const bounds = courseBoundsAt(worldY);
      const center = courseCenterAt(worldY);
      const x = center + Math.sin(worldY * 0.004) * bounds.width * 0.16;
      ctx.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, 20, 4);
    }
    ctx.restore();
  }

  function drawBanks(scroll) {
    const points = riverScreenPoints(scroll);
    ctx.save();
    ctx.strokeStyle = "#2f6f3b";
    ctx.lineWidth = 24;
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.left.forEach((p, index) => {
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.beginPath();
    points.right.forEach((p, index) => {
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.strokeStyle = "#8bd35a";
    ctx.lineWidth = 10;
    ctx.beginPath();
    points.left.forEach((p, index) => {
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.beginPath();
    points.right.forEach((p, index) => {
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  function riverScreenPoints(scroll) {
    const left = [];
    const right = [];
    for (let sy = -80; sy <= state.height + 100; sy += 24) {
      const worldY = scroll + playerScreenY() - sy;
      const bounds = courseBoundsAt(worldY);
      left.push({ x: bounds.left, y: sy, worldY });
      right.push({ x: bounds.right, y: sy, worldY });
    }
    return { left, right };
  }

  function drawRapids(now) {
    if (!state.player) return;
    const scroll = state.player.progress;
    for (const rapid of state.rapids) {
      const y = worldToScreen(rapid.y, scroll);
      if (y < -90 || y > state.height + 90) continue;
      ctx.save();
      ctx.translate(rapid.x, y);
      ctx.fillStyle = rapid.used ? "#7dc9d8" : "#d8fbff";
      for (let i = 0; i < 3; i += 1) {
        const dx = (i - 1) * 18;
        ctx.fillRect(dx - 10, -12 + i * 10, 20, 4);
        ctx.fillRect(dx - 2, -8 + i * 10, 20, 4);
      }
      ctx.restore();
    }
  }

  function drawSeaMarks() {
    if (!state.player) return;
    for (const mark of state.marks) {
      const y = worldToScreen(mark.y, state.player.progress);
      if (y < -70 || y > state.height + 70) continue;
      drawBuoy(mark.x, y, mark.color);
      ctx.fillStyle = "#fff4c8";
      ctx.fillRect(Math.round(mark.x - 2), Math.round(y - 42), 4, 28);
    }
  }

  function drawSlalomGates() {
    if (!state.player) return;
    for (const gate of state.gates) {
      const y = worldToScreen(gate.y, state.player.progress);
      if (y < -70 || y > state.height + 70) continue;
      drawBuoy(gate.x - gate.width * 0.5, y, "#ffcc4d");
      drawBuoy(gate.x + gate.width * 0.5, y, "#ffcc4d");
      ctx.fillStyle = "rgba(216, 251, 255, 0.35)";
      ctx.fillRect(Math.round(gate.x - gate.width * 0.5), Math.round(y - 2), gate.width, 4);
    }
  }

  function drawBuoy(x, y, color) {
    ctx.fillStyle = "#14212c";
    ctx.fillRect(Math.round(x - 8), Math.round(y - 8), 16, 16);
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x - 6), Math.round(y - 10), 12, 16);
    ctx.fillStyle = "#fff4c8";
    ctx.fillRect(Math.round(x - 4), Math.round(y - 4), 8, 4);
  }

  function drawEntities(frame) {
    if (!state.player) return;
    for (const rival of state.rivals) {
      const y = worldToScreen(rival.progress, state.player.progress);
      if (y < -90 || y > state.height + 80) continue;
      drawBoat(sprites.rivals[rival.sprite] || sprites.rivals[0], rival.x, y, rival.angle, 0.82, rival.hitCooldown);
    }
    drawBoat(sprites.player[playerSpriteFrame()] || sprites.player[0], state.player.x, state.player.y, state.player.angle, 0.9, state.player.hitCooldown);
  }

  function drawBoat(img, x, y, angle, scale, hitCooldown) {
    if (!img) return;
    if (hitCooldown > 0 && Math.floor(performance.now() / 80) % 2 === 0) return;
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(angle);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, Math.round(-w * 0.5), Math.round(-h * 0.5), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (const p of state.particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.restore();
  }

  function drawFinish() {
    if (!state.player) return;
    const y = worldToScreen(state.courseLength, state.player.progress);
    if (y < -40 || y > state.height + 40) return;
    const bounds = courseBoundsAt(state.courseLength);
    ctx.save();
    ctx.fillStyle = "#fff4c8";
    ctx.fillRect(bounds.left, y - 4, bounds.width, 8);
    ctx.fillStyle = "#14212c";
    const cells = 12;
    for (let i = 0; i < cells; i += 1) {
      if (i % 2 === 0) ctx.fillRect(bounds.left + i * bounds.width / cells, y - 18, bounds.width / cells, 14);
    }
    ctx.restore();
  }

  function keepBoatInBounds(boat, margin) {
    const bounds = courseBoundsAt(boat.progress);
    boat.x = clamp(boat.x, bounds.left + boat.radius + margin, bounds.right - boat.radius - margin);
  }

  function courseCenterAt(y) {
    if (state.course === "sea") return state.width * 0.5;
    return riverCenterAt(y);
  }

  function courseBoundsAt(y) {
    if (state.course === "sea") {
      return { left: 22, right: state.width - 22, center: state.width * 0.5, width: state.width - 44 };
    }
    return riverBoundsAt(y);
  }

  function steeringPower() {
    return state.course === "sea" ? 285 : 245;
  }

  function playerSpriteFrame() {
    if (state.steer < -0.62) return 2;
    if (state.steer < -0.2) return 3;
    if (state.steer > 0.62) return 1;
    return 0;
  }

  function applyTexts() {
    document.documentElement.lang = i18n.locale;
    document.title = t("meta.title");
    canvas.setAttribute("aria-label", t("ui.canvasLabel"));
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    modeButtons.forEach((button) => {
      button.textContent = t(`mode.${button.dataset.mode}`);
    });
    courseButtons.forEach((button) => {
      button.textContent = courseLabel(button.dataset.course);
    });
    difficultyButtons.forEach((button) => {
      button.textContent = t(DIFFICULTY[button.dataset.difficulty].labelKey);
    });
  }

  async function shareResult() {
    const result = state.lastResult || {
      time: formatTime(state.elapsed),
      course: courseLabel(state.course),
      speed: Math.round((state.player?.speed || 0) / 7),
      placement: t("result.finish")
    };
    const text = t("share.text", result);
    const payload = { title: t("share.title"), text, url: window.location.href };
    if (navigator.share) {
      await navigator.share(payload);
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      resultText.textContent = t("share.copied");
    }
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const speed = rand(45, 120);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: Math.round(rand(3, 7)),
        color,
        life: rand(0.25, 0.62),
        maxLife: 0.62
      });
    }
  }

  function updateHud() {
    if (!state.player) return;
    timeEl.textContent = formatTime(state.elapsed);
    speedEl.textContent = `${Math.max(0, Math.round(state.player.speed / 7))} kt`;
    if (state.course === "sea") {
      const lap = Math.min(COURSES.sea.laps, Math.floor(state.player.progress / COURSES.sea.length) + 1);
      progressLabel.textContent = t("ui.lap");
      distanceEl.textContent = `${lap}/${COURSES.sea.laps}`;
    } else {
      progressLabel.textContent = t("ui.goal");
      distanceEl.textContent = `${Math.min(100, Math.floor((state.player.progress / state.courseLength) * 100))}%`;
    }
    bestTimeEl.textContent = bestTimeText();
  }

  function bestTimeText() {
    return t("ui.best", { time: state.best ? formatTime(state.best) : t("ui.noTime") });
  }

  function courseLabel(course) {
    return t(COURSES[course].labelKey);
  }

  function setWheel(value) {
    wheel.style.transform = `rotate(${value * 62}deg)`;
  }

  function steerFromPointer(event) {
    const rect = wheelZone.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const angle = Math.atan2(dy, dx);
    const value = clamp(Math.cos(angle), -1, 1);
    state.steerTarget = value;
    setWheel(value);
  }

  wheelZone.addEventListener("pointerdown", (event) => {
    state.wheelPointer = event.pointerId;
    wheelZone.setPointerCapture(event.pointerId);
    steerFromPointer(event);
  });

  wheelZone.addEventListener("pointermove", (event) => {
    if (state.wheelPointer === event.pointerId) steerFromPointer(event);
  });

  wheelZone.addEventListener("pointerup", (event) => {
    if (state.wheelPointer !== event.pointerId) return;
    state.wheelPointer = null;
    state.steerTarget = 0;
    setWheel(0);
  });

  wheelZone.addEventListener("pointercancel", () => {
    state.wheelPointer = null;
    state.steerTarget = 0;
    setWheel(0);
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      modeButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      resetGame();
    });
  });

  courseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.course = button.dataset.course;
      courseButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      resetGame();
    });
  });

  difficultyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.difficulty = button.dataset.difficulty;
      difficultyButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      resetGame();
    });
  });

  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", () => {
    resultPanel.hidden = true;
    modePanel.hidden = false;
    resetGame();
  });
  shareButton.addEventListener("click", () => {
    shareResult().catch(() => {});
  });
  aboutButton.addEventListener("click", () => {
    aboutPanel.hidden = false;
  });
  closeAboutButton.addEventListener("click", () => {
    aboutPanel.hidden = true;
  });
  window.addEventListener("resize", resize);

  function worldToScreen(y, scroll) {
    return playerScreenY() - (y - scroll);
  }

  applyTexts();

  Promise.all([loadImages(ASSETS.player), loadImages(ASSETS.rivals)]).then(([player, rivals]) => {
    sprites.player = player;
    sprites.rivals = rivals;
    resize();
    resetGame();
    requestAnimationFrame((now) => {
      state.last = now;
      tick(now);
    });
  });
}
