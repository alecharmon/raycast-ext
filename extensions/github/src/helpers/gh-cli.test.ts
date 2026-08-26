import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

type GhCli = {
  getGitHubCLIToken: () => string | undefined;
  requireGitHubCLIToken: () => string;
};

// ponytail: dynamic import mirrors pull-request-checks.test.ts — keeps the .ts path out of tsc's view.
async function loadGhCli(): Promise<GhCli> {
  return (await import(pathToFileURL(resolve("src/helpers/gh-cli.ts")).href)) as GhCli;
}

test("returns a GitHub token or undefined", async () => {
  const { getGitHubCLIToken } = await loadGhCli();
  const token = getGitHubCLIToken();

  assert.ok(token === undefined || /^(gh[pousr]_|github_pat_)/.test(token), `unexpected token shape: ${token}`);
});

test("require throws an actionable error instead of returning nothing", async () => {
  const { getGitHubCLIToken, requireGitHubCLIToken } = await loadGhCli();

  if (getGitHubCLIToken() === undefined) {
    assert.throws(requireGitHubCLIToken, /gh auth (login|refresh)|not installed/);
  } else {
    assert.equal(requireGitHubCLIToken(), getGitHubCLIToken());
  }
});
