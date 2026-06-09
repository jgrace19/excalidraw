# PRD reference: question bank, section guide, HTML skeleton

## Clarifying-questions bank

Ask only what you don't already know from the user's description. Batch related
questions. The questions marked **(blocker)** must be answered before the PRD is
"clear enough"; the rest can be deferred to Open questions.

### Product overview (metadata)
- Feature name? (used for the page title `PRD: <name>`)
- Target release date? (a date or quarter; leave blank if unknown)
- Who are the team members and their roles (PM, eng lead, design)?
- Links to share: Figma designs, Loom demo, Jira epic / work tracker?
- Document status: DRAFT, IN REVIEW, or APPROVED? (default DRAFT)

### 🎯 Objective
- **(blocker)** What problem does this solve, and for whom (primary persona)?
- **(blocker)** How does it tie to a company/team goal, OKR, or strategy?
- What happens if we don't build it? Why now?

### 📊 Success metrics
- **(blocker)** What does success look like in measurable terms?
- For each goal: which metric proves it, the current baseline, and the target?
- Over what time window is success judged?

### 🤔 Assumptions
- What are we assuming about users, their behavior, or demand?
- Technical assumptions, dependencies, or platform constraints?
- Business/legal/compliance assumptions?

### 🌟 Milestones
- Key dates or phases (alpha/beta/GA)? Roadmap link?
- Any hard deadlines or external commitments?

### 📝 Requirements
- **(blocker)** What must the feature do? (functional requirements)
- Non-functional requirements: performance, accessibility, mobile/responsive,
  localization, security, analytics/telemetry?
- For each requirement: the user story and its importance (HIGH/MEDIUM/LOW)?
- Existing Jira issues to link?

### ⚠️ Out of Scope
- **(blocker)** What is explicitly NOT included in this release?
- Anything deferred to a later phase?

### 🎨 Design
- Figma links, flows, or wireframes? Any UX states (empty/loading/error) to call out?

### ❓ Open questions
- What decisions are still unresolved? Who owns each, and by when?

### 🗃️ Reference Links
- Research, customer interviews, meeting notes, related PRDs, competitor analysis?

## Per-section fill guidance

| Section | How to fill it |
| --- | --- |
| Product overview | Metadata table. Target date as `<time>`; status as a lozenge; team members as mentions; links as inline smart links. |
| Objective | 1–2 short paragraphs: the problem, the user, and the strategic tie-in. No fluff. |
| Success metrics | Intro line + Goal/Metric table. Every metric has a baseline → target. |
| Assumptions | Bulleted list grouped by user / technical / business. |
| Milestones | Bulleted list or table of phases with dates, or a roadmap link. |
| Requirements | One row per requirement: Requirement, User Story ("As a … I want … so that …"), Importance lozenge, Jira Issue, Notes. |
| Out of Scope | Bulleted list of explicit exclusions and deferred items. |
| Design | Figma/other links as inline smart links; note any flows or whiteboard. |
| Open questions | One row per unresolved item: Question, Answer (blank if open), Date Answered. |
| Reference Links | Bulleted list of supporting docs/links. |

## Lozenge colors

- Document status: `DRAFT` → neutral, `IN REVIEW` → yellow, `APPROVED` → green.
- Importance: `HIGH` → red, `MEDIUM` → yellow, `LOW` → neutral.

## HTML body skeleton

Pass this as `body` with `contentFormat: "html"`. Replace bracketed parts; keep all
sections. Drop rows you don't need but keep the table headers.

```html
<table>
  <tbody>
    <tr><th>Product overview</th><td></td></tr>
    <tr><td>📅 <strong>Target date</strong></td><td><time datetime="2026-09-30">Sep 30, 2026</time></td></tr>
    <tr><td>🟡 <strong>Document status</strong></td><td><span data-type="status" data-color="neutral">DRAFT</span></td></tr>
    <tr><td>🏃 <strong>Team members</strong></td><td><span data-type="mention" data-user-id="ACCOUNT_ID">@Name</span></td></tr>
    <tr><td>🎨 <strong>Designs</strong></td><td><a href="FIGMA_URL" data-card-appearance="inline">Figma</a></td></tr>
    <tr><td>🎥 <strong>Loom demo</strong></td><td><a href="LOOM_URL" data-card-appearance="inline">Loom</a></td></tr>
    <tr><td>🗃️ <strong>Work tracker</strong></td><td><a href="JIRA_URL" data-card-appearance="inline">Epic</a></td></tr>
  </tbody>
</table>

<h2>🎯 Objective</h2>
<p>[Problem, primary user, and strategic tie-in.]</p>

<h2>📊 Success metrics</h2>
<p>[How success is judged.]</p>
<table>
  <thead><tr><th>Goal</th><th>Metric</th></tr></thead>
  <tbody>
    <tr><td>[Goal]</td><td>[Metric: baseline → target]</td></tr>
  </tbody>
</table>

<h2>🤔 Assumptions</h2>
<ul><li>[Assumption]</li></ul>

<h2>🌟 Milestones</h2>
<ul><li>[Phase / date]</li></ul>

<h2>📝 Requirements</h2>
<table>
  <thead><tr><th>Requirement</th><th>User Story</th><th>Importance</th><th>Jira Issue</th><th>Notes</th></tr></thead>
  <tbody>
    <tr>
      <td>[Requirement]</td>
      <td>As a [persona], I want [capability] so that [benefit].</td>
      <td><span data-type="status" data-color="red">HIGH</span></td>
      <td><a href="JIRA_URL" data-card-appearance="inline">KEY-123</a></td>
      <td>[Notes]</td>
    </tr>
  </tbody>
</table>

<h2>⚠️ Out of Scope</h2>
<ul><li>[Excluded / deferred]</li></ul>

<h2>🎨 Design</h2>
<p><a href="FIGMA_URL" data-card-appearance="inline">Designs</a></p>

<h2>❓ Open questions</h2>
<table>
  <thead><tr><th>Question</th><th>Answer</th><th>Date Answered</th></tr></thead>
  <tbody>
    <tr><td>[Open question]</td><td></td><td></td></tr>
  </tbody>
</table>

<h2>🗃️ Reference Links</h2>
<ul><li><a href="URL" data-card-appearance="inline">[Reference]</a></li></ul>
```

## Notes

- HTML must follow valid ADF nesting: no block elements inside inline elements, no
  headings inside table cells. Invalid HTML is rejected with a descriptive error —
  fix and retry.
- To match the live template's exact structure at runtime, optionally re-fetch it
  with `getConfluencePage` (page id `136445954`) before drafting.
