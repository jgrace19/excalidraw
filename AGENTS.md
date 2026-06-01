# AGENTS.md

## Cursor Cloud specific instructions

### Monorepo overview

Excalidraw is a Yarn v1 workspaces monorepo (`packageManager`: `yarn@1.22.22`). Primary surfaces:

| Surface | Path | Purpose |
|--------|------|---------|
| Web app (excalidraw.com) | `excalidraw-app/` | Full Vite dev app — main local dev target |
| Library | `packages/excalidraw/` (+ `common`, `element`, `math`, `utils`) | `@excalidraw/excalidraw` npm package |
| Examples | `examples/*` | Integration samples |

Node **>= 18** (CI uses 20.x). No `.nvmrc`; the VM typically has Node 22 + Yarn 1.22.

### Required service for UI development

Only one long-lived process is needed for normal editor work:

- **Vite dev server**: `yarn start` from repo root (alias for `excalidraw-app` → `vite`)
- **URL**: `http://localhost:3001` — port comes from root `.env.development` (`VITE_APP_PORT=3001`), not the Vite default 3000.

Optional (not in this repo): [excalidraw-room](https://github.com/excalidraw/excalidraw-room) on port 3002 for local collaboration, AI backend on 3016, etc. The app runs without them; share/collab/AI may use remote dev endpoints from `.env.development`.

### Commands (see also `CLAUDE.md`)

| Task | Command |
|------|---------|
| Install deps | `yarn install` (or `yarn install --frozen-lockfile` in CI-like setups) |
| Dev server | `yarn start` |
| Typecheck | `yarn test:typecheck` |
| ESLint | `yarn test:code` |
| Prettier check | `yarn test:other` |
| Unit tests | `yarn test:app --watch=false` (CI uses this) |
| Full gate | `yarn test:all` |
| Fix lint/format | `yarn fix` |

### Starting the dev server in Cloud Agent VMs

Use **tmux** for anything that outlives a single shell invocation (Vite, watchers):

```bash
SESSION_NAME="excalidraw-dev"
tmux -f /exec-daemon/tmux.portal.conf has-session -t "=$SESSION_NAME" 2>/dev/null \
  || tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c /workspace -- "${SHELL:-bash}" -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" 'yarn start' C-m
```

Wait for readiness: `curl -sf http://localhost:3001/`

### Non-obvious notes

- **Vitest** runs from the repo root (`vitest.config.mts`); no separate test server.
- **Firebase config** warnings in tests (`Error JSON parsing firebase config`) are expected when env vars are unset; tests still pass.
- **Husky** installs on `yarn install` via the `prepare` script; pre-commit runs `lint-staged` (currently commented in `.husky/pre-commit` — hook file exists but may not run staged lint unless uncommented).
- **Package builds** (`yarn build:packages`) are only required for `yarn start:example` or publishing; `yarn start` for the main app does not require a separate package build step in dev.
- **dev-docs** (`dev-docs/`) is a separate Docusaurus project with its own `yarn.lock`; not part of root workspaces.
