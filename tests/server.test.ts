import { it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../server/app";
import { emptyAnalysis } from "../src/model/project";
afterEach(() => vi.unstubAllEnvs());
const body = {
  title: "Test",
  scene: {
    heading: "INT. ROOM - DAY",
    sourceText: "A person waits.",
    characters: [],
  },
  context: [],
};
it("reports configuration without exposing the server key", async () => {
  vi.stubEnv("OPENAI_API_KEY", "secret-test");
  const res = await request(createApp()).get("/api/health");
  expect(res.status).toBe(200);
  expect(res.body.configured).toBe(true);
  expect(JSON.stringify(res.body)).not.toContain("secret-test");
});
it("validates input before calling the provider", async () => {
  const fn = vi.fn();
  const res = await request(createApp(fn)).post("/api/analyze").send({});
  expect(res.status).toBe(400);
  expect(fn).not.toHaveBeenCalled();
});
it("returns an actionable error without a key", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  const res = await request(createApp()).post("/api/analyze").send(body);
  expect(res.status).toBe(503);
  expect(res.body.error).toContain("OPENAI_API_KEY");
});
it("returns actual provider analysis through the server boundary", async () => {
  const analysis = { ...emptyAnalysis(), summary: "A person waits for news." };
  const res = await request(createApp(vi.fn().mockResolvedValue(analysis)))
    .post("/api/analyze")
    .send(body);
  expect(res.status).toBe(200);
  expect(res.body).toEqual(analysis);
});
it("rejects remote origins and hides provider exception details", async () => {
  const app = createApp(vi.fn().mockRejectedValue(new Error("secret-test")));
  expect(
    (
      await request(app)
        .post("/api/analyze")
        .set("Origin", "https://evil.example")
        .send(body)
    ).status,
  ).toBe(403);
  const res = await request(app).post("/api/analyze").send(body);
  expect(res.status).toBe(502);
  expect(res.body.error).not.toContain("secret-test");
});
