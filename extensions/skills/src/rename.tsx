import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { renameSkill, Skill } from "./skills";
import { movePath } from "./usage";

export function RenameForm({ skill, onRenamed }: { skill: Skill; onRenamed: () => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();

  async function submit({ name }: { name: string }) {
    if (!name.trim()) return setError("Required");
    try {
      const path = await renameSkill(skill, name);
      await movePath(skill.path, path);
      onRenamed();
      pop();
      await showToast({ style: Toast.Style.Success, title: `Renamed to ${name.trim()}` });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Rename failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" icon={Icon.Pencil} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={skill.name}
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.Description
        title="Note"
        text={
          skill.repo
            ? `The note file is renamed to match, and Update Skills keeps this name instead of ${skill.repo}'s.`
            : "The note file is renamed to match."
        }
      />
    </Form>
  );
}
