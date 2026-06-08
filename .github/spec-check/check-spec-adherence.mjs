// Spec-adherence check for pull requests (cloud agent + Atlassian MCP).
//
// Flow:
//   1. Derive a ticket name from the PR branch (and title as a fallback).
//   2. Launch a Cursor **cloud** agent against the PR head commit.
//   3. The agent uses the **Atlassian MCP** (team/user plugins or cursor.com/agents
//      OAuth — no Confluence API tokens in GitHub Actions) to find a Confluence page
//      that contains the ticket name.
//        - If none exists, the agent returns verdict "skip" -> exit 0.
//   4. The agent compares the PR diff to that spec and returns pass/fail.
//
// Required secret: CURSOR_API_KEY (personal user key recommended so cloud agents
// can reuse OAuth for Atlassian MCP configured at cursor.com/agents).
// Service-account keys cannot fall back to per-user OAuth for MCP.

import { Agent, CursorAgentError } from "@cursor/sdk";
import fs from "node:fs";

const {
  CURSOR_API_KEY,
  GITHUB_SERVER_URL = "https://github.com",
  GITHUB_REPOSITORY = "",
  GITHUB_HEAD_REF = "",
  GITHUB_BASE_REF = "",
  PR_URL = "",
  PR_TITLE = "",
  SPEC_TICKET = "",
  CURSOR_MODEL = "composer-2.5",
} = process.env;

const PR_BRANCH = process.env.PR_BRANCH || GITHUB_HEAD_REF;

// ---------- helpers ----------

const log = (msg) => console.log(`spec-adherence: ${msg}`);

function summary(markdown) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (file) {
    fs.appendFileSync(file, markdown + "\n");
  }
}

function skip(reason) {
  log(`SKIP — ${reason}`);
  summary(`## Spec adherence — skipped\n\n${reason}`);
  process.exit(0);
}

function fail(title, body) {
  log(`FAIL — ${title}`);
  summary(`## Spec adherence — failed\n\n**${title}**\n\n${body}`);
  process.exit(1);
}

// ---------- configuration gate ----------

if (!CURSOR_API_KEY) {
  skip("CURSOR_API_KEY is not set.");
}
if (!GITHUB_REPOSITORY) {
  skip("GITHUB_REPOSITORY is not set (expected in GitHub Actions).");
}

if (!GITHUB_HEAD_REF && !PR_URL) {
  skip("Neither GITHUB_HEAD_REF nor PR_URL is set.");
}

const repoUrl = `${GITHUB_SERVER_URL.replace(/\/+$/, "")}/${GITHUB_REPOSITORY}`;

// ---------- ticket extraction (deterministic, done before the agent) ----------

function extractTicket(branch, title) {
  if (SPEC_TICKET.trim()) {
    return { ticket: SPEC_TICKET.trim(), kind: "override" };
  }

  const haystack = `${branch} ${title}`;
  const jira = haystack.match(/[A-Z][A-Z0-9]+-\d+/);
  if (jira) {
    return { ticket: jira[0], kind: "jira-key" };
  }

  const withoutPrefix = branch.replace(/^(workshop|feature|feat|fix|chore)\//i, "");
  const slug = withoutPrefix.includes("-")
    ? withoutPrefix.slice(withoutPrefix.indexOf("-") + 1)
    : withoutPrefix;
  const phrase = slug.replace(/[-_]+/g, " ").trim();
  if (phrase) {
    return { ticket: phrase, kind: "branch-slug" };
  }

  return { ticket: "", kind: "none" };
}

const { ticket, kind } = extractTicket(PR_BRANCH, PR_TITLE);
if (!ticket) {
  skip(`No ticket name could be derived from branch "${PR_BRANCH}".`);
}
log(`ticket="${ticket}" (source: ${kind}) from branch "${PR_BRANCH}"`);
log(
  `cloud repo=${repoUrl} branch=${GITHUB_HEAD_REF || "(via prUrl)"} pr=${PR_URL || "(none)"} base=${GITHUB_BASE_REF || "(unknown)"}`,
);

// ---------- cloud agent: discover spec via Atlassian MCP + judge adherence ----------

const prompt = `You are a strict spec-adherence reviewer for a pull request.

The repository is already cloned at the PR head commit. Use git to inspect changes
against the base branch.

## Your tasks (in order)

1. **Find the spec** using the Atlassian MCP (Confluence tools such as
   searchConfluenceUsingCql, getConfluencePage, search). Look for a Confluence
   page whose title or body contains the ticket name below. Prefer the most
   relevant product-requirements / PRD page.

2. **If no matching Confluence page exists**, stop and return verdict "skip".

3. **If a spec exists**, read it and compare the PR's code changes (git diff
   against base branch "${GITHUB_BASE_REF || "master"}") to the spec requirements.
   Only judge against what the spec actually requires — do not invent requirements
   or fail for unrelated pre-existing code. Partial implementation of a larger
   spec is acceptable when consistent and non-contradictory.

## Response format

Return ONLY a single JSON object (no prose, no markdown fences):

{
  "verdict": "pass" | "fail" | "skip",
  "summary": "one or two sentence explanation",
  "specTitle": "title of matched Confluence page, or empty if skipped",
  "specUrl": "web URL of the Confluence page if known, else empty",
  "violations": [
    { "requirement": "spec requirement", "issue": "how the PR violates it" }
  ]
}

- Use verdict "skip" when no Confluence page contains the ticket name.
- Use verdict "pass" when the PR adheres to the matched spec.
- Use verdict "fail" when the PR contradicts or clearly misses required spec items.
- "violations" must be empty when verdict is "pass" or "skip".

=== TICKET NAME ===
${ticket}

=== PR CONTEXT ===
Branch: ${PR_BRANCH}
Title: ${PR_TITLE}
Base branch: ${GITHUB_BASE_REF || "master"}
`;

let result;
try {
  result = await Agent.prompt(prompt, {
    apiKey: CURSOR_API_KEY,
    model: { id: CURSOR_MODEL },
    cloud: {
      repos: [
        {
          url: repoUrl,
          ...(PR_URL ? { prUrl: PR_URL } : { startingRef: GITHUB_HEAD_REF }),
        },
      ],
      skipReviewerRequest: true,
    },
  });
} catch (err) {
  if (err instanceof CursorAgentError) {
    log(`startup failed: ${err.message} (retryable=${err.isRetryable})`);
    skip(`Cursor cloud agent could not start: ${err.message}`);
  }
  throw err;
}

if (result.status === "error") {
  log(`run failed: ${result.id ?? "unknown"}`);
  skip("Cursor cloud agent run errored before producing a verdict.");
}

function parseVerdict(text) {
  if (!text) {
    return null;
  }
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    return null;
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

const verdict = parseVerdict(result.result);
if (!verdict || !verdict.verdict) {
  fail(
    "Could not parse a verdict from the reviewer.",
    "The Cursor cloud agent did not return a parseable JSON verdict.\n\nRaw output:\n\n```\n" +
      String(result.result ?? "").slice(0, 4000) +
      "\n```",
  );
}

const specTitle = verdict.specTitle || "";
const specUrl = verdict.specUrl || "";
const specLink = specUrl
  ? `[${specTitle || "Confluence spec"}](${specUrl})`
  : specTitle || "(not reported)";

if (verdict.verdict === "skip") {
  log(`SKIP — ${verdict.summary ?? "no matching spec"}`);
  summary(
    `## Spec adherence — skipped\n\n` +
      `**Ticket:** \`${ticket}\`\n\n${verdict.summary ?? "No Confluence page matched the ticket name."}`,
  );
  process.exit(0);
}

if (verdict.verdict === "pass") {
  log(`PASS — ${verdict.summary ?? ""}`);
  summary(
    `## Spec adherence — passed\n\n` +
      `**Ticket:** \`${ticket}\`  \n**Spec:** ${specLink}\n\n${verdict.summary ?? ""}`,
  );
  process.exit(0);
}

const rows = (verdict.violations || [])
  .map(
    (v) =>
      `| ${(v.requirement || "").replace(/\|/g, "\\|")} | ${(v.issue || "").replace(/\|/g, "\\|")} |`,
  )
  .join("\n");

fail(
  verdict.summary || "PR does not adhere to the spec.",
  `**Ticket:** \`${ticket}\`  \n**Spec:** ${specLink}\n\n` +
    (rows
      ? `| Requirement | Issue |\n| --- | --- |\n${rows}`
      : "No specific violations were itemized."),
);
