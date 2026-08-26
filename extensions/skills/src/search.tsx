import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  getPreferenceValues,
  open,
  showToast,
  Toast,
  trash,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { basename, dirname } from "path";
import { markRemoved } from "./github";
import { installCommand, installLocally } from "./install";
import { RenameForm } from "./rename";
import { loadSkills, Skill } from "./skills";
import { byRecency, loadUsage, touch } from "./usage";

interface Prefs {
  skillsFolder: string;
  agentSkillsDir: string;
}

async function remove(skill: Skill) {
  const fromRepo = skill.repo && skill.repoPath;
  const confirmed = await confirmAlert({
    title: `Remove “${skill.name}”?`,
    message: fromRepo
      ? `Moves the note to the trash and stops Update Skills from re-fetching it from ${skill.repo}. Other skills from that repo are untouched.`
      : "Moves the note to the trash.",
    icon: Icon.Trash,
    primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;

  await trash(skill.path);
  // Tombstone the single skill, not the repo — the next update keeps its siblings.
  if (fromRepo) await markRemoved(dirname(skill.path), skill.repoPath as string);
  await showToast({ style: Toast.Style.Success, title: `Removed ${skill.name}` });
}

export default function Command() {
  const { skillsFolder, agentSkillsDir } = getPreferenceValues<Prefs>();
  const { data, isLoading, error, revalidate } = usePromise(
    async (folder: string) => byRecency(await loadSkills(folder), await loadUsage()),
    [skillsFolder],
  );

  // Record the use, then re-sort so the skill floats to the top next time.
  const used = (skill: Skill) => touch(skill.path).then(revalidate);

  async function install(skill: Skill) {
    try {
      const path = await installLocally(skill, agentSkillsDir);
      await used(skill);
      await showToast({ style: Toast.Style.Success, title: "Installed", message: path });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Install failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Can't read skills folder", message: error.message });
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search skills…">
      <List.EmptyView title="No skills found" description={`Add .md notes to ${skillsFolder}`} icon={Icon.Book} />
      {data?.map((skill) => (
        <List.Item
          key={skill.path}
          title={skill.name}
          keywords={[skill.description, skill.source]}
          detail={
            <List.Item.Detail
              // Body only — rendering the frontmatter turns `---` into a giant setext heading.
              markdown={`## ${skill.name}\n\n${skill.body}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Description" text={skill.description} />
                  <List.Item.Detail.Metadata.Separator />
                  {skill.repo ? (
                    <List.Item.Detail.Metadata.Link
                      title="Source"
                      text={skill.repo}
                      target={`https://github.com/${skill.repo}`}
                    />
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Source" text={skill.source} />
                  )}
                  <List.Item.Detail.Metadata.Label title="Note" text={basename(skill.path)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Paste title="Paste Skill" content={skill.body} onPaste={() => used(skill)} />
              <Action.CopyToClipboard title="Copy Skill" content={skill.body} onCopy={() => used(skill)} />
              <ActionPanel.Section title="Install">
                <Action
                  title="Install for Agents"
                  icon={Icon.Download}
                  shortcut={{ macOS: { modifiers: ["cmd"], key: "i" }, Windows: { modifiers: ["ctrl"], key: "i" } }}
                  onAction={() => install(skill)}
                />
                <Action.CopyToClipboard
                  title="Copy Install Command"
                  icon={Icon.Terminal}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "i" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "i" },
                  }}
                  content={installCommand(skill, agentSkillsDir)}
                  onCopy={() => used(skill)}
                />
              </ActionPanel.Section>
              <Action
                title="Open in Obsidian"
                icon={Icon.Document}
                onAction={() => open(`obsidian://open?path=${encodeURIComponent(skill.path)}`)}
              />
              <Action.Push
                title="Rename Skill"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                target={<RenameForm skill={skill} onRenamed={revalidate} />}
              />
              <Action.CopyToClipboard title="Copy Path" content={skill.path} />
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action
                title="Remove Skill"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => remove(skill).then(revalidate)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
