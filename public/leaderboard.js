/**
 * leaderboard.js — KL Dev-Ring leaderboard page
 *
 * Fetches the same network.json produced by build.js.
 * Uses real rank deltas from weekly snapshots when available.
 * Falls back gracefully (no delta indicators) when no snapshots exist.
 *
 * Does NOT import or run app.js — this is a standalone module.
 */

import { initials, buildProfileHTML } from "./utils.js";

// ── State ────────────────────────────────────────────────────
const state = {
  nodes: [],
  sortKey: "score",
  query: "",
  // Map<handle, delta> loaded from real weekly snapshots, or null if unavailable.
  // Positive delta = rank improved (number went down). Negative = rank fell.
  rankDeltas: null,
};

// ── Sort metric labels ────────────────────────────────────────
const SORT_LABELS = {
  score: "BUILDER SCORE",
  contributions: "COMMITS",
  mergedPRs: "MERGED PRS",
  projects: "PROJECTS",
  posts: "POSTS",
  streak: "STREAK",
};

// ── Helpers ──────────────────────────────────────────────────
const $ = (selector) => document.querySelector(selector);

/** Escape a string for safe use inside an HTML attribute value. */
function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getMetricValue(node, key) {
  if (key === "score") return node.score;
  return node.stats?.[key] ?? 0;
}

function rankClass(rank) {
  if (rank === 1) return "lb-gold";
  if (rank === 2) return "lb-silver";
  if (rank === 3) return "lb-bronze";
  return "";
}

/**
 * Returns an HTML span for a real rank delta, or empty string if delta is 0 or null.
 * Only called when state.rankDeltas is populated from actual snapshot data.
 * @param {number|null} delta — positive = moved up, negative = moved down
 * @returns {string}
 */
function deltaHTML(delta) {
  if (delta === null || delta === 0) return "";
  if (delta > 0) {
    const n = delta;
    return `<span class="lb-rank-delta lb-delta-up" aria-label="Up ${n} position${n === 1 ? "" : "s"} from last week">▲${n}</span>`;
  }
  const n = Math.abs(delta);
  return `<span class="lb-rank-delta lb-delta-down" aria-label="Down ${n} position${n === 1 ? "" : "s"} from last week">▼${n}</span>`;
}

// ── Real rank delta loading from weekly snapshots ─────────────
/**
 * Attempts to load the two most recent rank snapshots from
 * dist/data/snapshots/index.json, then computes per-handle deltas.
 *
 * Returns null when:
 *   - The snapshots directory does not exist yet (404)
 *   - Fewer than two snapshots are available
 *   - Any network or parse error occurs
 *
 * When null is returned, the leaderboard renders without any rank
 * movement indicators. This is the correct behaviour before the weekly
 * CI snapshot workflow has produced enough data.
 *
 * @returns {Promise<Map<string, number>|null>}
 */
async function fetchRankDeltas() {
  try {
    const indexRes = await fetch("./data/snapshots/index.json");
    if (!indexRes.ok) return null;

    const index = await indexRes.json();
    if (!Array.isArray(index.snapshots) || index.snapshots.length < 2) return null;

    // index.snapshots is sorted newest-first by build.js
    const [currentFile, previousFile] = index.snapshots;
    const [current, previous] = await Promise.all([
      fetch(`./data/snapshots/${currentFile}`).then((r) => r.json()),
      fetch(`./data/snapshots/${previousFile}`).then((r) => r.json()),
    ]);

    if (!Array.isArray(current.rankings) || !Array.isArray(previous.rankings)) return null;

    // Build a lookup of previous ranks by handle
    const prevRanks = new Map(previous.rankings.map((r) => [r.handle, r.rank]));

    const deltas = new Map();
    for (const entry of current.rankings) {
      const prev = prevRanks.get(entry.handle);
      if (prev !== undefined) {
        // positive = rank number fell = builder moved UP the table
        const delta = prev - entry.rank;
        if (delta !== 0) deltas.set(entry.handle, delta);
        // delta === 0 means no change: omitted from the map, nothing rendered
      }
      // New builders (not in previous snapshot) get no delta indicator
    }

    return deltas;
  } catch {
    // Network error, JSON parse error, unexpected shape — degrade silently
    return null;
  }
}

// ── Render spotlight ─────────────────────────────────────────
/**
 * Renders the top-builder spotlight card.
 * @param {object} node — the leading builder for the current sort
 * @param {string} metricLabel — human-readable label for what "top" means
 */
function renderSpotlight(node, metricLabel) {
  const card = $("#lbSpotlightCard");
  const delta = state.rankDeltas?.get(node.handle) ?? null;

  card.innerHTML = `
    <div class="lb-spotlight-avatar-col">
      <div class="lb-spotlight-avatar" style="background:hsl(${node.hue} 82% 66%)" aria-hidden="true">${initials(node.name)}</div>
    </div>
    <div class="lb-spotlight-info">
      <div class="lb-spotlight-rank">
        <span>TOP SIGNAL / ${escapeAttr(metricLabel)}</span>
        <b>#${node.rank}</b>
        ${delta !== null ? deltaHTML(delta) : ""}
      </div>
      <h2>${escapeAttr(node.name)}</h2>
      <p>${escapeAttr(node.bio)}</p>
      <div class="lb-spotlight-badges">${
        (node.badges ?? []).map((b) => `<span class="badge">${b.icon} ${escapeAttr(b.label)}</span>`).join("")
      }</div>
    </div>
    <div class="lb-spotlight-metrics">
      <div class="lb-spotlight-metric">
        <small>BUILDER SCORE</small>
        <strong>${node.score}</strong>
      </div>
      <div class="lb-spotlight-metric">
        <small>STREAK</small>
        <strong>${node.stats?.streak ?? 0}W</strong>
      </div>
      <div class="lb-spotlight-metric">
        <small>MERGED PRs</small>
        <strong>${node.stats?.mergedPRs ?? 0}</strong>
      </div>
    </div>`;
}

// ── Render stats hero bar ────────────────────────────────────
function renderStats(stats) {
  const labels = {
    builders: "BUILDERS RANKED",
    districts: "DISTRICTS ONLINE",
    projects: "PROJECTS INDEXED",
    countries: "COUNTRIES LINKED",
  };
  $("#lbStats").innerHTML = Object.entries(stats)
    .map(([key, value]) =>
      `<div class="stat"><strong>${String(value).padStart(2, "0")}</strong><span>${labels[key] ?? key}</span></div>`
    )
    .join("");
}

// ── Render one table row ─────────────────────────────────────
function renderRow(node) {
  const delta = state.rankDeltas?.get(node.handle) ?? null;
  const isHotStreak = (node.stats?.streak ?? 0) >= 20;
  const sortedStat = state.sortKey !== "score" ? state.sortKey : null;

  // data-search is escaped so a name containing " doesn't break the attribute
  const searchTokens = escapeAttr(
    [node.name, node.handle, node.district, node.city ?? "", ...node.tags]
      .join(" ")
      .toLowerCase()
  );

  return `
    <tr data-handle="${escapeAttr(node.handle)}" data-search="${searchTokens}">
      <td class="lb-col-rank">
        <div class="lb-rank-cell">
          <span class="lb-rank-num ${rankClass(node.rank)}">#${node.rank}</span>
          ${delta !== null ? deltaHTML(delta) : ""}
        </div>
      </td>
      <td class="lb-col-builder">
        <button
          class="lb-builder-cell"
          data-open-profile="${escapeAttr(node.handle)}"
          aria-label="View profile of ${escapeAttr(node.name)}"
        >
          <div class="lb-builder-avatar" style="background:hsl(${node.hue} 82% 66%)" aria-hidden="true">${initials(node.name)}</div>
          <div class="lb-builder-meta">
            <span class="lb-builder-name">${escapeAttr(node.name)}</span>
            <span class="lb-builder-location">${escapeAttr(node.district)} / ${escapeAttr(node.country)}</span>
            <div class="lb-builder-tags">${node.tags.slice(0, 3).map((t) => `<span>${escapeAttr(t)}</span>`).join("")}</div>
          </div>
        </button>
      </td>
      <td class="lb-col-score">
        <div class="lb-score-cell">${node.score}</div>
      </td>
      <td class="lb-col-commits">
        <div class="lb-metric-cell${sortedStat === "contributions" ? " lb-metric-active" : ""}">${node.stats?.contributions ?? 0}</div>
      </td>
      <td class="lb-col-prs">
        <div class="lb-metric-cell${sortedStat === "mergedPRs" ? " lb-metric-active" : ""}">${node.stats?.mergedPRs ?? 0}</div>
      </td>
      <td class="lb-col-projects">
        <div class="lb-metric-cell${sortedStat === "projects" ? " lb-metric-active" : ""}">${node.stats?.projects ?? node.projects?.length ?? 0}</div>
      </td>
      <td class="lb-col-posts">
        <div class="lb-metric-cell${sortedStat === "posts" ? " lb-metric-active" : ""}">${node.stats?.posts ?? 0}</div>
      </td>
      <td class="lb-col-streak">
        <div class="lb-streak-cell">
          <span class="lb-streak-val">${node.stats?.streak ?? 0}W${isHotStreak ? ` <span class="lb-streak-hot" aria-label="Active build streak">⌁</span>` : ""}</span>
        </div>
      </td>
      <td class="lb-col-links">
        <div class="lb-links-cell">
          <a href="${escapeAttr(node.site)}" target="_blank" rel="noreferrer" aria-label="Personal site of ${escapeAttr(node.name)}">Site ↗</a>
          <a href="https://github.com/${escapeAttr(node.github)}" target="_blank" rel="noreferrer" aria-label="GitHub profile of ${escapeAttr(node.name)}">GH ↗</a>
        </div>
      </td>
    </tr>`;
}

// ── Render full table ────────────────────────────────────────
function renderTable() {
  const sorted = [...state.nodes].sort((a, b) => {
    const av = getMetricValue(a, state.sortKey);
    const bv = getMetricValue(b, state.sortKey);
    return bv - av || a.handle.localeCompare(b.handle);
  });

  // Spotlight always reflects the leader for the current sort
  if (sorted.length > 0) {
    renderSpotlight(sorted[0], SORT_LABELS[state.sortKey] ?? "BUILDER SCORE");
  }

  $("#lbBody").innerHTML = sorted.map(renderRow).join("");
  applyFilter();
}

// ── Filter visible rows ──────────────────────────────────────
function applyFilter() {
  const query = state.query;
  document.querySelectorAll("#lbBody tr[data-handle]").forEach((row) => {
    const matches = !query || row.dataset.search.includes(query);
    row.classList.toggle("lb-hidden", !matches);
  });
}

// ── Profile modal ────────────────────────────────────────────
function openProfile(node) {
  if (!node) return;
  $("#lbProfileContent").innerHTML = buildProfileHTML(node);
  $("#lbProfileModal").showModal();
}

// ── Row click events (bound once — never re-registered) ──────
/**
 * Registered a single time in init().
 * Event delegation on the stable #lbBody element handles all current and future
 * rows without accumulating duplicate listeners across sort operations.
 */
function bindRowEvents() {
  $("#lbBody").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-open-profile]");
    if (!btn) return;
    const node = state.nodes.find((n) => n.handle === btn.dataset.openProfile);
    if (node) openProfile(node);
  });
}

// ── Sort tab events ──────────────────────────────────────────
function bindSortTabs() {
  $("#lbMetricTabs").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-sort]");
    if (!btn) return;
    state.sortKey = btn.dataset.sort;
    document.querySelectorAll("#lbMetricTabs [data-sort]").forEach((b) => {
      const isActive = b === btn;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    renderTable();
  });
}

// ── Search event ─────────────────────────────────────────────
function bindSearch() {
  $("#lbSearch").addEventListener("input", (event) => {
    state.query = event.target.value.toLowerCase().trim();
    applyFilter();
  });
}

// ── Modal close events ───────────────────────────────────────
function bindModal() {
  $("#lbCloseProfile").addEventListener("click", () => $("#lbProfileModal").close());
  // Click outside the modal content to dismiss (native <dialog> pattern)
  $("#lbProfileModal").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  });
}

// ── Bootstrap ────────────────────────────────────────────────
async function init() {
  const data = await fetch("./data/network.json").then((r) => r.json());
  state.nodes = data.nodes;

  // Attempt to load real rank movement data from weekly snapshots.
  // Returns null if no snapshots exist yet — no indicators are shown.
  state.rankDeltas = await fetchRankDeltas();

  renderStats(data.stats);

  // Find rank #1 by score explicitly rather than assuming nodes[0]
  const topBuilder = data.nodes.find((n) => n.rank === 1) ?? data.nodes[0];
  renderSpotlight(topBuilder, SORT_LABELS.score);

  renderTable();
  bindSortTabs();
  bindSearch();
  bindModal();

  // Row events bound once here — NOT inside renderTable()
  bindRowEvents();
}

init().catch((error) => {
  console.error(error);
  const fallback = document.querySelector("#lbBody");
  if (fallback) {
    fallback.innerHTML = `<tr class="lb-loading-row"><td colspan="9"><span>SIGNAL OFFLINE — ${escapeAttr(error.message)}</span></td></tr>`;
  }
});
