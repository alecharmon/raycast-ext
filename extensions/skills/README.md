# Skills

A Raycast extension for keeping agent skills in an Obsidian vault — search them, paste them into an agent, import them from GitHub, and install them onto any machine.

Skills are plain markdown notes with `name` / `description` frontmatter (the [Agent Skills](https://code.claude.com/docs/en/skills) format), so the vault stays readable and editable without this extension.

## Commands

| Command | What it does |
| --- | --- |
| **Skills** | Search your skills, most recently used first, and paste or copy one into an agent. |
| **Import Skill** | Paste a GitHub repo, a URL, or raw text. Repos are fetched verbatim; URLs and text are turned into a skill by Raycast AI. |
| **Update Skills** | Re-fetch every repo you've imported. |

### Actions in the list

- **⏎ Paste** / **⌘C Copy** the skill body
- **⌘I Install for Agents** — writes `<Agent Skills Directory>/<name>/SKILL.md`
- **⌘⇧I Copy Install Command** — a self-contained shell command carrying the whole skill, so you can paste it into an SSH session and have the skill land on the remote machine
- **⌘R Rename**, **⌃X Remove**, **Open in Obsidian**

## Preferences

- **Skills Folder** — the vault folder holding your notes (default `~/Obsidian/Agent Memory/Skills`)
- **Agent Skills Directory** — where Install writes (default `~/.claude/skills`)

## How imports stay yours

Imported skills carry `source`, `repo`, and `repoPath` in their frontmatter. That's the only bookkeeping — there's no database.

- **Rename** an imported skill and Update keeps your name, writing to your file rather than recreating the original.
- **Remove** one and it's tombstoned in a `.removed` dotfile inside that repo's folder, so Update skips it while still refreshing its siblings.
- Delete a repo's folder entirely and Update forgets it.

Installed skills are written with just `name`, `description`, and the body — vault bookkeeping is stripped.

## Development

```sh
npm install
npm run dev      # load into Raycast
npm run build
npx tsx src/skills.test.ts    # frontmatter parsing
npx tsx src/install.test.ts   # install command survives a real shell round-trip
npx tsx src/ai.test.ts        # import routing (repo vs URL vs text)
npx tsx src/github.test.ts    # hits GitHub; set GITHUB_TOKEN to avoid rate limits
```
