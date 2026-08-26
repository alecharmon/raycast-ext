import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { importRepo, knownRepos } from "./github";

export default async function Command() {
  const { skillsFolder } = getPreferenceValues<{ skillsFolder: string }>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating skills…" });

  const repos = await knownRepos(skillsFolder);
  if (repos.length === 0) {
    toast.style = Toast.Style.Failure;
    toast.title = "No imported repos yet";
    toast.message = "Run Import Skills first";
    return;
  }

  const results = await Promise.allSettled(repos.map((r) => importRepo(r, skillsFolder)));
  const ok = results.filter((r) => r.status === "fulfilled");
  const values = ok.map((r) => (r as PromiseFulfilledResult<{ count: number; skipped: number }>).value);
  const total = values.reduce((n, v) => n + v.count, 0);
  const skipped = values.reduce((n, v) => n + v.skipped, 0);
  const failed = results.length - ok.length;

  toast.style = failed ? Toast.Style.Failure : Toast.Style.Success;
  toast.title = `Updated ${total} skills from ${ok.length} repos`;
  toast.message = [
    failed && `${failed} repo(s) failed`,
    skipped && `${skipped} removed skill(s) skipped`,
    !failed && repos.join(", "),
  ]
    .filter(Boolean)
    .join(" · ");
}
