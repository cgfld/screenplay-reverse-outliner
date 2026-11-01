import { analysisSchema, type Project, type Scene } from "../model/project";
export async function analyzeScene(
  project: Project,
  scene: Scene,
  signal: AbortSignal,
) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      scene: {
        heading: scene.heading,
        sourceText: scene.sourceText,
        characters: scene.characters,
      },
      context: project.scenes
        .map((s) => ({ heading: s.heading, summary: s.analysis.summary }))
        .slice(0, 500),
      title: project.title,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Analysis request failed.");
  return analysisSchema.parse(data);
}
