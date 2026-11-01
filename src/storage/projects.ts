import { projectSchema, type Project } from "../model/project";
const KEY = "reverse-outliner.projects.v1";
export function loadProjects(): Project[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data))
    throw new Error(
      "Saved project library is invalid. Export or recover your browser data before overwriting it.",
    );
  return data.map((p) => projectSchema.parse(p));
}
export function saveProjects(projects: Project[]) {
  localStorage.setItem(KEY, JSON.stringify(projects));
}
export function importProject(text: string): Project {
  const result = projectSchema.safeParse(JSON.parse(text));
  if (!result.success)
    throw new Error("Invalid project JSON: " + result.error.issues[0]?.message);
  return {
    ...result.data,
    id: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  };
}
export function exportProject(project: Project) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download =
    (project.title.replace(/[^a-z0-9_-]/gi, "-") || "project") + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
