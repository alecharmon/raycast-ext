import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { isRepoRef } from "./github";

const PROMPT = `You are converting source material into a single agent skill note.

Output ONLY a markdown document in this exact shape, no commentary, no code fences:

---
name: <kebab-case-id>
description: <one sentence: what the skill does and when an agent should use it>
---

<the skill instructions, written as direct second-person instructions to an agent>

Rules:
- Keep every concrete instruction, command, and constraint from the source.
- Drop navigation chrome, marketing copy, install badges, and boilerplate.
- If the source is already a skill file, clean it up but preserve its content and its existing name.

Source material:
`;

// ponytail: regex tag-strip — the model tolerates the noise; add a readability dep only if results get bad
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(
      /&(nbsp|amp|lt|gt|quot|#39);/g,
      (_, e) => ({ nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[e as string] ?? " ",
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function rawUrl(url: string): string {
  return url.replace(/^https:\/\/github\.com\/(.+?)\/blob\/(.+)$/, "https://raw.githubusercontent.com/$1/$2");
}

export function isUrl(input: string): boolean {
  return /^https?:\/\//.test(input.trim()) && !isRepoRef(input);
}

export async function fetchSource(url: string): Promise<string> {
  const res = await fetch(rawUrl(url.trim()));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const text = await res.text();
  return res.headers.get("content-type")?.includes("html") ? htmlToText(text) : text;
}

export function slug(markdown: string, fallback: string): string {
  const name = markdown.match(/^name:\s*(.+)$/m)?.[1].trim();
  return (
    (name || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "untitled-skill"
  );
}

export function clean(answer: string): string {
  return answer
    .trim()
    .replace(/^```(?:markdown|md)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

/** Stamp where it came from, alongside whatever frontmatter the model wrote. */
function stampOrigin(markdown: string, origin: string): string {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return `---\nsource: ${origin}\n---\n\n${markdown}\n`;
  return `---\n${match[1]}\nsource: ${origin}\n---\n${markdown.slice(match[0].length)}`;
}

// `ask` is injected so this module stays free of @raycast/api and testable outside Raycast.
export async function importWithAI(input: string, folder: string, ask: (prompt: string) => Promise<string>) {
  const source = isUrl(input) ? await fetchSource(input) : input;
  if (source.trim().length < 40) throw new Error("Not enough source material to build a skill");

  const answer = clean(await ask(PROMPT + source.slice(0, 40_000)));
  const origin = isUrl(input) ? input.trim() : "ai-import";
  const path = join(folder.replace(/^~/, homedir()), `${slug(answer, "untitled-skill")}.md`);
  await writeFile(path, stampOrigin(answer, origin));
  return path;
}
