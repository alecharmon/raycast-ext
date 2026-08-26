import { execFileSync } from "child_process";
import { existsSync } from "fs";

// ponytail: the `gh` CLI already stores a token (keychain or hosts.yml) — shelling out to it
// beats re-implementing its credential lookup. Raycast's node doesn't inherit the login shell's
// PATH, so probe the usual install locations instead.
const GH_PATHS = ["/opt/homebrew/bin/gh", "/usr/local/bin/gh", "/usr/bin/gh", `${process.env.HOME}/.local/bin/gh`];

export function getGitHubCLIToken(): string | undefined {
  const gh = GH_PATHS.find(existsSync);
  if (!gh) return undefined;

  try {
    return execFileSync(gh, ["auth", "token"], { encoding: "utf8", timeout: 5000 }).trim() || undefined;
  } catch {
    return undefined;
  }
}
