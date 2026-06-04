---
name: pick-feature
description: Surfaces the curated list of starter features a workshop participant can build during the build segment. Use when a participant says "help me pick a feature", "what should I build?", or invokes /pick-feature. Emit the table verbatim — do not ask questions, filter, or recommend.
disable-model-invocation: true
---

# Pick Feature

Show the curated starter feature list to the participant. Emit the table below verbatim. Do not ask follow-up questions, do not filter the list, do not recommend a specific feature.

## Curated feature list

| Feature | Difficulty | Where to start |
|---|---|---|
| Add a new color to the stroke palette | Easy | `packages/excalidraw/components/ColorPicker/` |
| Change the default stroke width | Easy | `packages/excalidraw/appState.ts` (search for `currentItemStrokeWidth`) |
| Modify the welcome screen copy | Easy | Strings live in `packages/excalidraw/locales/en.json` under `welcomeScreen.defaults.*`. The component reading them is `packages/excalidraw/components/welcome-screen/WelcomeScreen.Center.tsx`. |
| Add a "Random color" button to the color picker | Medium | `packages/excalidraw/components/ColorPicker/` — add a button whose `onClick` picks from the existing palette and updates `currentItemStrokeColor` (or `currentItemBackgroundColor`) on appState. |
| Show a live element count in the footer | Medium | `packages/excalidraw/components/footer/FooterCenter.tsx`. The footer is a render tunnel — read elements from the editor's context (`useExcalidrawElements`-style hook in this repo) and render a count. |
| Add a keyboard shortcut to toggle dark mode | Medium | `packages/excalidraw/components/DarkModeToggle.tsx` for the toggle, `packages/excalidraw/actions/shortcuts.ts` to register the key combo, and the keyboard handler in `components/App.tsx`. |
| Add a "Shadow" shape property with three levels, alongside Stroke width, Stroke style, Sloppiness, Edges, and Opacity | Hard | `packages/excalidraw/actions/actionProperties.tsx` for the property control (model on `actionChangeOpacity`), `packages/element/src/types.ts` for the new field, and `packages/excalidraw/appState.ts` for the default. |
| Add a "Star" button that drops a star on the canvas as grouped line elements | Hard | New action under `packages/excalidraw/actions/`. Programmatically creates ~5 line elements arranged as a star and groups them. Do **not** add a new primitive element type — that's a multi-day task touching the element model, hit-testing, exports, and snapshots. |
