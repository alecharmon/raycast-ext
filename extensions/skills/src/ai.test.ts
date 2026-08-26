// ponytail: run with `npx tsx src/ai.test.ts`. AI.ask itself isn't covered — it needs a Raycast runtime;
// this pins the routing/parsing around it, which is where the bugs live.
import assert from "assert";
import { clean, isUrl, rawUrl, slug } from "./ai";
import { isRepoRef } from "./github";

// routing: a repo goes down the verbatim path, everything else goes to AI
for (const repo of ["mattpocock/skills", "https://github.com/mattpocock/skills", "git@github.com:o/r.git"]) {
  assert.ok(isRepoRef(repo), repo);
  assert.ok(!isUrl(repo), repo);
}
for (const url of ["https://github.com/o/r/blob/main/skills/x/SKILL.md", "https://example.com/docs/thing"]) {
  assert.ok(isUrl(url), url);
  assert.ok(!isRepoRef(url), url);
}
assert.ok(!isUrl("Do the thing, then the other thing."));

assert.equal(
  rawUrl("https://github.com/o/r/blob/main/a/SKILL.md"),
  "https://raw.githubusercontent.com/o/r/main/a/SKILL.md",
);
assert.equal(rawUrl("https://example.com/x"), "https://example.com/x");

assert.equal(clean("```markdown\n---\nname: a\n---\nbody\n```"), "---\nname: a\n---\nbody");
assert.equal(slug("---\nname: Code Review\n---\n", "fallback"), "code-review");
assert.equal(slug("no frontmatter", "My Skill"), "my-skill");

console.log("ok");
