// ponytail: run with `npx tsx src/install.test.ts` — actually executes the generated command in a temp dir
import assert from "assert";
import { execFileSync } from "child_process";
import { mkdtemp, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { installCommand, installLocally, toSkillFile } from "./install";
import { parse } from "./skills";

const skill = parse(
  `---\nname: code-review\ndescription: Review a diff\nsource: mattpocock/skills\nrepo: mattpocock/skills\n---\n` +
    // the nasty bits: quotes, backticks, $VARS, and a line that looks like a heredoc terminator
    'Run `git diff $BASE..HEAD` and say "done".\n\n$(echo pwned)\n\'single\' "double"\nSKILL_EOF\n',
  "/vault/code-review.md",
);

// Vault bookkeeping is stripped; the two fields agents read survive.
const file = toSkillFile(skill);
assert.ok(file.startsWith("---\nname: code-review\ndescription: Review a diff\n---\n"));
assert.ok(!file.includes("repo:"));

async function main() {
  const dir = await mkdtemp(join(tmpdir(), "install-test-"));

  const local = await installLocally(skill, dir);
  assert.equal(local, join(dir, "code-review", "SKILL.md"));
  assert.equal(await readFile(local, "utf8"), file);

  // The copyable command must rebuild the identical file through a real shell.
  const remote = await mkdtemp(join(tmpdir(), "ssh-test-"));
  const cmd = installCommand(skill, remote);
  assert.ok(!cmd.includes("<<'SKILL_EOF'"), "delimiter must dodge the one in the body");
  execFileSync("/bin/sh", ["-c", cmd]);

  const landed = await readFile(join(remote, "code-review", "SKILL.md"), "utf8");
  assert.equal(landed.trim(), file.trim(), "skill did not survive the shell round-trip");
  assert.ok(landed.includes("$(echo pwned)"), "shell must not expand the body");

  console.log("ok");
}

main();
