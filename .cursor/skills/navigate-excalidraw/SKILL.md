---
name: navigate-excalidraw
description: Orient quickly in the Excalidraw codebase — where editor state, elements, rendering, actions, and persistence live, and how to find the right file. Use when starting an editor feature, answering "where does X live", or before changing unfamiliar editor code.
---

# Navigate the Excalidraw codebase

Start from `ARCHITECTURE.md` (repo root) for the mental model. This skill is the
fast lookup for "where is X" and "how do I find it".

## Where things live

| You want to change... | Look in |
|---|---|
| A shape's data/behavior, bounds, binding | `packages/element/src/` |
| Undo/redo, snapshots, diffs | `packages/element/src/{store,delta}.ts`, `packages/excalidraw/history.ts` |
| Editor UI components | `packages/excalidraw/components/` |
| A command / shortcut / toolbar button | `packages/excalidraw/actions/` (use the `add-editor-action` skill) |
| What's drawn on canvas | `packages/excalidraw/renderer/` + `scene/Renderer.ts` |
| Editor state shape | `AppState` in `packages/excalidraw/types.ts` |
| Colors / constants / keys | `packages/common/src/` |
| Geometry math | `packages/math/src/` |
| Persistence, collab, sharing | `excalidraw-app/` (often off-limits — see workshop-safe-paths) |

## Finding code efficiently

- `App.tsx` is ~13k lines — never read it whole. Search for the handler or state field
  (`onPointerDown`, `handleCanvas...`, the appState key) instead.
- For an existing UI string, grep the text in `locales/en.json` to get its key, then grep
  the key to find usage.
- For an existing feature, grep its action `name` (e.g. `"gridMode"`) to find the action,
  its shortcut, and where it renders.
- Follow the nearest existing example rather than inventing a pattern.

## Before editing

- Check `.cursor/rules/workshop-safe-paths.mdc` — some areas (firebase, data, utils, CI)
  are off-limits.
- Respect the import, i18n, and testing rules in `.cursor/rules/`.
- Verify with `yarn test:typecheck` and `yarn test:code` when done.
