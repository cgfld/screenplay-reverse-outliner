import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  makeProject,
  newScene,
  type Project,
  type Scene,
} from "../model/project";
const headingPattern =
  /^\s*(?:\d+[A-Z]?\s+)?(?:\.?INT\.?\s*\/\s*EXT\.?|\.?EXT\.?\s*\/\s*INT\.?|\.?INT\.?|\.?EXT\.?|I\/E\.?|EST\.?)\s*[-. ]\s*\S/i;
export function isHeading(line: string) {
  return headingPattern.test(line);
}
export function headingInfo(heading: string) {
  const clean = heading
    .replace(/^\s*\d+[A-Z]?\s+/, "")
    .replace(/\s+\d+[A-Z]?\s*$/, "")
    .trim();
  const parts = clean.split(/\s+[-–—]\s+/);
  return {
    heading: clean,
    location: parts[0]
      .replace(
        /^(?:\.?INT\.?\s*\/\s*EXT\.?|\.?EXT\.?\s*\/\s*INT\.?|\.?INT\.?|\.?EXT\.?|I\/E\.?|EST\.?)\s*/i,
        "",
      )
      .trim(),
    time: parts.slice(1).join(" - "),
  };
}
export function characterName(text: string) {
  return text
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*\^$/, "")
    .trim();
}
const cue = (line: string) =>
  line.length > 0 &&
  line.length < 65 &&
  line === line.toUpperCase() &&
  /[A-ZÀ-Ž]/.test(line) &&
  !isHeading(line) &&
  !/[.!?:]$/.test(line) &&
  !/^(FADE|CUT|DISSOLVE|CONTINUED|THE END|END OF|ACT |TEASER|TITLE|SUPER:|INSERT|BACK TO)/.test(
    line,
  ) &&
  !/^\d+[A-Z]?[.]?$/.test(line);
function populate(scene: Scene) {
  const lines = scene.sourceText.split("\n");
  let current = "",
    buffer: string[] = [];
  const flush = () => {
    if (current && buffer.length)
      scene.dialogue.push({
        character: current,
        text: buffer.join("\n").trim(),
      });
    buffer = [];
  };
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim(),
      next =
        lines
          .slice(i + 1)
          .find((l) => l.trim())
          ?.trim() || "";
    if (cue(line) && next && !isHeading(next) && !cue(next)) {
      flush();
      current = characterName(line);
      if (!scene.characters.includes(current)) scene.characters.push(current);
    } else if (!line) {
      flush();
      current = "";
    } else if (current) {
      buffer.push(line);
    }
  }
  flush();
}
export function parseText(text: string, name = "Screenplay.txt"): Project {
  text = text.replace(/\r\n?/g, "\n").replace(/\f/g, "\n");
  if (!text.trim()) throw new Error("The script is empty.");
  if (text.length > 2000000)
    throw new Error("Script exceeds the 2 million character limit.");
  const project = makeProject(name.replace(/\.[^.]+$/, ""));
  project.source = { name, format: "txt", text };
  const lines = text.split("\n");
  const starts: { line: number; offset: number }[] = [];
  let offset = 0;
  lines.forEach((l, i) => {
    if (isHeading(l)) starts.push({ line: i, offset });
    offset += l.length + 1;
  });
  if (!starts.length)
    throw new Error(
      "No scene headings found. Use headings such as INT. KITCHEN - DAY, or create scenes manually.",
    );
  project.scenes = starts.map((start, i) => {
    const end = starts[i + 1]?.offset ?? text.length;
    const s = {
      ...newScene(),
      ...headingInfo(lines[start.line]),
      sourceStart: start.offset,
      sourceEnd: end,
      sourceText: text.slice(start.offset, end).trimEnd(),
    };
    populate(s);
    return s;
  });
  return project;
}
function textOf(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object")
    return Object.entries(node)
      .filter(([k]) => !k.startsWith("@_"))
      .map(([, v]) => textOf(v))
      .join("");
  return "";
}
export function parseFdx(xml: string, name = "Screenplay.fdx"): Project {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("FDX files with external entities are not supported.");
  if (XMLValidator.validate(xml) !== true)
    throw new Error("This FDX file is not valid XML.");
  const doc = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: false,
    processEntities: true,
  }).parse(xml);
  const content = doc.FinalDraft?.Content;
  if (!content) throw new Error("Missing Final Draft script content.");
  const raw = content.Paragraph;
  const paragraphs = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(
    (p: any) => ({
      type: p["@_Type"] || "Action",
      text: textOf(p.Text).trim(),
    }),
  );
  const project = makeProject(name.replace(/\.[^.]+$/, ""));
  let text = "",
    scene: Scene | undefined,
    currentCharacter = "";
  for (const p of paragraphs) {
    if (p.type === "Scene Heading") {
      if (scene) {
        scene.sourceEnd = text.length;
        scene.sourceText = text.slice(scene.sourceStart).trimEnd();
      }
      currentCharacter = "";
      scene = {
        ...newScene(),
        ...headingInfo(p.text),
        sourceStart: text.length,
      };
      project.scenes.push(scene);
    }
    text += p.text + "\n\n";
    if (scene && p.type === "Character") {
      const n = characterName(p.text);
      currentCharacter = n;
      if (n && !scene.characters.includes(n)) scene.characters.push(n);
    }
    if (scene && p.type === "Dialogue") {
      const n = currentCharacter;
      if (n) scene.dialogue.push({ character: n, text: p.text });
    }
  }
  if (scene) {
    scene.sourceEnd = text.length;
    scene.sourceText = text.slice(scene.sourceStart).trimEnd();
  }
  if (!project.scenes.length)
    throw new Error("No Scene Heading paragraphs found in the FDX file.");
  project.source = { name, format: "fdx", text };
  return project;
}
