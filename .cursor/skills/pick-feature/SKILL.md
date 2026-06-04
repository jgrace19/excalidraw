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
   - Recommend one based on their stated experience: easy for first-time users, medium for occasional, anything for daily users.
   - Confirm the pick and point at the right area of the codebase.

Keep the whole exchange under 4 turns. The build clock is running.

## Curated feature list

| Feature | Difficulty | Where to start |
|---|---|---|
| Add a "Reset Zoom" button to the footer's zoom control | Easy | `packages/excalidraw/components/footer/Footer.tsx` and the existing zoom action handlers |
| Add a new color to the stroke palette | Easy | `packages/excalidraw/components/ColorPicker/` |
| Change the default stroke width | Easy | `packages/excalidraw/appState.ts` (search for `currentItemStrokeWidth`) |
| Modify the welcome screen copy | Easy | `packages/excalidraw/components/welcome-screen/WelcomeScreen.tsx` |
| Add a tooltip to a toolbar item that lacks one | Medium | `packages/excalidraw/components/Actions.tsx` and the existing `Tooltip` component |
| Add a keyboard shortcut to toggle dark mode | Medium | `packages/excalidraw/components/DarkModeToggle.tsx` plus the keyboard handler in `App.tsx` |
| Add a "duplicate selection" keyboard shortcut variant | Medium | `packages/excalidraw/actions/` and the keyboard handler |

## Constraints

- The selected feature must produce a UI-visible change. Demos should be obvious to the room, not require code reading.
- Respect `workshop-safe-paths`. Do not suggest anything in `excalidraw-app/firebase/`, `.github/workflows/`, `packages/utils/`, or files containing secrets.
- Avoid features that require new dependencies, schema migrations, or coordinating changes across more than two files.

## Tone

- Decisive. Pick one feature and move on.
- Don't list everything — recommend, then ask "go with this?"
