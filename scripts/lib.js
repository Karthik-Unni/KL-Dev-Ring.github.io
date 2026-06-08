import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DISTRICTS = [
  "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha",
  "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad",
  "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod"
];
export const REQUIRED = [
  "handle", "name", "github", "site", "city", "district",
  "country", "tags", "bio", "joined"
];

export async function readMembers() {
  const dir = path.join(ROOT, "members");
  const files = (await fs.readdir(dir))
    .filter((file) => file.endsWith(".json") && !file.startsWith("_"))
    .sort();
  return Promise.all(files.map(async (file) => {
    const member = JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
    return { ...member, __file: file };
  }));
}

export function validateMember(member, filenames = []) {
  const errors = [];
  for (const field of REQUIRED) {
    if (member[field] === undefined || member[field] === "") errors.push(`missing ${field}`);
  }
  if (!/^[a-z0-9-]+$/.test(member.handle || "")) errors.push("handle must use lowercase letters, numbers, and hyphens");
  if (member.__file && member.__file !== `${member.handle}.json`) errors.push("filename must match handle");
  if (!DISTRICTS.includes(member.district)) errors.push("district must be one of Kerala's 14 districts");
  if (!Array.isArray(member.tags) || member.tags.length < 1 || member.tags.length > 8) errors.push("tags must contain 1-8 entries");
  if (member.tags?.some((tag) => !/^[a-z0-9-]+$/.test(tag))) errors.push("tags must be lowercase kebab-case");
  if ((member.bio || "").length > 250) errors.push("bio must be 250 characters or fewer");
  if (member.college !== undefined && typeof member.college !== "string") errors.push("college must be a string");
  if (member.college && member.college.length > 100) errors.push("college name must be 100 characters or fewer");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(member.joined || "")) errors.push("joined must use YYYY-MM-DD");
  for (const field of ["site"]) {
    try { if (new URL(member[field]).protocol !== "https:") errors.push(`${field} must use HTTPS`); }
    catch { errors.push(`${field} must be a valid URL`); }
  }
  if (filenames.filter((name) => name === member.handle).length > 1) errors.push("duplicate handle");
  return errors;
}

export function scoreMember(member) {
  const s = member.stats || {};
  const raw =
    Math.log2((s.contributions || 0) + 1) * 18 +
    Math.min(s.mergedPRs || 0, 75) * 1.8 +
    Math.min(s.projects || member.projects?.length || 0, 20) * 5 +
    Math.min(s.posts || 0, 40) * 2.2 +
    Math.min(s.streak || 0, 52) * 1.5;
  return Math.round(raw);
}

function badges(member, rank, total) {
  const s = member.stats || {};
  const age = (Date.now() - new Date(member.joined).getTime()) / 86400000;
  return [
    rank === 1 && { icon: "◆", label: "Record" },
    rank <= Math.max(2, Math.ceil(total * 0.15)) && { icon: "↗", label: "Hot" },
    (s.streak || 0) >= 30 && { icon: "⌁", label: "Streak" },
    (s.posts || 0) >= 15 && { icon: "✦", label: "Writer" },
    member.country !== "India" && { icon: "◎", label: "Diaspora" },
    age <= 60 && { icon: "+", label: "New" },
    member.college && { icon: "🎓", label: "Student" },
    member.tags?.includes("opensource") && { icon: "🚀", label: "FOSS Hero" },
    member.tags?.includes("ai") && { icon: "🧠", label: "AI Builder" },
    member.tags?.includes("webdev") && { icon: "🌐", label: "Web Builder" }
  ].filter(Boolean);
}

export function buildNetwork(rawMembers) {
  const ranked = rawMembers
    .map((member) => ({ ...member, score: scoreMember(member) }))
    .sort((a, b) => b.score - a.score || a.handle.localeCompare(b.handle))
    .map((member, index, all) => ({
      ...member,
      rank: index + 1,
      badges: badges(member, index + 1, all.length)
    }));

  const nodes = ranked.map((member, index) => ({
    ...member,
    x: seeded(member.handle, 0) * 0.76 + 0.12,
    y: seeded(member.handle, 1) * 0.7 + 0.14,
    hue: tagHue(member.tags[0]),
    index
  }));

  const links = [];
  for (let i = 0; i < nodes.length; i++) {
    const candidates = [];
    for (let j = i + 1; j < nodes.length; j++) {
      const shared = nodes[i].tags.filter((tag) => nodes[j].tags.includes(tag));
      let strength = shared.length * 2;
      if (nodes[i].district === nodes[j].district) strength += 2;
      if (nodes[i].country === nodes[j].country) strength += 0.4;
      if (strength > 0) candidates.push({ source: i, target: j, strength, shared });
    }
    candidates.sort((a, b) => b.strength - a.strength);
    links.push(...candidates.slice(0, 3));
  }

  const districtCounts = Object.fromEntries(DISTRICTS.map((district) => [
    district, nodes.filter((member) => member.district === district).length
  ]));
  const collegeCounts = {};
  for (const node of nodes) {
    if (node.college && node.college.trim() !== "") {
      const col = node.college.trim();
      collegeCounts[col] = (collegeCounts[col] || 0) + 1;
    }
  }

  // RICH LEAGUE METRICS
  const districtLeagues = DISTRICTS.map((district) => {
    const membersInDistrict = nodes.filter((member) => member.district === district);
    const count = membersInDistrict.length;
    const totalScore = membersInDistrict.reduce((sum, member) => sum + member.score, 0);
    const sorted = [...membersInDistrict].sort((a, b) => b.score - a.score || a.handle.localeCompare(b.handle));
    const topBuilder = sorted[0];
    return {
      name: district,
      count,
      score: totalScore,
      topBuilderHandle: topBuilder ? topBuilder.handle : "",
      topBuilderName: topBuilder ? topBuilder.name : ""
    };
  });

  const collegeMap = {};
  for (const node of nodes) {
    if (node.college && node.college.trim() !== "") {
      const col = node.college.trim();
      if (!collegeMap[col]) collegeMap[col] = [];
      collegeMap[col].push(node);
    }
  }
  const collegeLeagues = Object.entries(collegeMap).map(([name, membersInCollege]) => {
    const count = membersInCollege.length;
    const totalScore = membersInCollege.reduce((sum, member) => sum + member.score, 0);
    const sorted = [...membersInCollege].sort((a, b) => b.score - a.score || a.handle.localeCompare(b.handle));
    const topBuilder = sorted[0];
    return {
      name,
      count,
      score: totalScore,
      topBuilderHandle: topBuilder ? topBuilder.handle : "",
      topBuilderName: topBuilder ? topBuilder.name : ""
    };
  });

  const tags = [...new Set(nodes.flatMap((member) => member.tags))];
  const trails = [
    ["AI Trail", "ai", "Machine intelligence, research, and humane products."],
    ["Open Source Trail", "opensource", "Maintainers and public-interest builders."],
    ["Systems Trail", "systems", "Infrastructure, security, and low-level craft."],
    ["Web Trail", "webdev", "People shaping the expressive open web."],
    ["Student Trail", "student", "The network's next wave of builders."],
    ["Diaspora Trail", "diaspora", "Kerala-connected builders across the world."]
  ].map(([name, tag, description]) => ({
    name, tag, description,
    members: nodes.filter((member) => member.tags.includes(tag)).map((member) => member.handle)
  })).filter((trail) => trail.members.length);

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      builders: nodes.length,
      districts: new Set(nodes.map((m) => m.district)).size,
      projects: nodes.reduce((sum, m) => sum + (m.projects?.length || 0), 0),
      countries: new Set(nodes.map((m) => m.country)).size
    },
    tags, districtCounts, collegeCounts, districtLeagues, collegeLeagues, trails, nodes, links
  };
}

function seeded(value, salt) {
  let hash = 2166136261 + salt * 101;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return ((hash >>> 0) % 10000) / 10000;
}

function tagHue(tag) {
  const palette = {
    ai: 38, systems: 184, webdev: 326, opensource: 153, student: 52,
    diaspora: 272, security: 5, hardware: 198, "creative-code": 312
  };
  return palette[tag] ?? 28 + Math.floor(seeded(tag, 3) * 300);
}

export { ROOT };
