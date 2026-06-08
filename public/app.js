import { initials, buildProfileHTML } from "./utils.js";

const state = {
  data: null,
  nodes: [],
  active: null,
  query: "",
  activeTab: "all-time",
  activeView: "ring",
  ringIndex: 0,
  ringWheelLocked: false,
  ringTouchX: null
};

const $ = (selector) => document.querySelector(selector);

async function init() {
  try {
    state.data = await fetch("./data/network.json").then((response) => response.json());
    state.nodes = state.data.nodes || [];
  } catch (error) {
    console.error("Failed to load network registry:", error);
    state.nodes = [];
  }

  renderRing();
  renderShowcase();
  renderLeaderboard();
  renderStats();
  bindEvents();
  
  if (state.nodes.length > 0) {
    selectNode(state.nodes[0]);
    updateRing(0, false);
  } else {
    updateRing(0, false);
  }
  
  boot();
}

function renderRing() {
  const track = $("#ringTrack");
  if (!track) return;

  if (state.nodes.length === 0) {
    track.innerHTML = `
      <article class="ring-card active empty-placeholder">
        <div class="ring-card-top">
          <span>KL-0000</span>
          <span>ONLINE</span>
        </div>
        <div class="ring-card-signal">
          <i></i><i></i><i></i>
          <div>KL</div>
        </div>
        <div class="ring-card-copy">
          <span class="eyebrow">NO SIGNAL DETECTED</span>
          <h2>Join the Ring</h2>
          <p>The builder registry is currently empty. Be the first to add your signal to Kerala's builder network!</p>
        </div>
        <div class="ring-card-actions">
          <a href="https://github.com/KLWebRing/KL-Dev-Ring.github.io#join" target="_blank" rel="noreferrer">FORK &amp; JOIN REGISTRY <span>↗</span></a>
        </div>
      </article>
    `;
    return;
  }

  track.innerHTML = state.nodes.map((node, index) => `
    <article class="ring-card" data-ring-index="${index}" style="--node-hue:${node.hue ?? 38}">
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
}

function renderTableHeader() {
  const row = $("#leaderboardHeaderRow");
  if (!row) return;

  if (state.activeTab === "all-time") {
    row.innerHTML = `
      <th>RANK</th>
      <th>BUILDER</th>
      <th class="num-col">SCORE</th>
      <th class="num-col">STREAK</th>
    `;
  } else if (state.activeTab === "weekly") {
    row.innerHTML = `
      <th>RANK</th>
      <th>BUILDER</th>
      <th class="num-col">STREAK</th>
      <th class="num-col">SCORE</th>
    `;
  } else if (state.activeTab === "districts") {
    row.innerHTML = `
      <th>RANK</th>
      <th>DISTRICT</th>
      <th class="num-col">BUILDERS</th>
    `;
  } else if (state.activeTab === "colleges") {
    row.innerHTML = `
      <th>RANK</th>
      <th>COLLEGE</th>
      <th class="num-col">BUILDERS</th>
    `;
  }
}

function renderLeaderboard() {
  const tbody = $("#leaderboardRows");
  if (!tbody) return;

  renderTableHeader();

  if (state.nodes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-rows">Waiting for signals...</td></tr>`;
    return;
  }

  if (state.activeTab === "all-time") {
    tbody.innerHTML = state.nodes.map((node, index) => `
      <tr data-sidebar-index="${index}" data-search-tokens="${escapeAttr(node.name + " " + node.district + " " + node.handle + " " + node.tags.join(" "))}">
        <td><span class="rank-badge">${node.rank}</span></td>
        <td>
          <div class="builder-identity">
            <div class="builder-initials" style="background: hsl(${node.hue ?? 38} 80% 60%)">${initials(node.name)}</div>
            <div class="builder-meta">
              <strong>${node.name}</strong>
              <small>${node.district}</small>
            </div>
          </div>
        </td>
        <td class="num-col score-col"><strong>${node.score}</strong></td>
        <td class="num-col streak-col">${node.stats?.streak || 0}W</td>
      </tr>
    `).join("");
  } else if (state.activeTab === "weekly") {
    const weeklyNodes = [...state.nodes].sort((a, b) => {
      const streakA = a.stats?.streak || 0;
      const streakB = b.stats?.streak || 0;
      return streakB - streakA || b.score - a.score || a.handle.localeCompare(b.handle);
    });

    tbody.innerHTML = weeklyNodes.map((node) => {
      const origIndex = state.nodes.findIndex((n) => n.handle === node.handle);
      return `
        <tr data-sidebar-index="${origIndex}" data-search-tokens="${escapeAttr(node.name + " " + node.district + " " + node.handle + " " + node.tags.join(" "))}">
          <td><span class="rank-badge">${node.rank}</span></td>
          <td>
            <div class="builder-identity">
              <div class="builder-initials" style="background: hsl(${node.hue ?? 38} 80% 60%)">${initials(node.name)}</div>
              <div class="builder-meta">
                <strong>${node.name}</strong>
                <small>${node.district}</small>
              </div>
            </div>
          </td>
          <td class="num-col streak-col"><strong>${node.stats?.streak || 0}W</strong></td>
          <td class="num-col score-col">${node.score}</td>
        </tr>
      `;
    }).join("");
  } else if (state.activeTab === "districts") {
    const distCounts = state.data?.districtCounts || {};
    const items = Object.entries(distCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    tbody.innerHTML = items.map((item, index) => `
      <tr data-search-tokens="${escapeAttr(item.name)}">
        <td><span class="rank-badge">${index + 1}</span></td>
        <td>
          <div class="builder-identity">
            <div class="builder-initials" style="background: hsl(38 80% 60%)">${item.name[0]}</div>
            <div class="builder-meta">
              <strong>${item.name}</strong>
              <small>Kerala District</small>
            </div>
          </div>
        </td>
        <td class="num-col"><strong>${item.count}</strong></td>
      </tr>
    `).join("");
  } else if (state.activeTab === "colleges") {
    const colCounts = state.data?.collegeCounts || {};
    const items = Object.entries(colCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty-rows">No student signals yet...</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map((item, index) => `
      <tr data-search-tokens="${escapeAttr(item.name)}">
        <td><span class="rank-badge">${index + 1}</span></td>
        <td>
          <div class="builder-identity">
            <div class="builder-initials" style="background: hsl(153 80% 60%)">${item.name[0]}</div>
            <div class="builder-meta">
              <strong>${item.name}</strong>
              <small>Institution</small>
            </div>
          </div>
        </td>
        <td class="num-col"><strong>${item.count}</strong></td>
      </tr>
    `).join("");
  }
}

function renderShowcase() {
  const grid = $("#showcaseGrid");
  if (!grid) return;

  const projects = state.nodes.flatMap((node) => 
    (node.projects || []).map((project) => ({
      ...project,
      builderName: node.name,
      builderHandle: node.handle,
      builderHue: node.hue ?? 38,
      tags: project.tech || node.tags || []
    }))
  );

  if (projects.length === 0) {
    grid.innerHTML = `
      <div class="empty-showcase">
        <span class="eyebrow">NO PROJECTS FOUND</span>
        <p>No active project submissions detected in the registry.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = projects.map((p) => `
    <article class="showcase-card" data-search-tokens="${escapeAttr(p.name + " " + p.description + " " + p.builderName + " " + p.tags.join(" "))}" style="--node-hue: ${p.builderHue}">
      <div class="showcase-card-header">
        <h3>${p.name}</h3>
        <button class="showcase-creator" data-open-builder="${p.builderHandle}">
          by <span>${p.builderName}</span>
        </button>
      </div>
      <p class="showcase-desc">${p.description}</p>
      <div class="showcase-tags">
        ${p.tags.slice(0, 4).map((t) => `<span>${t}</span>`).join("")}
      </div>
      <div class="showcase-links">
        ${p.url ? `<a href="${p.url}" target="_blank" rel="noreferrer">Launch Demo <span>↗</span></a>` : ""}
        <a href="https://github.com/${p.builderHandle}" target="_blank" rel="noreferrer">Creator GitHub <span>↗</span></a>
      </div>
    </article>
  `).join("");
}

function filterShowcase() {
  const cards = document.querySelectorAll("#showcaseGrid .showcase-card");
  cards.forEach((card) => {
    if (!card.dataset.searchTokens) return;
    const match = !state.query || card.dataset.searchTokens.includes(state.query);
    card.style.display = match ? "" : "none";
  });
}

function renderStats() {
  const statsEl = $("#topbarStats");
  if (!statsEl) return;

  if (state.nodes.length === 0 || !state.data?.stats) {
    statsEl.innerHTML = `<span>00 BUILDERS ONLINE</span>`;
    return;
  }

  const s = state.data.stats;
  statsEl.innerHTML = `
    <span><b>${String(s.builders).padStart(2, "0")}</b> BUILDERS</span>
    <span><b>${String(s.districts).padStart(2, "0")}</b> DISTRICTS</span>
    <span><b>${String(s.projects).padStart(2, "0")}</b> PROJECTS</span>
  `;
}

function updateRing(nextIndex, animate = true) {
  const total = state.nodes.length;
  if (total === 0) return;

  state.ringIndex = (nextIndex + total) % total;
  const cards = [...document.querySelectorAll(".ring-card")];
  
  cards.forEach((card, index) => {
    let offset = index - state.ringIndex;
    if (offset > total / 2) offset -= total;
    if (offset < -total / 2) offset += total;
    
    card.style.setProperty("--ring-offset", offset);
    card.style.setProperty("--ring-scale", Math.max(0.68, 1 - Math.abs(offset) * 0.16));
    card.style.setProperty("--ring-opacity", Math.max(0.0, 1 - Math.abs(offset) * 0.6));
    card.style.setProperty("--ring-saturation", Math.max(0.3, 1 - Math.abs(offset) * 0.4));
    
    card.classList.toggle("active", offset === 0);
    card.classList.toggle("near", Math.abs(offset) === 1);
    card.setAttribute("aria-hidden", Math.abs(offset) > 1 ? "true" : "false");
    
    if (!animate) card.classList.add("no-transition");
  });

  if (!animate) {
    requestAnimationFrame(() => cards.forEach((card) => card.classList.remove("no-transition")));
  }

  const current = state.nodes[state.ringIndex];
  const prev = state.nodes[(state.ringIndex - 1 + total) % total];
  const next = state.nodes[(state.ringIndex + 1) % total];

  $("#ringCounter").textContent = `${String(state.ringIndex + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  $("#ringProgress").style.width = `${((state.ringIndex + 1) / total) * 100}%`;
  $("#ringPrevName").textContent = prev.name.split(" ")[0];
  $("#ringNextName").textContent = next.name.split(" ")[0];

  // Sync leaderboard row highlighting
  document.querySelectorAll("#leaderboardRows tr").forEach((row) => {
    const idx = Number(row.dataset.sidebarIndex);
    const isActive = idx === state.ringIndex;
    row.classList.toggle("active", isActive);
    if (isActive && animate) {
      row.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  selectNode(current);
}

function stepRing(direction) {
  updateRing(state.ringIndex + direction);
}

function selectNode(node) {
  if (!node) return;
  state.active = node;
}

function bindEvents() {
  // Tab switching handler
  document.querySelectorAll(".leaderboard-tabs button")?.forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".leaderboard-tabs button").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      state.activeTab = btn.dataset.tab;
      renderLeaderboard();
      filterLeaderboard();
    });
  });

  // View switching handler
  document.querySelectorAll(".view-tabs button")?.forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-tabs button").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      state.activeView = btn.dataset.view;

      if (state.activeView === "ring") {
        $("#ringInner")?.classList.remove("hidden");
        $("#showcaseInner")?.classList.add("hidden");
      } else {
        $("#ringInner")?.classList.add("hidden");
        $("#showcaseInner")?.classList.remove("hidden");
        renderShowcase();
        filterShowcase();
      }
    });
  });

  $("#ringPrev")?.addEventListener("click", () => stepRing(-1));
  $("#ringNext")?.addEventListener("click", () => stepRing(1));
  $("#ringRandom")?.addEventListener("click", () => {
    if (state.nodes.length > 0) {
      const idx = Math.floor(Math.random() * state.nodes.length);
      updateRing(idx);
    }
  });

  $("#ringTrack")?.addEventListener("click", (event) => {
    const passport = event.target.closest("[data-open-builder]");
    if (passport) {
      openProfile(state.nodes.find((node) => node.handle === passport.dataset.openBuilder));
      return;
    }
    const card = event.target.closest("[data-ring-index]");
    if (card && !card.classList.contains("active")) {
      updateRing(Number(card.dataset.ringIndex));
    }
  });

  $("#showcaseGrid")?.addEventListener("click", (event) => {
    const passport = event.target.closest("[data-open-builder]");
    if (passport) {
      openProfile(state.nodes.find((node) => node.handle === passport.dataset.openBuilder));
    }
  });

  // Sidebar row click triggers card select
  $("#leaderboardRows")?.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-sidebar-index]");
    if (row) {
      updateRing(Number(row.dataset.sidebarIndex));
    }
  });

  // Sidebar search filters rows
  $("#search")?.addEventListener("input", (event) => {
    state.query = event.target.value.toLowerCase().trim();
    filterLeaderboard();
    if (state.activeView === "projects") {
      filterShowcase();
    }
  });

  // Capturing arrow keys
  window.addEventListener("keydown", (event) => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
    if (event.key === "ArrowLeft") stepRing(-1);
    if (event.key === "ArrowRight") stepRing(1);
  });

  // Mobile swipes
  const orbit = $("#ringOrbit");
  if (orbit) {
    orbit.addEventListener("touchstart", (event) => {
      state.ringTouchX = event.touches[0].clientX;
    }, { passive: true });
    
    orbit.addEventListener("touchend", (event) => {
      if (state.ringTouchX === null) return;
      const distance = event.changedTouches[0].clientX - state.ringTouchX;
      if (Math.abs(distance) > 40) {
        stepRing(distance < 0 ? 1 : -1);
      }
      state.ringTouchX = null;
    }, { passive: true });

    // Scroll wheel on explorer pane translates index
    orbit.addEventListener("wheel", (event) => {
      // Allow scroll default if cursor is on scrollable modal
      if (event.target.closest(".profile-modal")) return;
      
      event.preventDefault();
      if (state.ringWheelLocked) return;
      state.ringWheelLocked = true;
      stepRing(event.deltaY > 0 ? 1 : -1);
      setTimeout(() => { state.ringWheelLocked = false; }, 300);
    }, { passive: false });
  }

  // Modal handlers
  $("#closeProfile")?.addEventListener("click", () => $("#profileModal").close());
  $("#profileModal")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
}

function filterLeaderboard() {
  const rows = document.querySelectorAll("#leaderboardRows tr");
  rows.forEach((row) => {
    if (!row.dataset.searchTokens) return;
    const match = !state.query || row.dataset.searchTokens.includes(state.query);
    row.style.display = match ? "" : "none";
  });
}

function openProfile(node) {
  if (!node) return;
  $("#profileContent").innerHTML = buildProfileHTML(node);
  $("#profileModal").showModal();
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .toLowerCase();
}

function boot() {
  const el = $("#boot");
  if (localStorage.getItem("kl-ring-booted")) {
    el?.classList.add("hidden");
    return;
  }
  el?.classList.remove("hidden");
  const lines = [
    ["Initializing Kerala Builder Network...", 20],
    ["Acquiring Satellite Handshake...", 45],
    ["Mapping Registry Coordinates...", 70],
    ["Network Dashboard Ready.", 100]
  ];
  let index = 0;
  const next = () => {
    const [line, progress] = lines[index];
    if ($("#bootLine")) $("#bootLine").textContent = line;
    if ($("#bootProgress")) $("#bootProgress").style.width = `${progress}%`;
    if ($("#bootMetrics")) {
      $("#bootMetrics").textContent = index === 3
        ? "SYSTEM ONLINE / MAIN CHANNEL READY"
        : `PACKET SIGNAL ${index + 1} ESTABLISHED`;
    }
    index++;
    if (index < lines.length) {
      setTimeout(next, 400);
    } else {
      setTimeout(() => el?.classList.add("hidden"), 300);
      localStorage.setItem("kl-ring-booted", "1");
    }
  };
  setTimeout(next, 100);
}

$("#skipBoot")?.addEventListener("click", () => {
  $("#boot")?.classList.add("hidden");
  localStorage.setItem("kl-ring-booted", "1");
});

init().catch(console.error);
