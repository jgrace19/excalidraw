# Architecture

High-level mental model of how the Excalidraw editor works at runtime. This is
the canonical source of truth referenced by `.cursor/rules/*` and `.cursor/skills/*`.
For package layout and dev commands see `CLAUDE.md` and `AGENTS.md`.

Keep this file high-level. Link to canonical files instead of transcribing them —
implementation files like `App.tsx` and `delta.ts` change often.

## The scene model

Editor state is three separate things; almost every feature touches one of them:

- **`ExcalidrawElement`** — the shapes on the canvas. Immutable and **versioned**
  (`version`, `versionNonce`, `updated`). Defined in `packages/element/src/types.ts`.
- **`AppState`** — transient editor/UI state: current tool, selection, zoom, scroll,
  theme, open dialogs, etc. Defined in `packages/excalidraw/types.ts`.
- **`BinaryFiles`** — image/file blobs, kept separate from elements.

Elements are owned by the **Scene** (`packages/element/src/Scene.ts`), which holds the
element map and a scene nonce. Never mutate an element object in place — go through
`mutateElement` / `newElement` (`packages/element/src/`), which bump the version and
nonce so rendering and history notice the change.

## Store & history (undo/redo)

`packages/element/src/store.ts` and `delta.ts` snapshot elements + appState and compute
diffs (deltas/increments). `packages/excalidraw/history.ts` builds undo/redo on top.

This is why **every action returns a `CaptureUpdateAction`**:

- `IMMEDIATELY` — capture this change as its own undoable step.
- `EVENTUALLY` — batch it into the next capture (e.g. view toggles, ephemeral edits).
- `NEVER` — not undoable.

If you change elements or appState and undo behaves wrong, the `captureUpdate` value is
usually the cause.

## Rendering (two canvases)

Rendering is split across two stacked canvases, coordinated by
`packages/excalidraw/scene/Renderer.ts` (renders are throttled and keyed off a `canvasNonce`):

- **Static scene** — committed elements. See `renderer/staticScene.ts`.
- **Interactive scene** — selection box, transform handles, snap lines, collaborator
  cursors. See `renderer/interactiveScene.ts`.

When adding something visual, decide which canvas it belongs to. SVG/PNG export has its
own path in `scene/export.ts` and `renderer/staticSvgScene.ts`.

## The command layer (actions)

User-triggerable behavior (toolbar buttons, shortcuts, menu/context-menu items) is
implemented as **actions** in `packages/excalidraw/actions/`, registered via `register(...)`
and run through `actions/manager.tsx`. An action's `perform` returns the next
`{ elements?, appState?, captureUpdate }`. To add one, use the `add-editor-action` skill.

## Navigating `App.tsx`

`packages/excalidraw/components/App.tsx` is a very large (~13k line) component that owns
editor state and most pointer/keyboard event handling. Do not read it top to bottom —
search for the relevant handler (`onPointerDown`, `onKeyDown`, `handleCanvasPointerMove`,
etc.) or the state field you care about.

## Package layering

Dependencies flow one direction:

```
math  →  common  →  element  →  excalidraw  →  excalidraw-app
```

Where new code belongs:

- **`@excalidraw/math`** — pure geometry (points, vectors, curves, angles).
- **`@excalidraw/common`** — shared constants, keys, colors, generic utilities.
- **`@excalidraw/element`** — element/shape data, mutation, bounds, binding, the Store.
- **`@excalidraw/excalidraw`** — the editor: React UI, actions, rendering, scene.
- **`excalidraw-app/`** — app glue: persistence, collaboration, sharing, routing.

`@excalidraw/utils` is a shared utility surface relied on broadly — treat as off-limits
for feature work (see `.cursor/rules/workshop-safe-paths.mdc`).

## Data & persistence (handle with care)

`packages/excalidraw/data/` covers restore, reconcile, encryption, and local storage;
the app's `excalidraw-app/collab/` and `excalidraw-app/data/` handle live collaboration
and Firebase storage. Much of this overlaps the off-limits paths in
`.cursor/rules/workshop-safe-paths.mdc` — prefer a different approach before touching it.
