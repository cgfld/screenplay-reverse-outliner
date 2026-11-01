import { describe, it, expect } from "vitest";
import { parseText, parseFdx, headingInfo } from "../src/parsing/parser";
import { demoProject } from "../src/demo";
describe("screenplay parsing", () => {
  it("extracts boundaries, locations, time, dialogue, canonical characters and preserves source", () => {
    const source =
      "TITLE\n\n1 INT. CAFE - DAY 1\nRain hits the glass.\n\nALICE (V.O.)\nWe should go.\n\nBOB\nNot yet.\n\n2 EXT. ROAD - NIGHT 2\nA bus stops.\n";
    const p = parseText(source);
    expect(p.scenes).toHaveLength(2);
    expect(p.scenes[0]).toMatchObject({
      heading: "INT. CAFE - DAY",
      location: "CAFE",
      time: "DAY",
      characters: ["ALICE", "BOB"],
    });
    expect(p.scenes[0].dialogue).toEqual([
      { character: "ALICE", text: "We should go." },
      { character: "BOB", text: "Not yet." },
    ]);
    for (const s of p.scenes)
      expect(source.slice(s.sourceStart, s.sourceEnd).trimEnd()).toBe(
        s.sourceText,
      );
    expect(p.source.text).toBe(source);
  });
  it("supports mixed interior/exterior, lowercase headings, and no trailing newline", () => {
    expect(headingInfo("INT./EXT. CAR - MOVING - NIGHT")).toMatchObject({
      location: "CAR",
      time: "MOVING - NIGHT",
    });
    const p = parseText(
      "int. room - day\nSomeone waits.\n\nEXT. GARDEN - DUSK\nStillness.",
    );
    expect(p.scenes).toHaveLength(2);
    expect(p.scenes[1].sourceText).toContain("Stillness.");
  });
  it("rejects empty text and missing scene boundaries", () => {
    expect(() => parseText("")).toThrow("empty");
    expect(() => parseText("just prose")).toThrow("No scene headings");
  });
  it("uses FDX paragraph types, styled spans, and repeated dialogue speakers", () => {
    const p = parseFdx(
      `<FinalDraft><Content><Paragraph Type="Scene Heading"><Text>INT. ROOM - NIGHT</Text></Paragraph><Paragraph Type="Character"><Text>ALICE</Text></Paragraph><Paragraph Type="Dialogue"><Text>Hello </Text><Text Style="Bold">there.</Text></Paragraph><Paragraph Type="Character"><Text>BOB</Text></Paragraph><Paragraph Type="Dialogue"><Text>Hi.</Text></Paragraph><Paragraph Type="Character"><Text>ALICE (CONT'D)</Text></Paragraph><Paragraph Type="Dialogue"><Text>Again.</Text></Paragraph><Paragraph Type="Scene Heading"><Text>EXT. ROAD - DAY</Text></Paragraph><Paragraph Type="Action"><Text>A &amp; B</Text></Paragraph></Content></FinalDraft>`,
    );
    expect(p.scenes).toHaveLength(2);
    expect(p.scenes[0].characters).toEqual(["ALICE", "BOB"]);
    expect(p.scenes[0].dialogue).toEqual([
      { character: "ALICE", text: "Hello there." },
      { character: "BOB", text: "Hi." },
      { character: "ALICE", text: "Again." },
    ]);
    expect(p.scenes[1].sourceText).toContain("A & B");
    expect(p.scenes[0].sourceText).not.toContain("EXT. ROAD");
  });
  it("rejects invalid and entity-bearing XML", () => {
    expect(() => parseFdx("<bad>")).toThrow();
    expect(() => parseFdx("<!DOCTYPE x><FinalDraft/>")).toThrow(
      "external entities",
    );
  });
  it("sample is a genuine parsed editable project", () => {
    const p = demoProject();
    expect(p.scenes).toHaveLength(3);
    expect(p.scenes[0].characters).toEqual(["ELI", "MARA"]);
    expect(p.scenes.every((s) => s.analyzed)).toBe(true);
  });
});
