import { initials, buildProfileHTML } from "./utils.js";

const state = {
  data: null, nodes: [], active: null, hovered: null, filter: "all", query: "",
  transform: { x: 0, y: 0, scale: 1 }, drag: null, time: 0,
  ringIndex: 0, ringWheelLocked: false, ringTouchX: null
};

const $ = (selector) => document.querySelector(selector);
const canvas = $("#networkCanvas");
const ctx = canvas.getContext("2d");
const wrap = $("#canvasWrap");

async function init() {
  state.data = await fetch("./data/network.json").then((response) => response.json());
  state.nodes = state.data.nodes.map((node) => ({ ...node, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 }));
  renderRing();
  renderStats();
  renderFilters();
  renderTrails();
  renderDistricts();
  bindEvents();
  resize();
  selectNode(state.nodes[0]);
  boot();
  requestAnimationFrame(draw);
}

function renderRing() {
  $("#ringTrack").innerHTML = state.nodes.map((node, index) => `
    <article class="ring-card" data-ring-index="${index}" style="--node-hue:${node.hue}">
      <div class="ring-card-top">
        <span>KL-${String(node.rank).padStart(4, "0")}</span>
        <span>${node.district.toUpperCase()}</span>
      </div>
      <div class="ring-card-signal">
        <i></i><i></i><i></i>
        <div>${initials(node.name)}</div>
      </div>
      <div class="ring-card-copy">
        <span class="eyebrow">BUILDER ${String(index + 1).padStart(2, "0")} / ${String(state.nodes.length).padStart(2, "0")}</span>
        <h2>${node.name}</h2>
        <p>${node.bio}</p>
        <div class="ring-card-tags">${node.tags.slice(0, 3).map((tag) => `<span>${tag}</span>`).join("")}</div>
      </div>
      <div class="ring-card-foot">
        <div><small>RANK</small><b>#${node.rank}</b></div>
        <div><small>SCORE</small><b>${node.score}</b></div>
        <div><small>STREAK</small><b>${node.stats?.streak || 0}W</b></div>
      </div>
      <div class="ring-card-actions">
        <a href="${node.site}" target="_blank" rel="noreferrer">ENTER PERSONAL SITE <span>↗</span></a>
        <button data-open-builder="${node.handle}">VIEW PASSPORT</button>
      </div>
    </article>`).join("");
  updateRing(0, false);
}

function updateRing(nextIndex, animate = true) {
  const total = state.nodes.length;
  state.ringIndex = (nextIndex + total) % total;
  const cards = [...document.querySelectorAll(".ring-card")];
  cards.forEach((card, index) => {
    let offset = index - state.ringIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    card.style.setProperty("--ring-offset", offset);
    card.style.setProperty("--ring-scale", Math.max(.64, 1 - Math.abs(offset) * .12));
    card.style.setProperty("--ring-opacity", Math.max(.12, 1 - Math.abs(offset) * .42));
    card.style.setProperty("--ring-saturation", Math.max(.3, 1 - Math.abs(offset) * .35));
    card.classList.toggle("active", offset === 0);
    card.classList.toggle("near", Math.abs(offset) === 1);
    card.setAttribute("aria-hidden", Math.abs(offset) > 1 ? "true" : "false");
    if (!animate) card.classList.add("no-transition");
  });
  if (!animate) requestAnimationFrame(() => cards.forEach((card) => card.classList.remove("no-transition")));
  const current = state.nodes[state.ringIndex];
  const prev = state.nodes[(state.ringIndex - 1 + total) % total];
  const next = state.nodes[(state.ringIndex + 1) % total];
  $("#ringCounter").textContent = `${String(state.ringIndex + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  $("#ringProgress").style.width = `${((state.ringIndex + 1) / total) * 100}%`;
  $("#ringPrevName").textContent = prev.name;
  $("#ringNextName").textContent = next.name;
  selectNode(current);
}

function stepRing(direction) {
  scrollRingTo(state.ringIndex + direction);
}

function scrollRingTo(index) {
  const total = state.nodes.length;
  const normalized = (index + total) % total;
  const section = $("#ringView");
  const available = section.offsetHeight - window.innerHeight;
  const top = section.offsetTop + (normalized / Math.max(total - 1, 1)) * available;
  window.scrollTo({ top, behavior: "smooth" });
  updateRing(normalized);
}

function syncRingToScroll() {
  const section = $("#ringView");
  const available = section.offsetHeight - window.innerHeight;
  if (available <= 0) return;
  const progress = Math.max(0, Math.min(1, (window.scrollY - section.offsetTop) / available));
  const index = Math.round(progress * (state.nodes.length - 1));
  if (index !== state.ringIndex) updateRing(index);
}

function boot(force = false) {
  const el = $("#boot");
  if (!force && localStorage.getItem("kl-ring-booted")) {
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  const lines = [
    ["Initializing Kerala Builder Network...", 18],
    ["Loading Constellations...", 40],
    ["Discovering Builders...", 63],
    ["Mapping Connections...", 84],
    ["Network Established.", 100]
  ];
  let index = 0;
  const next = () => {
    const [line, progress] = lines[index];
    $("#bootLine").textContent = line;
    $("#bootProgress").style.width = `${progress}%`;
    $("#bootMetrics").textContent = index === 4
      ? `${state.data.stats.builders} BUILDERS  /  ${state.data.stats.districts} DISTRICTS  /  ${state.data.stats.projects} PROJECTS`
      : `NODE ${String(index + 1).padStart(2, "0")} / HANDSHAKE ACCEPTED`;
    index++;
    if (index < lines.length) setTimeout(next, 460);
    else setTimeout(hideBoot, 420);
  };
  setTimeout(next, 180);
}

function hideBoot() {
  $("#boot").classList.add("hidden");
  localStorage.setItem("kl-ring-booted", "1");
}

function renderStats() {
  const labels = { builders: "BUILDERS CONNECTED", districts: "DISTRICTS ONLINE", projects: "PROJECTS INDEXED", countries: "COUNTRIES LINKED" };
  $("#heroStats").innerHTML = Object.entries(state.data.stats).map(([key, value]) =>
    `<div class="stat"><strong>${String(value).padStart(2, "0")}</strong><span>${labels[key]}</span></div>`
  ).join("");
}

function renderFilters() {
  const preferred = ["all", "ai", "opensource", "systems", "webdev", "student", "diaspora"];
  $("#filters").innerHTML = preferred.map((tag) =>
    `<button data-filter="${tag}" class="${tag === "all" ? "active" : ""}">${tag.replace("-", " ")}</button>`
  ).join("");
  $("#filters").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    state.filter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
    updateVisibleCount();
  });
}

function renderTrails() {
  const colors = ["#ffb31a", "#7ad8a6", "#4db9cf", "#e56aa6", "#d3cb65", "#a98be8"];
  $("#trailGrid").innerHTML = state.data.trails.map((trail, index) => `
    <button class="trail-card" data-trail="${trail.tag}" style="--trail:${colors[index % colors.length]}">
      <span class="trail-number">TRAIL / ${String(index + 1).padStart(2, "0")}</span>
      <h3>${trail.name}</h3><p>${trail.description}</p>
      <div class="trail-path">${trail.members.map(() => "<i></i><span></span>").join("").replace(/<span><\/span>$/, "")}<b>${trail.members.length} SIGNALS</b></div>
    </button>`).join("");
  $("#trailGrid").addEventListener("click", (event) => {
    const card = event.target.closest("[data-trail]");
    if (!card) return;
    state.filter = card.dataset.trail;
    document.querySelector(`[data-filter="${state.filter}"]`)?.click();
    $("#universeView").scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

const districtOrder = [
  "Kasaragod", "Kannur", "Wayanad", "Kozhikode", "Malappuram", "Palakkad", "Thrissur",
  "Ernakulam", "Idukki", "Kottayam", "Alappuzha", "Pathanamthitta", "Kollam", "Thiruvananthapuram"
];
function renderDistricts() {
  const max = Math.max(...Object.values(state.data.districtCounts), 1);
  $("#keralaMap").innerHTML = districtOrder.map((district, index) => {
    const count = state.data.districtCounts[district];
    return `<button class="district-node" data-district="${district}" style="--count:${count / max};--signal:hsl(${38 + index * 8} 85% 58%)">${district}<br>${count} signal${count === 1 ? "" : "s"}</button>`;
  }).join("");
  $("#keralaMap").addEventListener("click", (event) => {
    const button = event.target.closest("[data-district]");
    if (!button) return;
    document.querySelectorAll(".district-node").forEach((node) => node.classList.toggle("active", node === button));
    inspectDistrict(button.dataset.district);
  });
}

function inspectDistrict(district) {
  const members = state.nodes.filter((node) => node.district === district);
  $("#districtName").textContent = district;
  $("#districtCopy").textContent = members.length
    ? `${members.length} builder signal${members.length === 1 ? "" : "s"} currently originate from ${district}.`
    : `No signal has been logged from ${district} yet. The next one could be yours.`;
  $("#districtBuilders").innerHTML = members.length ? members.map((member) =>
    `<button class="mini-builder" data-handle="${member.handle}"><b>${member.name}</b><span>#${member.rank} ↗</span></button>`
  ).join("") : `<a class="mini-builder" href="https://github.com/KLDevRing/ring/fork"><b>OPEN FIRST SIGNAL</b><span>JOIN ↗</span></a>`;
  $("#districtBuilders").onclick = (event) => {
    const button = event.target.closest("[data-handle]");
    if (button) openProfile(state.nodes.find((node) => node.handle === button.dataset.handle));
  };
}

function bindEvents() {
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", syncRingToScroll, { passive: true });
  $("#skipBoot").addEventListener("click", hideBoot);
  $("#replayIntro").addEventListener("click", () => boot(true));
  $("#search").addEventListener("input", (event) => { state.query = event.target.value.toLowerCase(); updateVisibleCount(); });
  window.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== $("#search")) { event.preventDefault(); $("#search").focus(); }
    if (event.key === "ArrowLeft" && !isTyping()) stepRing(-1);
    if (event.key === "ArrowRight" && !isTyping()) stepRing(1);
    if (event.key.toLowerCase() === "k" && event.shiftKey) toggleSecretMode();
  });
  $("#ringPrev").addEventListener("click", () => stepRing(-1));
  $("#ringNext").addEventListener("click", () => stepRing(1));
  $("#ringRandom").addEventListener("click", () => scrollRingTo(Math.floor(Math.random() * state.nodes.length)));
  $("#ringTrack").addEventListener("click", (event) => {
    const passport = event.target.closest("[data-open-builder]");
    if (passport) {
      openProfile(state.nodes.find((node) => node.handle === passport.dataset.openBuilder));
      return;
    }
    const card = event.target.closest("[data-ring-index]");
    if (card && !card.classList.contains("active")) scrollRingTo(Number(card.dataset.ringIndex));
  });
  $("#ringOrbit").addEventListener("wheel", (event) => {
    const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY) * .65;
    if (!horizontalIntent || state.ringWheelLocked) return;
    event.preventDefault();
    state.ringWheelLocked = true;
    stepRing(event.deltaX > 0 ? 1 : -1);
    setTimeout(() => { state.ringWheelLocked = false; }, 420);
  }, { passive: false });
  $("#ringOrbit").addEventListener("touchstart", (event) => {
    state.ringTouchX = event.touches[0].clientX;
  }, { passive: true });
  $("#ringOrbit").addEventListener("touchend", (event) => {
    if (state.ringTouchX === null) return;
    const distance = event.changedTouches[0].clientX - state.ringTouchX;
    if (Math.abs(distance) > 45) stepRing(distance < 0 ? 1 : -1);
    state.ringTouchX = null;
  }, { passive: true });
  wrap.addEventListener("pointerdown", (event) => { state.drag = { x: event.clientX, y: event.clientY, tx: state.transform.x, ty: state.transform.y }; wrap.setPointerCapture(event.pointerId); });
  wrap.addEventListener("pointermove", pointerMove);
  wrap.addEventListener("pointerup", pointerUp);
  wrap.addEventListener("pointerleave", () => { state.hovered = null; $("#nodeTip").style.opacity = 0; });
  wrap.addEventListener("wheel", (event) => { event.preventDefault(); zoom(event.deltaY > 0 ? .9 : 1.1); }, { passive: false });
  $("#zoomIn").addEventListener("click", () => zoom(1.2));
  $("#zoomOut").addEventListener("click", () => zoom(.8));
  $("#resetView").addEventListener("click", () => { state.transform = { x: 0, y: 0, scale: 1 }; state.filter = "all"; $("#filters button").click(); });
  $("#randomBuilder").addEventListener("click", () => selectNode(state.nodes[Math.floor(Math.random() * state.nodes.length)]));
  $("#openProfile").addEventListener("click", () => openProfile(state.active));
  $("#closeProfile").addEventListener("click", () => $("#profileModal").close());
  $(".profile-modal").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });
  document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
    const target = { ring: "#ringView", universe: "#universeView", districts: "#districtsView", trails: "#trailsView" }[link.dataset.view];
    if (!target) return; // anchor nav-links (e.g. Leaderboard) use their href
    document.querySelector(target).scrollIntoView({ behavior: "smooth" });
  }));
}

function isTyping() {
  return ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
}

function isVisible(node) {
  const filterMatch = state.filter === "all" || node.tags.includes(state.filter);
  const haystack = `${node.name} ${node.handle} ${node.district} ${node.city} ${node.tags.join(" ")}`.toLowerCase();
  return filterMatch && (!state.query || haystack.includes(state.query));
}
function updateVisibleCount() {
  $("#visibleCount").textContent = state.nodes.filter(isVisible).length;
}
function resize() {
  const rect = wrap.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio, 2);
  canvas.width = rect.width * ratio; canvas.height = rect.height * ratio;
  canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  updateVisibleCount();
}

function position(node) {
  const rect = wrap.getBoundingClientRect();
  const drift = 7;
  return {
    x: (node.x * rect.width + Math.sin(state.time * .00035 + node.phase) * drift) * state.transform.scale + state.transform.x,
    y: (node.y * rect.height + Math.cos(state.time * .00028 + node.phase) * drift) * state.transform.scale + state.transform.y
  };
}

function draw(time) {
  state.time = time;
  const rect = wrap.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.save();
  state.data.links.forEach((link) => {
    const a = state.nodes[link.source], b = state.nodes[link.target];
    if (!isVisible(a) || !isVisible(b)) return;
    const pa = position(a), pb = position(b);
    const active = state.active && (a.handle === state.active.handle || b.handle === state.active.handle);
    const pulse = .16 + Math.sin(time * .0015 + link.source) * .05;
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
    ctx.strokeStyle = active ? `rgba(255,179,26,${.32 + pulse})` : `rgba(145,174,157,${pulse})`;
    ctx.lineWidth = active ? 1.1 : .55; ctx.stroke();
    if (active) {
      const t = (time * .00015 + link.source * .21) % 1;
      ctx.beginPath(); ctx.arc(pa.x + (pb.x - pa.x) * t, pa.y + (pb.y - pa.y) * t, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffca58"; ctx.fill();
    }
  });
  state.nodes.forEach((node) => {
    if (!isVisible(node)) return;
    const p = position(node), selected = state.active?.handle === node.handle, hovered = state.hovered?.handle === node.handle;
    const radius = selected ? 5.5 : hovered ? 4.5 : 2.3 + Math.min(node.score / 240, 2);
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 5);
    glow.addColorStop(0, `hsla(${node.hue} 90% 70% / .8)`); glow.addColorStop(1, `hsla(${node.hue} 90% 60% / 0)`);
    ctx.beginPath(); ctx.arc(p.x, p.y, radius * 5, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fillStyle = `hsl(${node.hue} 90% 72%)`; ctx.fill();
    if (selected) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 13 + Math.sin(time * .003) * 2, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,179,26,.55)"; ctx.lineWidth = .7; ctx.stroke();
    }
    if (selected || hovered || state.query) {
      ctx.fillStyle = selected ? "#f5e9c9" : "rgba(232,234,223,.72)";
      ctx.font = `500 ${selected ? 10 : 8}px "DM Mono"`; ctx.fillText(node.name.toUpperCase(), p.x + 11, p.y + 4);
    }
  });
  ctx.restore();
  requestAnimationFrame(draw);
}

function pointerMove(event) {
  if (state.drag) {
    state.transform.x = state.drag.tx + event.clientX - state.drag.x;
    state.transform.y = state.drag.ty + event.clientY - state.drag.y;
    return;
  }
  const rect = wrap.getBoundingClientRect();
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  state.hovered = state.nodes.filter(isVisible).find((node) => {
    const p = position(node); return Math.hypot(p.x - x, p.y - y) < 13;
  }) || null;
  const tip = $("#nodeTip");
  if (state.hovered) {
    tip.innerHTML = `<b>${state.hovered.name}</b><span>${state.hovered.district} / ${state.hovered.tags.slice(0, 2).join(" · ")}</span>`;
    tip.style.left = `${x}px`; tip.style.top = `${y}px`; tip.style.opacity = 1;
  } else tip.style.opacity = 0;
}
function pointerUp(event) {
  const moved = state.drag && Math.hypot(event.clientX - state.drag.x, event.clientY - state.drag.y) > 5;
  state.drag = null;
  if (!moved && state.hovered) selectNode(state.hovered);
}
function zoom(amount) { state.transform.scale = Math.max(.55, Math.min(2.4, state.transform.scale * amount)); }

function selectNode(node) {
  if (!node) return;
  state.active = node;
  $("#panelRank").textContent = `#${String(node.rank).padStart(2, "0")}`;
  $("#panelInitials").textContent = initials(node.name);
  $("#panelLocation").textContent = `${node.city} / ${node.country}`;
  $("#panelName").textContent = node.name;
  $("#panelBio").textContent = node.bio;
  $("#panelTags").innerHTML = node.tags.slice(0, 5).map((tag) => `<span>${tag}</span>`).join("");
  $("#panelScore").textContent = node.score;
  $("#panelStreak").textContent = `${node.stats?.streak || 0}W`;
}

function openProfile(node) {
  if (!node) return;
  selectNode(node);
  $("#profileContent").innerHTML = buildProfileHTML(node);
  $("#profileModal").showModal();
}
function toggleSecretMode() {
  document.body.classList.toggle("secret");
  state.nodes.forEach((node) => { node.hue = document.body.classList.contains("secret") ? 115 + Math.random() * 70 : node.hue; });
}

init().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main style="padding:10vw;font-family:monospace;color:#ffb31a">NETWORK OFFLINE<br><small>${error.message}</small></main>`;
});
