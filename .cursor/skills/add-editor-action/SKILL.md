---
name: add-editor-action
description: Add a new editor action/command to Excalidraw (toolbar button, keyboard shortcut, menu or context-menu entry) in packages/excalidraw/actions. Use when adding user-triggerable editor behavior such as a toggle, a transform, or a command.
---

# Add an editor action

Actions are the command layer for the editor. Read `ARCHITECTURE.md` → "The command
layer (actions)" and "Store & history" first if you are unfamiliar with the model.

Canonical example to copy from: `packages/excalidraw/actions/actionToggleGridMode.tsx`.

## Steps

1. **Create the action file** `packages/excalidraw/actions/action<Name>.tsx`:

```ts
import { CODES, KEYS } from "@excalidraw/common";
import { CaptureUpdateAction } from "@excalidraw/element";

import { register } from "./register";

import type { AppState } from "../types";

export const action<Name> = register({
  name: "<name>",
  label: "labels.<name>",      // i18n key — see the i18n-locales rule
  icon: <someIcon>,            // optional, from ../components/icons
  viewMode: false,
  trackEvent: { category: "canvas" },
  perform: (elements, appState) => {
    return {
      appState: { ...appState, /* changes */ },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY, // see below
    };
  },
  // optional:
  checked: (appState) => /* toggle state */,
  predicate: (elements, appState, props) => /* availability */,
  keyTest: (event) => event[KEYS.CTRL_OR_CMD] && event.code === CODES.QUOTE,
});
```

2. **Pick the right `captureUpdate`** (controls undo/redo):
   - `IMMEDIATELY` — a discrete, undoable change (most element edits).
   - `EVENTUALLY` — ephemeral/view changes batched into the next capture (toggles).
   - `NEVER` — not undoable.

3. **Register it** by re-exporting from `packages/excalidraw/actions/index.ts`.
   `register()` self-adds to the actions array on import, and `App.tsx` calls
   `actionManager.registerAll(...)`, so the export is what wires it in.

4. **Add the i18n key** to `packages/excalidraw/locales/en.json` (and only that file).

5. **Surface it in the UI** (choose what applies):
   - Keyboard shortcut: a `keyTest` makes it fire once registered — no extra wiring.
   - Toolbar/menu: render it where sibling actions render, via
     `actionManager.renderAction("<name>")` (grep for `renderAction(` for examples).
   - Context menu: add `actionManager.renderAction` / the action to the relevant
     context-menu items array.

## Verify

- `yarn test:typecheck` and `yarn test:code` (CI fails on warnings).
- Add a test next to a sibling action (e.g. `actionDuplicateSelection.test.tsx`) when
  the behavior is non-trivial.
