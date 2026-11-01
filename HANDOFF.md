# Resume notes

Reverse Outliner MVP is implemented locally with React, TypeScript, Vite, Tailwind, and an Express/OpenAI backend.

- PDF/FDX/TXT parsing; editable scene outlines, character storylines and emotional arcs.
- Scene reordering, autosave, undo/redo, JSON import/export, and original-script reference.
- 24 tests passed; TypeScript and production build passed; production HTTP smoke checks passed.
- Browser visual verification remains outstanding because browser automation was unavailable.
- An OpenAI key is configured in the local, ignored `.env` file. Never commit or display it.
- A live analysis test reached the provider but returned a quota/rate-limit error. Check API billing/credits before retrying summaries.
- The UI now explains why summaries are missing and prompts for analysis after upload when configured.

Run `npm install` if needed, then `npm run dev`. Open http://127.0.0.1:5173/ and reopen the saved project. Browser-local projects are not stored in Git; export JSON in the app for portable backups.

See README.md for full setup, architecture, and limitations.
