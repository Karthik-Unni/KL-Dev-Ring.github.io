import test from "node:test";
import assert from "node:assert/strict";
import { buildNetwork, readMembers, scoreMember, validateMember } from "../scripts/lib.js";

test("all sample members validate", async () => {
  const members = await readMembers();
  const handles = members.map((member) => member.handle);
  for (const member of members) assert.deepEqual(validateMember(member, handles), []);
});

test("network output is deterministic and connected", async () => {
  const members = await readMembers();
  const a = buildNetwork(members);
  const b = buildNetwork(members);
  assert.deepEqual(a.nodes.map(({ x, y }) => [x, y]), b.nodes.map(({ x, y }) => [x, y]));
  if (a.nodes.length >= 2) {
    assert.ok(a.links.length >= a.nodes.length / 2);
  }
  assert.equal(a.stats.builders, members.length);
});

test("builder score rewards shipping signals", () => {
  const quiet = scoreMember({ stats: { contributions: 10, projects: 1 } });
  const active = scoreMember({ stats: { contributions: 500, mergedPRs: 30, projects: 8, posts: 10, streak: 20 } });
  assert.ok(active > quiet);
});
