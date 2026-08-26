import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

// ponytail: dynamic import mirrors pull-request-checks.test.ts — keeps the .ts path out of tsc's view.
async function loadGetGitHubCLIToken(): Promise<() => string | undefined> {
  const moduleUrl = pathToFileURL(resolve("src/helpers/gh-cli.ts")).href;
  const module = (await import(moduleUrl)) as { getGitHubCLIToken: () => string | undefined };
  return module.getGitHubCLIToken;
}

// Either gh is absent/logged out (undefined) or we got a real GitHub token.
test("returns a GitHub token or undefined", async () => {
  const token = (await loadGetGitHubCLIToken())();

  assert.ok(token === undefined || /^(gh[pousr]_|github_pat_)/.test(token), `unexpected token shape: ${token}`);
});
