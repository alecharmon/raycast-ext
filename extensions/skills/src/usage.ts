import { LocalStorage } from "@raycast/api";

// ponytail: one JSON blob keyed by note path — a few hundred skills is nothing to parse
const KEY = "lastUsed";

export type Usage = Record<string, number>;

export async function loadUsage(): Promise<Usage> {
  const raw = await LocalStorage.getItem<string>(KEY);
  try {
    return raw ? (JSON.parse(raw) as Usage) : {};
  } catch {
    return {};
  }
}

export async function touch(path: string): Promise<void> {
  const usage = await loadUsage();
  await LocalStorage.setItem(KEY, JSON.stringify({ ...usage, [path]: Date.now() }));
}

/** Most recently used first, then never-used alphabetically. */
export function byRecency<T extends { path: string; name: string }>(items: T[], usage: Usage): T[] {
  return [...items].sort((a, b) => (usage[b.path] ?? 0) - (usage[a.path] ?? 0) || a.name.localeCompare(b.name));
}

/** Carry a skill's recency across a rename. */
export async function movePath(from: string, to: string): Promise<void> {
  const usage = await loadUsage();
  if (!(from in usage) || from === to) return;
  const { [from]: when, ...rest } = usage;
  await LocalStorage.setItem(KEY, JSON.stringify({ ...rest, [to]: when }));
}
