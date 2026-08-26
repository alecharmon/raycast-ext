import { mkdir, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { Skill } from "./skills";

/** Canonical SKILL.md: the two fields agents read, plus the body. Vault bookkeeping is dropped. */
export function toSkillFile(skill: Skill): string {
  return `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n${skill.body}\n`;
}

function expand(dir: string): string {
  return dir.replace(/^~/, homedir());
}

export async function installLocally(skill: Skill, agentDir: string): Promise<string> {
  const dir = join(expand(agentDir), skill.name);
  await mkdir(dir, { recursive: true });
  const path = join(dir, "SKILL.md");
  await writeFile(path, toSkillFile(skill));
  return path;
}

/**
 * One self-contained shell command carrying the whole skill — paste it into any SSH session.
 * Quoted heredoc, so nothing in the body is expanded by the remote shell.
 */
export function installCommand(skill: Skill, agentDir: string): string {
  const content = toSkillFile(skill);
  let delim = "SKILL_EOF";
  while (content.includes(delim)) delim += "_"; // ponytail: body containing the delimiter is rare but fatal
  const dir = `${agentDir.replace(/\/+$/, "")}/${skill.name}`;
  return `mkdir -p ${dir} && cat > ${dir}/SKILL.md <<'${delim}'\n${content.trimEnd()}\n${delim}`;
}
