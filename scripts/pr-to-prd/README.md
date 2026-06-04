# PR-to-PRD Notion bot

A small Cursor SDK integration that runs on `pull_request: opened`, reads the
PR diff, drafts a one-page PRD, and posts it as a sub-page under the
[Excalidraw Features](https://app.notion.com/p/Excalidraw-Features-375cf559c10f80a7885ac125e2b1b63a)
Notion page.

The agent runs on Cursor's **cloud** runtime so it inherits the Notion MCP
connection from the calling identity's Cursor dashboard plugins. No
`NOTION_TOKEN` is needed in this repo.

## How it fires

`.github/workflows/pr-to-prd.yml` triggers on `pull_request: opened`. It
installs this script's dependencies and runs `node generate-prd.mjs`, passing
PR metadata via env. The script calls `Agent.prompt(...)` on the Cursor cloud,
which clones the repo, computes the diff against the base SHA, drafts the PRD,
and creates the Notion page itself via MCP.

## Required GitHub Actions secrets

| Secret | What it is | Where to get it |
|---|---|---|
| `CURSOR_API_KEY` | A Cursor user API key whose dashboard has the Notion plugin connected with write access to the parent Notion page. | [cursor.com/dashboard/integrations](https://cursor.com/dashboard/integrations) |

That's the entire secrets footprint. Notion auth is handled inside Cursor's
backend on behalf of the API key holder — see the
[Cursor SDK MCP docs](https://cursor.com/docs/sdk/typescript#mcp-servers).

## Required Cursor dashboard setup (one-time)

1. Sign in at [cursor.com/dashboard](https://cursor.com/dashboard).
2. Install the **Notion** plugin under Integrations / Plugins.
3. During the OAuth flow, grant access to the workspace and parent page
   `375cf559c10f80a7885ac125e2b1b63a` (the Excalidraw Features page).
4. Mint a user API key from the same account and store it as
   `CURSOR_API_KEY` in this repo's Actions secrets.

For team-wide use, install the Notion plugin as a **team** plugin and use a
team service-account API key instead. See the Cursor SDK auth notes for the
trade-offs.

## Local testing

You can dry-run the script against any open PR:

```bash
cd scripts/pr-to-prd
npm install

CURSOR_API_KEY=cursor_... \
GITHUB_REPOSITORY=jgrace19/excalidraw \
NOTION_PARENT_PAGE_ID=375cf559c10f80a7885ac125e2b1b63a \
PR_NUMBER=123 \
PR_TITLE="Add reset zoom button" \
PR_BODY="Adds a button to the footer that resets zoom to 100%." \
PR_URL=https://github.com/jgrace19/excalidraw/pull/123 \
BASE_REF=master \
HEAD_REF=workshop/jgrace-reset-zoom \
BASE_SHA=$(git rev-parse origin/master) \
HEAD_SHA=$(git rev-parse HEAD) \
node generate-prd.mjs
```

Look for `NOTION_PAGE_URL: ...` as the final line of agent output.

## Known limitations on the workshop fork

GitHub Actions on `jgrace19/excalidraw` are
[explicitly out-of-scope per the workshop rules](../../.cursor/rules/workshop-safe-paths.mdc),
and the rule notes they "do not run on the workshop fork in any useful way and
produce confusing PR statuses." Two implications:

- This workflow will not auto-fire for PRs opened by participants against
  `jgrace19/excalidraw` from their own forks, because Actions on a forked-PR
  trigger don't get access to `secrets.CURSOR_API_KEY` for security reasons.
- If you want this to actually run, either (a) run it on
  `pull_request_target` (carefully — that exposes secrets to fork PRs and has
  its own security trade-offs), or (b) move the workflow to a repo where PRs
  always come from internal branches.

If you only intend this as a demo/showcase, the current setup is fine: it will
fire on PRs opened from branches *within* `jgrace19/excalidraw` (like
`workshop/*` branches the maintainer pushes directly).

## Cost and rate-limit notes

Every PR open spends Cursor cloud minutes and tokens. For a busy repo, gate
the workflow further with a label (e.g. `needs-prd`) or a path filter so it
only runs for product-shaped changes.
