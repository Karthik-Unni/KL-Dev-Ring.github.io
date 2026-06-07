/**
 * scripts/snapshot.js — Weekly rank snapshot generator.
 *
 * Records the current leaderboard standings to snapshots/<YYYY-WW>.json.
 * Run automatically by CI (.github/workflows/snapshot.yml) every Monday,
 * or manually: node scripts/snapshot.js
 *
 * The leaderboard page fetches the two most recent snapshots at runtime to
 * compute real week-over-week rank movement for each builder.
 *
 * Snapshot format:
 * {
 *   "week": "2026-W23",          // ISO 8601 week (Monday start)
 *   "generatedAt": "<ISO date>",
 *   "rankings": [
 *     { "handle": "anand-s", "rank": 1, "score": 347 },
 *     ...
 *   ]
 * }
 *
 * Snapshots are sorted newest-first in dist/data/snapshots/index.json.
 * The build script (scripts/build.js) copies them into the output.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { buildNetwork, readMembers, ROOT } from "./lib.js";

// ── ISO week string (Monday-start, zero-padded) ───────────────
function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7; // treat Sunday as 7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek); // move to Thursday of the week
  const year = d.getUTCFullYear();
  const weekNum = Math.ceil(((d - new Date(Date.UTC(year, 0, 1))) / 86400000 + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

const week = isoWeek();
const filename = `${week}.json`;
const snapshotDir = path.join(ROOT, "snapshots");
const outPath = path.join(snapshotDir, filename);

// Idempotent: skip if this week's snapshot already exists.
try {
  await fs.access(outPath);
  console.log(`Snapshot for ${week} already exists: snapshots/${filename} — skipping.`);
  process.exit(0);
} catch {
  // File does not exist — proceed.
}

const rawMembers = await readMembers();
const network = buildNetwork(rawMembers.map(({ __file, ...m }) => m));

const snapshot = {
  week,
  generatedAt: new Date().toISOString(),
  rankings: network.nodes.map((n) => ({
    handle: n.handle,
    rank: n.rank,
    score: n.score,
  })),
};

await fs.mkdir(snapshotDir, { recursive: true });
await fs.writeFile(outPath, JSON.stringify(snapshot, null, 2));
console.log(`Snapshot written: snapshots/${filename} (${snapshot.rankings.length} builders)`);
