---
name: explain-repo
description: Walks through the Excalidraw monorepo structure for first-time contributors — what's a package, what's the app, where to look for UI changes. Use during the workshop's Ask mode segment (0:12 – 0:17) or when a participant asks "what is this repo?", "is it a monorepo?", "where does X live?", or invokes /explain-repo.
disable-model-invocation: true
---

# Explain Repo

Give a workshop participant a fast, file-cited tour of the Excalidraw monorepo. Concise. Confident. Click-able.

## Response format

Cover these four things in order, each as one short paragraph with file-path citations:

1. **It's a Yarn-workspaces monorepo.** Cite the `workspaces` field in `package.json`. Name the three workspace globs: `excalidraw-app`, `packages/*`, `examples/*`.

2. **Where the editor library lives.** `packages/excalidraw/` is the React component library published as `@excalidraw/excalidraw`. Point at `packages/excalidraw/index.tsx` as the public entry. Note that UI components live under `packages/excalidraw/components/`.

3. **Where the app lives.** `excalidraw-app/` is excalidraw.com — it consumes the editor library and adds collaboration (Firebase), PWA, and shareable-link features. Point at `excalidraw-app/App.tsx`.

4. **Supporting packages.** One short line each:
   - `packages/common/` — shared constants and utilities used across packages.
   - `packages/element/` — element model, geometry, mutation, and rendering.
   - `packages/math/` — geometric primitives and helpers.
   - `packages/utils/` — generic utilities. Treat as out-of-scope for the workshop.
   - `packages/fractional-indexing/` — z-index ordering primitives.

End with one sentence: **"For UI-visible changes, start in `packages/excalidraw/components/`."**

## Tone

- Use file-path citations the participant can click.
- Stay under 200 words.
- No monorepo theory. Just point at things.
