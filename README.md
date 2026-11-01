# Reverse Outliner

A local screenplay study workspace built with React, TypeScript, Vite, and Tailwind CSS. An Express backend keeps the OpenAI API key off the frontend.

## Run locally

Requires Node.js 22.13+ (Node 24 recommended) and npm.

```sh
npm install
cp .env.example .env
# Optional: edit .env and set OPENAI_API_KEY for AI analysis
npm run dev
```

Open **http://127.0.0.1:5173**. Vite proxies `/api` to the backend at `127.0.0.1:3001`. Both processes start together. The sample project, script parsing, all editing, autosave, and JSON import/export work without an API key. The sample analysis is clearly an authored example, not a live API result.

For a production build served locally:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:3001**. `npm start` serves `dist/` and the API from the same Express process. `PORT` changes the backend port; if changing it in development, also update the Vite proxy in `vite.config.ts`.

## Use

1. Upload PDF, Final Draft FDX, or TXT, explore the original three-scene sample, or create a blank project.
2. Select a scene to edit its heading, location, time, summary, purpose, conflict, turning point, character associations, emotional arcs, or notes.
3. With a server API key configured, click **Analyze script** or **Analyze scene**. Confirm the scope and provider transmission. Analysis runs sequentially, saves each completed scene, and can be stopped. Reanalysis replaces that scene's analysis; Undo restores the prior version.
4. Open **Characters** and choose a character. Its storyline includes on-screen character associations and any emotional arc marked **Involved off-screen**. The horizontal timeline tracks the character's state after each scene; select a beat to edit its evidence and before/after state. Rename a character across associations and arcs with **Rename character**.
5. Drag the handle at the left edge of a scene to reorder. Handles appear on hover. Dragging is enabled in the unfiltered outline; arrow buttons in the editor provide keyboard/touch-accessible reordering in every view. Add or delete scenes; deletion is undoable.
6. Correct scene text and dialogue under **Edit scene text and dialogue**. Scene text is used for future AI analysis. Extracted dialogue is an independent editable annotation. The full uploaded original stays intact in the reference panel.
7. Edits autosave after 500 ms in this browser's local storage. Return to projects to switch between saved projects. Export JSON for portable backup; importing validates the schema and creates a separate project without overwriting an existing one.

Undo/redo uses the toolbar or Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, and Ctrl+Y. History retains the last 80 changes in the current session and resets when switching projects. Each text change and each completed AI scene is an undo step. On-screen character lists normalize on blur.

## AI configuration and privacy

Set `OPENAI_API_KEY` in `.env` on the server. `OPENAI_MODEL` defaults to `gpt-4.1-mini` and may be set to a model supporting Responses API structured outputs. Restart after changing environment variables. No key is requested, stored, or bundled by the frontend; `.env` is ignored by Git. Never use a `VITE_` prefix for a secret.

Requests use the official OpenAI SDK, Responses API structured outputs, schema validation, a 90-second provider timeout, and one retry. Only an explicit analysis action sends the selected scene's text, title, and ordered scene headings/current summaries to OpenAI. Each request analyzes one scene, including emotional changes and meaningful offscreen involvement. Requests set `store: false`; provider processing and retention policies still apply. API charges are separate from ChatGPT subscriptions. Failures show actionable errors; completed results remain editable and saved.

This MVP is **local, single-user software**. Express binds to loopback, rejects non-local browser origins, rate-limits analysis to 20 requests/minute, and enforces input/body limits. It is not an authenticated multi-user hosted service. Add authentication, user-scoped storage, CSRF protection appropriate to the deployment, quotas, and deployment-specific allowed origins before exposing the server publicly. No cloud account or database is needed for local use.

## Supported scripts and limitations

- **TXT:** recognizes standard INT., EXT., INT./EXT., I/E, and EST. headings, optional scene numbers, and character/dialogue cues. Cue detection is heuristic. Nonstandard headings and ambiguous all-caps action may need manual correction.
- **FDX:** parses Final Draft Content paragraph types, styled Text spans, character cues, dialogue, and scene headings. External entities/DTDs are rejected. Source reference is a plain-text reconstruction, not Final Draft pagination.
- **PDF:** PDF.js extracts selectable text in content order, grouping lines by vertical position. The worker is bundled locally. Scanned PDFs require OCR before upload; this MVP does not include OCR. Complex layouts/dual dialogue may need corrections. Reference shows extracted text rather than a PDF page viewer.
- Files are limited to 25 MB, PDFs to 600 pages, source text to 2 million characters, projects to 2,000 scenes. Individual AI scene text is limited to 100,000 characters. Very large requests can exceed the backend's 2 MB body limit; shorten context or split the project. Long scripts hit the rate limit and can be resumed scene by scene.
- Editing/reordering an outline never rewrites the full original source. Scene splitting is manual: add a scene, copy its text, and adjust the original working scene text.
- AI analysis is interpretive and can be wrong. All generated content is editable. No deterministic substitute is presented as AI analysis when a key is missing.
- Local storage capacity is browser-dependent (often a few MB). Save failures are shown; export JSON immediately when storage is full. Clearing browser data removes local projects. Export regularly. Undo history is not persisted.
- Short stories and novels are future adapters, not silently treated as screenplays.

## Architecture

- `src/model/`: versioned Zod project schema, pure scene/character operations, bounded undo/redo.
- `src/parsing/`: deterministic TXT/FDX parsers and browser PDF extraction. No AI dependencies.
- `src/analysis/`: typed frontend API client. No credentials.
- `server/`: validated API boundary, official provider adapter, rate limiting, static production serving.
- `src/storage/`: project library persistence, JSON validation and export.
- `src/App.tsx`: editable workspace and character storyline UI.

A future narrative-format adapter can populate the same scene model without coupling extraction to AI. AI writes analysis fields only; original source, ordering, character associations, notes, and source corrections remain owned by the editor. The `version` field provides an explicit migration boundary for future project formats.

## Validation

```sh
npm test
npm run build
```

Tests cover source boundaries, dialogue/speaker extraction, FDX spans and repeated speakers, malformed input, project JSON validation, meaningful offscreen characters, reordering, history, real editor interactions and autosave, and the backend API with an injected provider. Provider calls are mocked in tests so tests incur no API cost. A real API request requires your own key and is not claimed to have been verified without one.

API integration follows the [official structured output documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).
