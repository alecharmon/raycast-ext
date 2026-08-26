import { mkdir, readFile, writeFile } from "fs/promises";
import { homedir } from "os";
import { basename, dirname, join } from "path";
import { loadSkills } from "./skills";

export type ImportResult = { repo: string; count: number; skipped: number };

// "owner/name", "https://github.com/owner/name", "git@github.com:owner/name.git"
export function parseRepo(input: string): string {
  const m = input.trim().match(/(?:github\.com[/:])?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  if (!m) throw new Error(`Not a GitHub repo: ${input}`);
  return `${m[1]}/${m[2]}`;
}

// A whole repo ("owner/repo", its URL) — not a URL pointing at one file inside a repo.
export function isRepoRef(input: string): boolean {
  return /^(?:https?:\/\/github\.com\/|git@github\.com:)?[\w.-]+\/[\w.-]+?(?:\.git)?\/?$/.test(input.trim());
}

// ponytail: unauthenticated API is 60 req/hr; set GITHUB_TOKEN in the command's env if that ever bites
async function gh(url: string): Promise<Response> {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res;
}

async function skillPaths(repo: string): Promise<{ branch: string; paths: string[] }> {
  const meta = (await (await gh(`https://api.github.com/repos/${repo}`)).json()) as { default_branch: string };
  const branch = meta.default_branch;
  const tree = (await (await gh(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`)).json()) as {
    tree: { path: string; type: string }[];
  };
  return {
    branch,
    paths: tree.tree.filter((t) => t.type === "blob" && basename(t.path) === "SKILL.md").map((t) => t.path),
  };
}

// Add provenance to the skill's existing frontmatter (or give it one).
// `keepName` preserves a local rename against the upstream name.
export function stamp(raw: string, repo: string, path: string, keepName?: string): string {
  const fields = [`source: ${repo}`, `repo: ${repo}`, `repoPath: ${path}`];
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match)
    return `---\n${[keepName && `name: ${keepName}`, ...fields].filter(Boolean).join("\n")}\n---\n\n${raw.trim()}\n`;
  const body = match[1]
    .split("\n")
    .filter((l) => !/^(source|repo|repoPath):/.test(l))
    .map((l) => (keepName && /^name:/.test(l) ? `name: ${keepName}` : l))
    .join("\n");
  return `---\n${body}\n${fields.join("\n")}\n---\n${raw.slice(match[0].length)}`;
}

export function skillName(path: string): string {
  const dir = basename(dirname(path));
  return dir && dir !== "." ? dir : basename(path, ".md");
}

export function repoDir(repo: string, folder: string): string {
  return join(folder.replace(/^~/, homedir()), repo.replace("/", "-"));
}

// Skills you removed by hand, so re-importing doesn't resurrect them. Dotfile: invisible to Obsidian.
const REMOVED = ".removed";

export async function readRemoved(dir: string): Promise<string[]> {
  const raw = await readFile(join(dir, REMOVED), "utf8").catch(() => "");
  return raw.split("\n").filter(Boolean);
}

export async function markRemoved(dir: string, repoPath: string): Promise<void> {
  const removed = await readRemoved(dir);
  if (!removed.includes(repoPath)) await writeFile(join(dir, REMOVED), [...removed, repoPath].join("\n") + "\n");
}

export async function unmarkRemoved(dir: string): Promise<void> {
  await writeFile(join(dir, REMOVED), "");
}

export async function importRepo(input: string, folder: string): Promise<ImportResult> {
  const repo = parseRepo(input);
  const dest = repoDir(repo, folder);
  await mkdir(dest, { recursive: true });

  const removed = await readRemoved(dest);
  // Notes already tracking a repoPath keep their file and their (possibly renamed) name.
  const existing = new Map(
    (await loadSkills(dest).catch(() => [])).filter((s) => s.repoPath).map((s) => [s.repoPath as string, s]),
  );
  const { branch, paths: all } = await skillPaths(repo);
  const paths = all.filter((p) => !removed.includes(p));
  await Promise.all(
    paths.map(async (p) => {
      const raw = await (await gh(`https://raw.githubusercontent.com/${repo}/${branch}/${p}`)).text();
      const prior = existing.get(p);
      await writeFile(prior?.path ?? join(dest, `${skillName(p)}.md`), stamp(raw, repo, p, prior?.name));
    }),
  );
  return { repo, count: paths.length, skipped: all.length - paths.length };
}

// Repos are remembered in the notes themselves — no extra store to keep in sync.
export async function knownRepos(folder: string): Promise<string[]> {
  const skills = await loadSkills(folder).catch(() => []);
  const repos = skills.map((s) => s.markdown.match(/^repo:\s*(\S+)$/m)?.[1]).filter((r): r is string => !!r);
  return [...new Set(repos)].sort();
}
