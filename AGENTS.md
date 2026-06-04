# AGENTS.md

## Project overview

Excalidraw is a Yarn workspaces monorepo. The main development target is the excalidraw.com web app in `excalidraw-app/`, which consumes packages from `packages/*` via Vite source aliases (no package pre-build needed for dev).

See `CLAUDE.md` for architecture and standard dev commands.

## Cursor Cloud specific instructions

### Running the dev app

```bash
yarn start
```

- Vite dev server runs on **port 3001** (see `.env.development`, `VITE_APP_PORT=3001`).
- Docs and Docker sometimes mention port 3000; that applies to Docker Compose / production preview, not local `yarn start`.
- Vite opens the browser automatically. In headless/cloud VMs, pass `--host 0.0.0.0` if you need external access: `yarn start -- --host 0.0.0.0`.
- No pre-build of packages is required for dev; Vite aliases resolve directly to `packages/*/src`.

### Optional services (not needed for core editor work)

| Service | Port | Notes |
|---------|------|-------|
| excalidraw-room (collaboration) | 3002 | Separate repo; only needed for live collab |
| Excalidraw+ app | 3000 | Plus integration hooks |
| AI backend | 3016 | AI / TTD features |
| dev-docs (Docusaurus) | 3003 | `cd dev-docs && yarn start` |

Workshop UI changes only require `yarn start`. Collaboration, share links, and AI use optional external services configured in `.env.development`.

### Lint, test, and typecheck

```bash
yarn test:typecheck   # tsc
yarn test:code        # eslint
yarn test             # vitest (jsdom, no running services)
yarn test:all         # typecheck + lint + prettier + tests
yarn fix              # auto-format + lint fix
```

Pre-commit hook (`.husky/pre-commit`) has lint-staged commented out, so commits are not blocked by lint.

### Workshop constraints

See `.cursor/rules/workshop-safe-paths.mdc` for paths that are off-limits during the workshop (firebase, data, utils, CI workflows, secrets).

### Git / PR workflow

- Push branches only to your fork (`origin`), not to `jgrace19/excalidraw` or upstream.
- Open PRs against `jgrace19/excalidraw` base `master`.
- Branch naming: `workshop/<handle>-<short-feature>` (see `.cursor/rules/workshop-branch-naming.mdc`).
