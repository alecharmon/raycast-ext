import { execFileSync } from "child_process";
import { existsSync } from "fs";

// ponytail: the `gh` CLI already stores a token (keychain or hosts.yml) — shelling out to it
// beats re-implementing its credential lookup. Raycast's node doesn't inherit the login shell's
// PATH, so probe the usual install locations instead.
const GH_PATHS = ["/opt/homebrew/bin/gh", "/usr/local/bin/gh", "/usr/bin/gh", `${process.env.HOME}/.local/bin/gh`];

export const REQUIRED_SCOPES = "notifications,read:project,project,read:org,read:user";

export function getGitHubCLIToken(): string | undefined {
  const gh = GH_PATHS.find(existsSync);
  if (!gh) return undefined;

  try {
    return execFileSync(gh, ["auth", "token"], { encoding: "utf8", timeout: 5000 }).trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * This extension authenticates only through the GitHub CLI, so a missing token is fatal —
 * failing loudly here beats silently falling back to a different account's credentials.
 */
export function requireGitHubCLIToken(): string {
  const token = getGitHubCLIToken();
  if (token) return token;

  const installed = GH_PATHS.some(existsSync);
  throw new Error(
    installed
      ? `The GitHub CLI has no token. Run:\n\n    gh auth login\n\nthen give it the scopes this extension needs:\n\n    gh auth refresh --hostname github.com -s ${REQUIRED_SCOPES}`
      : "The GitHub CLI (gh) is not installed. Install it with `brew install gh`, then run `gh auth login`.",
  );
}
