---
name: create-feature-prd
description: Create a Confluence product requirements document (PRD) page for a feature using the standard Atlassian Product Requirements template. Use when the user asks to write a PRD, product spec, feature requirements doc, or "one-pager" in Confluence. Runs a clarifying-questions loop until the feature is fully specified, then fills every template section and publishes the page via the Atlassian MCP.
---

# Create a feature PRD in Confluence

Turn a feature idea into a complete Confluence PRD that follows the Atlassian
**Product Requirements** template. The core job is two-fold:

1. **Interrogate the feature** — never write a vague PRD. Run a clarifying-questions
   loop until each section can be filled with real content. Genuinely-unresolved
   items go in **Open questions**, not into hand-waved body text.
2. **Fill every section** of the template exactly, then publish the page.

## Canonical template

- Template: Atlassian "Product requirements" template.
- Reference page: site `fe-anysphere-demo.atlassian.net`, page id `136445954`.
- Section order (do not reorder, do not drop sections):
  1. **Product overview** (metadata table): Target date, Document status, Team members, Designs, Loom demo, Work tracker
  2. 🎯 **Objective**
  3. 📊 **Success metrics** (Goal / Metric table)
  4. 🤔 **Assumptions**
  5. 🌟 **Milestones**
  6. 📝 **Requirements** (Requirement / User Story / Importance / Jira Issue / Notes table)
  7. ⚠️ **Out of Scope**
  8. 🎨 **Design**
  9. ❓ **Open questions** (Question / Answer / Date Answered table)
  10. 🗃️ **Reference Links**

The full HTML skeleton, per-section question bank, and formatting cheatsheet are in
[reference.md](reference.md). Read it before drafting body content.

## Workflow

Copy this checklist and track progress:

```
PRD progress:
- [ ] 1. Resolve target site + space
- [ ] 2. Capture the feature + run clarifying-questions loop until clear
- [ ] 3. Draft content for every section (mark unknowns as Open questions)
- [ ] 4. Build the Confluence HTML body
- [ ] 5. Create/publish the page
- [ ] 6. Confirm and return the page URL
```

### Step 1 — Resolve target site + space

- Call `getAccessibleAtlassianResources` to list granted sites. If more than one,
  ask the user which site (cloudId) to publish to. Use the returned cloudId for
  every subsequent call.
- Ask the user for the target **space** and **parent page** (or have them paste a
  link). Use `getConfluenceSpaces` / `getPagesInConfluenceSpace` to resolve
  `spaceId` and `parentId` if needed.

### Step 2 — Capture the feature, then ask until it's clear

Start from whatever the user gave you. Then close gaps with the question bank in
[reference.md](reference.md). Rules for the loop:

- Use the `AskQuestion` tool for structured choices; ask open-ended questions in
  chat. Batch related questions instead of one at a time.
- Prioritize the blockers first. **The PRD is "clear enough" only when all of these
  are known:**
  - the problem and the primary user/persona,
  - at least one Objective tied to a goal,
  - at least one Success metric **with a baseline and a target** (a metric with no
    number is not a metric),
  - the core functional Requirements, each with an importance (HIGH/MEDIUM/LOW),
  - explicit scope boundaries (what is and isn't included).
- Re-ask on anything still vague. Stop the loop after roughly 2–3 focused rounds;
  anything still unresolved becomes a row in **Open questions** rather than blocking
  forever. Tell the user which items you're deferring there.
- Do **not** invent metrics, dates, owners, or Jira keys. If unknown, leave a clear
  placeholder or an Open question.

### Step 3 — Draft each section

Map the answers onto the template using the per-section guidance in
[reference.md](reference.md). Every section gets real content or an honest
placeholder — never delete a section. Notably:

- **Requirements**: one row per requirement. Phrase the user story as
  "As a <persona>, I want <capability> so that <benefit>." Importance is a status
  lozenge: HIGH (red), MEDIUM (yellow), LOW (neutral).
- **Success metrics**: each row is a Goal paired with a measurable Metric (baseline → target).
- **Open questions**: every deferred/ambiguous item from Step 2 lands here.

### Step 4 — Build the HTML body

Produce a single HTML string for `contentFormat: "html"` using the skeleton in
[reference.md](reference.md). Use Confluence-specific elements:

- Document status / importance lozenges: `<span data-type="status" data-color="...">LABEL</span>`
- Target dates / answered dates: `<time datetime="YYYY-MM-DD">label</time>`
- Team-member mentions: resolve names with `lookupJiraAccountId`, then
  `<span data-type="mention" data-user-id="ACCOUNT_ID">@Name</span>`
- Figma / Loom / doc links: `<a href="URL" data-card-appearance="inline">label</a>`

### Step 5 — Create/publish the page

Page title format: `PRD: <Feature name>`.

- **If a page-creation tool (e.g. `createConfluencePage`) is available**, call it with
  the resolved `cloudId`, `spaceId`, optional `parentId`, the title, `body`, and
  `contentFormat: "html"`. Create as a draft unless the user wants it published.
- **If only `updateConfluencePage` is available** (the case for this MCP), it can only
  write to an existing page. Ask the user to create a blank page in the target space
  (Confluence → Create → blank, optionally from the Product Requirements template) and
  paste its URL or id. Then call `updateConfluencePage` with that `pageId`, the title,
  and the HTML body to populate it.

Set **Document status** to `DRAFT` (neutral lozenge) unless the user says otherwise.

### Step 6 — Confirm

Return the page URL. Summarize what you filled in and explicitly list any Open
questions still outstanding so the user knows what to resolve next.

## Anti-patterns

- Writing the PRD before the feature is clear — always run the loop first.
- Fabricating metrics, dates, owners, or Jira keys.
- Dropping or reordering template sections.
- Looping forever — defer the unresolved to Open questions and move on.
