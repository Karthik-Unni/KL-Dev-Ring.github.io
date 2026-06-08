/**
 * utils.js — Shared utilities for KL Dev-Ring pages.
 *
 * Imported by app.js and leaderboard.js.
 * Must remain side-effect free: no DOM access, no fetch calls at module level.
 */

/**
 * Returns 1–2 uppercase initials derived from a full name.
 * @param {string} name
 * @returns {string}
 */
export function initials(name) {
  return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

/**
 * Builds the inner HTML for a builder profile modal or standalone profile sheet.
 * The caller is responsible for injecting the returned string into the appropriate
 * container element and calling showModal() on the <dialog>.
 *
 * @param {{ handle: string, name: string, rank: number, district: string,
 *           country: string, joined: string, score: number, bio: string,
 *           badges: Array<{icon:string,label:string}>,
 *           projects: Array<{name:string,url:string,description:string}>,
 *           site: string, github: string, stats?: object }} node
 * @returns {string} HTML string
 */
export function buildProfileHTML(node) {
  const projects = node.projects ?? [];
  const badges = node.badges ?? [];
  const hue = node.hue ?? 38; // Fallback to saffron
  return `
    <div class="profile-sheet" style="--node-hue: ${hue}">
      <aside class="passport">
        <span class="eyebrow">KERALA BUILDER PASSPORT</span>
        <div class="passport-avatar">${initials(node.name)}</div>
        <h2>${node.name}</h2><p>${node.district}<br>${node.country}${node.college ? `<br><small class="passport-college">${node.college}</small>` : ""}</p>
        <div class="passport-code">
          <div><span>RING ID</span><b>KL-${String(node.rank).padStart(4, "0")}</b></div>
          <div><span>JOINED</span><b>${node.joined}</b></div>
          <div><span>BUILDER SCORE</span><b style="color:hsl(${hue} 90% 65%)">${node.score}</b></div>
          <div><span>DAILY DELTA</span><b>+${node.stats?.daily ?? 0}</b></div>
          <div><span>MONTHLY DELTA</span><b>+${node.stats?.monthly ?? 0}</b></div>
          <div><span>NETWORK RANK</span><b>#${node.rank}</b></div>
          <div><span>STREAK</span><b>${node.stats?.streak ?? 0} WEEKS</b></div>
        </div>
      </aside>
      <article class="profile-main">
        <span class="eyebrow">ACTIVE BUILDER / ${node.handle.toUpperCase()}</span>
        <h1>${node.name}</h1><p>${node.bio}</p>
        <div class="badge-row">${badges.map((b) => `<span class="badge" style="border-color:hsl(${hue} 50% 30%);color:hsl(${hue} 90% 65%)">${b.icon} ${b.label}</span>`).join("")}</div>
        <span class="eyebrow">SHIPPED WORK</span>
        <div class="project-list">${projects.map((p) => `
          <a class="project" href="${p.url}" target="_blank" rel="noreferrer">
            <b>${p.name}</b><span style="color:hsl(${hue} 90% 65%)">↗</span>
            <p>${p.description}</p>
          </a>`).join("")}</div>
        <div class="profile-links">
          <a href="${node.site}" target="_blank" rel="noreferrer" style="background:hsl(${hue} 85% 58%);color:#070a09;border-color:hsl(${hue} 85% 58%)">Personal site ↗</a>
          <a href="https://github.com/${node.github}" target="_blank" rel="noreferrer">GitHub ↗</a>
          <button class="recruiter-btn" data-copy-contact="${node.handle}">Copy Contact 📋</button>
        </div>
      </article>
    </div>`;
}
