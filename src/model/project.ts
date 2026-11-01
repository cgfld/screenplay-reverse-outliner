import { z } from "zod";
export const emotionSchema = z.object({
  character: z.string().max(120),
  involvement: z.enum(["present", "involved"]),
  before: z.string().max(3000),
  after: z.string().max(3000),
  change: z.string().max(5000),
});
export const analysisSchema = z.object({
  summary: z.string().max(15000),
  purpose: z.string().max(10000),
  conflict: z.string().max(10000),
  turningPoint: z.string().max(10000),
  emotions: z.array(emotionSchema).max(200),
});
export type Analysis = z.infer<typeof analysisSchema>;
export const sceneSchema = z.object({
  id: z.string().min(1).max(100),
  heading: z.string().max(1000),
  location: z.string().max(1000),
  time: z.string().max(200),
  characters: z.array(z.string().max(120)).max(200),
  sourceText: z.string().max(150000),
  sourceStart: z.number().int().nonnegative(),
  sourceEnd: z.number().int().nonnegative(),
  dialogue: z
    .array(z.object({ character: z.string(), text: z.string() }))
    .max(5000),
  analysis: analysisSchema,
  notes: z.string().max(20000),
  analyzed: z.boolean(),
});
export type Scene = z.infer<typeof sceneSchema>;
export const projectSchema = z
  .object({
    version: z.literal(1),
    id: z.string().min(1).max(100),
    title: z.string().max(200),
    createdAt: z.string(),
    updatedAt: z.string(),
    source: z.object({
      name: z.string().max(500),
      format: z.enum(["txt", "fdx", "pdf", "manual"]),
      text: z.string().max(2000000),
    }),
    scenes: z.array(sceneSchema).max(2000),
  })
  .superRefine((p, ctx) => {
    if (new Set(p.scenes.map((s) => s.id)).size !== p.scenes.length)
      ctx.addIssue({ code: "custom", message: "Scene IDs must be unique" });
  });
export type Project = z.infer<typeof projectSchema>;
export const emptyAnalysis = (): Analysis => ({
  summary: "",
  purpose: "",
  conflict: "",
  turningPoint: "",
  emotions: [],
});
export function newScene(): Scene {
  return {
    id: crypto.randomUUID(),
    heading: "UNTITLED SCENE",
    location: "",
    time: "",
    characters: [],
    sourceText: "",
    sourceStart: 0,
    sourceEnd: 0,
    dialogue: [],
    analysis: emptyAnalysis(),
    notes: "",
    analyzed: false,
  };
}
export function makeProject(title = "Untitled project"): Project {
  const now = new Date().toISOString();
  return {
    version: 1,
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    source: { name: "", format: "manual", text: "" },
    scenes: [],
  };
}
export function charactersOf(project: Project): string[] {
  return [
    ...new Set(
      project.scenes.flatMap((s) => [
        ...s.characters,
        ...s.analysis.emotions.map((e) => e.character),
      ]),
    ),
  ]
    .filter(Boolean)
    .sort();
}
export function sceneHasCharacter(s: Scene, name: string) {
  return (
    s.characters.includes(name) ||
    s.analysis.emotions.some((e) => e.character === name)
  );
}
export function reorderScenes(scenes: Scene[], from: string, to: string) {
  const a = scenes.findIndex((s) => s.id === from),
    b = scenes.findIndex((s) => s.id === to);
  if (a < 0 || b < 0 || a === b) return scenes;
  const copy = [...scenes];
  const [scene] = copy.splice(a, 1);
  copy.splice(b, 0, scene);
  return copy;
}
export function renameCharacter(
  project: Project,
  oldName: string,
  newName: string,
): Project {
  return {
    ...project,
    scenes: project.scenes.map((s) => ({
      ...s,
      characters: [
        ...new Set(s.characters.map((n) => (n === oldName ? newName : n))),
      ],
      analysis: {
        ...s.analysis,
        emotions: s.analysis.emotions.map((e) => ({
          ...e,
          character: e.character === oldName ? newName : e.character,
        })),
      },
    })),
  };
}
