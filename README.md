# Raycast Extensions

My Raycast extensions, kept in one place.

| Extension | What it does |
| --- | --- |
| [**github**](extensions/github) | The official GitHub extension, authenticating through the `gh` CLI only — no personal access token, no OAuth. |
| [**skills**](extensions/skills) | An Obsidian-backed agent skill library — search skills, paste them into an agent, import them from GitHub, install them onto any machine. |

## Running one locally

```sh
cd extensions/<name>
npm install
npm run dev
```

`npm run dev` installs the extension into Raycast as a development extension and rebuilds on save. Stop the process to stop hot-reloading; the extension stays installed.

## github: authentication

This fork authenticates **only** through the GitHub CLI. There is no personal access token preference and no Raycast OAuth fallback — the extension reuses whatever token `gh` already holds, so there is nothing to configure and no second credential to keep in sync.

Set `gh` up once:

```sh
gh auth login
gh auth refresh --hostname github.com -s notifications,read:project,project,read:org,read:user
```

That second command matters: `gh`'s default scopes don't include `notifications` or `read:project`, and the extension's `getViewer` query needs `read:project` on every launch. Without it every command fails.

If `gh` is missing or logged out, the extension says so with the command to run rather than falling back to another account's credentials.

The token is read fresh on each command launch, so re-authenticating with `gh` takes effect immediately — no rebuild.

## Credit

`extensions/github` is derived from the GitHub extension in [raycast/extensions](https://github.com/raycast/extensions), MIT licensed — see [`extensions/github/LICENSE`](extensions/github/LICENSE). `extensions/skills` is MIT licensed, and previously lived at [alecharmon/raycast-skills](https://github.com/alecharmon/raycast-skills) (now archived).
