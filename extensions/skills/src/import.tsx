import {
  Action,
  ActionPanel,
  AI,
  Form,
  Icon,
  environment,
  getPreferenceValues,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { importWithAI, isUrl } from "./ai";
import { importRepo, isRepoRef } from "./github";

export default function Command() {
  const { skillsFolder } = getPreferenceValues<{ skillsFolder: string }>();
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);

  const kind = isRepoRef(source) ? "repo" : isUrl(source) ? "url" : source.trim() ? "text" : "";

  async function submit({ source }: { source: string }) {
    const input = source.trim();
    if (!input) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing to import" });
      return;
    }
    if (!isRepoRef(input) && !environment.canAccess(AI)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Raycast AI required",
        message: "Repos import without AI",
      });
      return;
    }

    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Importing…" });
    try {
      if (isRepoRef(input)) {
        const { repo, count } = await importRepo(input, skillsFolder);
        toast.title = `Imported ${count} skills`;
        toast.message = repo;
      } else {
        const path = await importWithAI(input, skillsFolder, (p) => AI.ask(p, { creativity: "low" }));
        toast.title = "Skill imported";
        toast.message = path;
        toast.primaryAction = {
          title: "Open in Obsidian",
          onAction: () => open(`obsidian://open?path=${encodeURIComponent(path)}`),
        };
      }
      toast.style = Toast.Style.Success;
      await popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Import failed";
      toast.message = e instanceof Error ? e.message : String(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" icon={Icon.Download} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="source"
        title="Source"
        placeholder="owner/repo, a URL, or paste the raw text of a skill"
        value={source}
        onChange={setSource}
      />
      <Form.Description
        title="Detected"
        text={
          {
            repo: "GitHub repo — every SKILL.md is fetched verbatim, no AI",
            url: "URL — page is fetched and rewritten into a skill by Raycast AI",
            text: "Text — rewritten into a skill by Raycast AI",
            "": "Paste anything: a repo, a link, or skill text",
          }[kind]
        }
      />
    </Form>
  );
}
