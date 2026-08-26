# Raycast Extensions

My Raycast extensions, kept in one place.

| Extension | What it does |
| --- | --- |
| [**github**](extensions/github) | The official GitHub extension, with the option to authenticate using the `gh` CLI instead of a personal access token. |
| [**skills**](extensions/skills) | An Obsidian-backed agent skill library — search skills, paste them into an agent, import them from GitHub, install them onto any machine. |

## Running one locally

```sh
cd extensions/<name>
npm install
npm run dev
```

`npm run dev` installs the extension into Raycast as a development extension and rebuilds on save. Stop the process to stop hot-reloading; the extension stays installed.

## github: authenticating with the GitHub CLI

The upstream extension wants a personal access token, or Raycast's own GitHub OAuth. This fork adds a third option: reuse the token the `gh` CLI already holds.

Tick **Use the GitHub CLI (gh) for authentication** in the extension's preferences, then make sure `gh` has the scopes the extension needs:

```sh
gh auth refresh --hostname github.com -s notifications,read:project,project,read:org,read:user
```

`gh`'s default scopes don't include `notifications` or `read:project`, so the notifications and projects commands fail until you run that.

The token is read fresh on each command launch, so re-authenticating with `gh` takes effect immediately — no rebuild.

## Credit

`extensions/github` is derived from the GitHub extension in [raycast/extensions](https://github.com/raycast/extensions), MIT licensed — see [`extensions/github/LICENSE`](extensions/github/LICENSE). `extensions/skills` is MIT licensed, and previously lived at [alecharmon/raycast-skills](https://github.com/alecharmon/raycast-skills).
