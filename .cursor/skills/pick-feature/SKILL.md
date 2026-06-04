---
name: pick-feature
description: Helps a workshop participant choose a small UI-visible feature to build during segment 6 (the 19-minute build window). Surfaces the curated starter list and tailors a suggestion based on the participant's experience and any idea they already have. Use when a participant says "help me pick a feature", "what should I build?", or invokes /pick-feature.
disable-model-invocation: true
---

# Pick Feature

Help a workshop participant land on one feature they can finish, demo, and ship as a PR in ~15 minutes of build time.

## Workflow

1. Ask two short questions:
   - "How much time have you spent in Cursor before today?" (first time / occasional / daily)
   - "Do you already have an idea of what you want to build?"

2. If the participant has an idea:
   - Check it against the `workshop-safe-paths` rule. If it touches a forbidden path, say so and offer the closest alternative from the curated list below.
   - Estimate the scope. If it's likely more than 15 minutes, propose a smaller variant (e.g. "instead of a full new shape tool, just add a new color to the stroke palette").
   - Confirm the pick and point at the right area of the codebase to start.

3. If the participant has no idea:
   - Surface the curated list below.
   - Recommend by experience: **Easy** for first-time users, **Medium** for occasional, **Hard** only for daily Cursor users who explicitly want a stretch.
   - Confirm the pick and point at the right area of the codebase.

   Important: do not recommend the **Hard** option as a default. The star feature is included for participants who specifically ask for "add a new shape" — it lets them ship the intent without touching the element model.

Keep the whole exchange under 4 turns. The build clock is running.

## Curated feature list

| Feature | Difficulty | Where to start |
|---|---|---|
| Add a new color to the stroke palette | Easy | `packages/excalidraw/components/ColorPicker/` |
| Change the default stroke width | Easy | `packages/excalidraw/appState.ts` (search for `currentItemStrokeWidth`) |
| Modify the welcome screen copy | Easy | Strings live in `packages/excalidraw/locales/en.json` under `welcomeScreen.defaults.*`. The component reading them is `packages/excalidraw/components/welcome-screen/WelcomeScreen.Center.tsx`. |
| Add a "Random color" button to the color picker | Medium | `packages/excalidraw/components/ColorPicker/` — add a button whose `onClick` picks from the existing palette and updates `currentItemStrokeColor` (or `currentItemBackgroundColor`) on appState. |
| Show a live element count in the footer | Medium | `packages/excalidraw/components/footer/FooterCenter.tsx`. The footer is a render tunnel — read elements from the editor's context (`useExcalidrawElements`-style hook in this repo) and render a count. |
| Add a keyboard shortcut to toggle dark mode | Medium | `packages/excalidraw/components/DarkModeToggle.tsx` for the toggle, `packages/excalidraw/actions/shortcuts.ts` to register the key combo, and the keyboard handler in `components/App.tsx`. |
| Expose shadow presets in the command palette | Medium | The shadow action already exists at `packages/excalidraw/actions/actionProperties.tsx` (`actionChangeShadow`). Wrap it as `CommandPaletteItem` entries in `packages/excalidraw/components/CommandPalette/defaultCommandPaletteItems.ts` — one entry per value (None / Small / Medium / Large). The existing `toggleTheme` entry in that file is the pattern to copy. |
| Add a "Star" button that drops a star on the canvas as grouped line elements | Hard | New action under `packages/excalidraw/actions/`. Programmatically creates ~5 line elements arranged as a star and groups them. Do **not** add a new primitive element type — that's a multi-day task touching the element model, hit-testing, exports, and snapshots. |

## Constraints

- The selected feature must produce a UI-visible change. Demos should be obvious to the room, not require code reading.
- Respect `workshop-safe-paths`. Do not suggest anything in `excalidraw-app/firebase/`, `.github/workflows/`, `packages/utils/`, or files containing secrets.
- Avoid features that require new dependencies, schema migrations, or coordinating changes across more than two files.

## Tone

- Decisive. Pick one feature and move on.
- Don't list everything — recommend, then ask "go with this?"
