import { readdir, readFile, rename, writeFile } from "fs/promises";
import { homedir } from "os";
import { basename, dirname, join } from "path";

export type Skill = {
  path: string;
  name: string;
  description: string;
  source: string;
  repo?: string;
  repoPath?: string;
  body: string;
  markdown: string;
};

// ponytail: hand-rolled frontmatter reader; swap for gray-matter if notes need real YAML (lists, nesting)
export function parse(raw: string, path: string): Skill {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const fields: Record<string, string> = {};
  for (const line of match?.[1].split("\n") ?? []) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kv) fields[kv[1].toLowerCase()] = kv[2].replace(/^["']|["']$/g, "").trim();
  }
  const body = raw.slice(match?.[0].length ?? 0).trim();
  return {
    path,
    name: fields.name || basename(path, ".md"),
    description: fields.description || body.split("\n")[0].replace(/^#+\s*/, ""),
    source: fields.source || fields.author || "mine",
    repo: fields.repo,
    repoPath: fields.repopath,
    body,
    markdown: raw,
  };
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (e) => {
      const p = join(dir, e.name);
      if (e.isDirectory()) return e.name.startsWith(".") ? [] : walk(p);
      return p.endsWith(".md") ? [p] : [];
    }),
  );
  return files.flat();
}

export async function loadSkills(folder: string): Promise<Skill[]> {
  const dir = folder.replace(/^~/, homedir());
  const paths = await walk(dir);
  const skills = await Promise.all(paths.map(async (p) => parse(await readFile(p, "utf8"), p)));
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/** Rename in place: rewrite the `name:` field and move the note to match. Returns the new path. */
export async function renameSkill(skill: Skill, newName: string): Promise<string> {
  const name = newName.trim();
  if (!name) throw new Error("Name can't be empty");

  const file = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const path = join(dirname(skill.path), `${file || "skill"}.md`);

  const match = skill.markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  const markdown = match
    ? /^name:/m.test(match[1])
      ? skill.markdown.replace(/^name:.*$/m, `name: ${name}`)
      : `---\nname: ${name}\n${match[1]}\n---\n${skill.markdown.slice(match[0].length)}`
    : `---\nname: ${name}\n---\n\n${skill.markdown.trim()}\n`;

  await writeFile(skill.path, markdown);
  if (path !== skill.path) await rename(skill.path, path);
  return path;
}
