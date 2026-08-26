// ponytail: run with `npx tsx src/skills.test.ts`
import assert from "assert";
import { parse } from "./skills";

const withMatter = parse(
  `---\nname: Code Review\ndescription: "Review a diff"\nsource: obra\n---\n\nDo the thing.\n`,
  "/v/Skills/code-review.md",
);
assert.equal(withMatter.name, "Code Review");
assert.equal(withMatter.description, "Review a diff");
assert.equal(withMatter.source, "obra");
assert.equal(withMatter.body, "Do the thing.");

const bare = parse("# Heading\nbody text", "/v/Skills/my-skill.md");
assert.equal(bare.name, "my-skill");
assert.equal(bare.description, "Heading");
assert.equal(bare.source, "mine");

console.log("ok");
