// ponytail: run with `npx tsx src/github.test.ts` — hits GitHub, writes to a temp dir
import assert from "assert";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { importRepo, knownRepos, markRemoved, parseRepo, repoDir, skillName, stamp } from "./github";
import { parse, renameSkill } from "./skills";

assert.equal(parseRepo("mattpocock/skills"), "mattpocock/skills");
assert.equal(parseRepo("https://github.com/mattpocock/skills"), "mattpocock/skills");
assert.equal(parseRepo("git@github.com:mattpocock/skills.git"), "mattpocock/skills");
assert.throws(() => parseRepo("nope"));

assert.equal(skillName("skills/engineering/code-review/SKILL.md"), "code-review");

const stamped = stamp("---\nname: x\nsource: old\n---\nbody\n", "o/r", "a/SKILL.md");
const reparsed = parse(stamped, "/x/x.md");
assert.equal(reparsed.name, "x");
assert.equal(reparsed.source, "o/r");
assert.equal(reparsed.body, "body");
assert.ok(!stamped.includes("old"));

async function main() {
  const dir = await mkdtemp(join(tmpdir(), "skills-test-"));
  const { repo, count } = await importRepo("https://github.com/mattpocock/skills", dir);
  assert.equal(repo, "mattpocock/skills");
  assert.ok(count > 5, `expected several skills, got ${count}`);

  const one = parse(await readFile(join(dir, "mattpocock-skills", "code-review.md"), "utf8"), "code-review.md");
  assert.equal(one.name, "code-review");
  assert.equal(one.source, "mattpocock/skills");
  assert.ok(one.body.length > 100);

  assert.deepEqual(await knownRepos(dir), ["mattpocock/skills"]);

  // Removing one skill must not remove the rest of its repo on the next update.
  const repoFolder = repoDir("mattpocock/skills", dir);
  await rm(join(repoFolder, "code-review.md"));
  await markRemoved(repoFolder, one.repoPath as string);

  const again = await importRepo("mattpocock/skills", dir);
  assert.equal(again.skipped, 1);
  assert.equal(again.count, count - 1);
  await assert.rejects(readFile(join(repoFolder, "code-review.md"), "utf8"), "removed skill came back");
  const sibling = await readFile(join(repoFolder, "tdd.md"), "utf8");
  assert.ok(sibling.includes("mattpocock/skills"), "sibling skill should still be there");

  // A renamed skill must keep its name and file on the next update — and not come back twice.
  const tdd = parse(await readFile(join(repoFolder, "tdd.md"), "utf8"), join(repoFolder, "tdd.md"));
  const renamed = await renameSkill(tdd, "My TDD Loop");
  assert.equal(renamed, join(repoFolder, "my-tdd-loop.md"));

  await importRepo("mattpocock/skills", dir);
  const after = parse(await readFile(renamed, "utf8"), renamed);
  assert.equal(after.name, "My TDD Loop", "rename was clobbered by upstream");
  assert.equal(after.repoPath, tdd.repoPath);
  await assert.rejects(readFile(join(repoFolder, "tdd.md"), "utf8"), "update recreated the pre-rename file");

  console.log(`ok — ${count} skills; removal and rename both survive re-import`);
}

main();
