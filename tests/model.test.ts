import { it, expect } from "vitest";
import { demoProject } from "../src/demo";
import {
  charactersOf,
  sceneHasCharacter,
  renameCharacter,
  reorderScenes,
  projectSchema,
} from "../src/model/project";
import { record, undo, redo } from "../src/model/history";
import { importProject } from "../src/storage/projects";
it("tracks meaningful offscreen involvement and renames associations", () => {
  let p = demoProject();
  p.scenes[0].analysis.emotions.push({
    character: "CAPTAIN",
    involvement: "involved",
    before: "Lost",
    after: "Hopeful",
    change: "Sees the beam",
  });
  expect(charactersOf(p)).toContain("CAPTAIN");
  expect(sceneHasCharacter(p.scenes[0], "CAPTAIN")).toBe(true);
  p = renameCharacter(p, "MARA", "MAYA");
  expect(p.scenes[0].characters).toContain("MAYA");
  expect(p.scenes[0].analysis.emotions[0].character).toBe("MAYA");
});
it("reorders scenes without modifying source or identities", () => {
  const p = demoProject();
  const s = reorderScenes(p.scenes, p.scenes[0].id, p.scenes[2].id);
  expect(s.map((x) => x.id)).toEqual([
    p.scenes[1].id,
    p.scenes[2].id,
    p.scenes[0].id,
  ]);
  expect(p.scenes[0].sourceText).toBe(s[2].sourceText);
});
it("undo/redo restores edits and a new edit clears redo", () => {
  let h = { past: [] as number[], present: 1, future: [] as number[] };
  h = record(h, 2);
  h = record(h, 3);
  h = undo(h);
  expect(h.present).toBe(2);
  h = redo(h);
  expect(h.present).toBe(3);
  h = record(undo(h), 4);
  expect(h.future).toEqual([]);
});
it("JSON roundtrip retains all editable data but imports as a new project", () => {
  const p = demoProject();
  p.scenes[0].notes = "A note";
  const restored = importProject(JSON.stringify(p));
  expect(restored.id).not.toBe(p.id);
  expect(restored.scenes).toEqual(p.scenes);
  expect(() => importProject('{"version":7}')).toThrow("Invalid project");
});
it("rejects duplicate scene IDs and unsupported versions", () => {
  const p = demoProject();
  p.scenes[1].id = p.scenes[0].id;
  expect(projectSchema.safeParse(p).success).toBe(false);
  expect(() => importProject("bad")).toThrow();
});
