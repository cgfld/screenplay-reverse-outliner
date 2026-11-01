import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import express from "express";
import { createApp } from "./app";
const app = createApp();
const dist = path.resolve("dist");
if (fs.existsSync(path.join(dist, "index.html"))) {
  app.use(express.static(dist));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(dist, "index.html")),
  );
}
const port = Number(process.env.PORT) || 3001;
app.listen(port, "127.0.0.1", () =>
  console.log(`Reverse Outliner server: http://127.0.0.1:${port}`),
);
