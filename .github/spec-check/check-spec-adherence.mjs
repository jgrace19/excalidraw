// Spec-adherence check for pull requests.
//
// Flow:
//   1. Extract a ticket name from the PR branch (and title as a fallback).
//   2. Find a Confluence page that contains that same ticket name.
//        - If none exists, the check SKIPS (exit 0).
//   3. Use the Cursor SDK to judge whether the PR diff adheres to that spec.
//        - Adheres  -> exit 0
//        - Violates -> exit 1
//
// All credentials come from the environment (GitHub Actions secrets). When they
// are absent (e.g. on forks), the check skips gracefully instead of failing.

import { Agent, CursorAgentError } from "@cursor/sdk";
import { execSync } from "node:child_process";
import fs from "node:fs";

const {
  CURSOR_API_KEY,
  CONFLUENCE_BASE_URL,
  CONFLUENCE_EMAIL,
  CONFLUENCE_API_TOKEN,
  GITHUB_HEAD_REF = "",
  GITHUB_BASE_REF = "",
  PR_TITLE = "",
  SPEC_TICKET = "",
  CURSOR_MODEL = "composer-2.5",
  MAX_DIFF_CHARS = "60000",
  MAX_SPEC_CHARS = "40000",
} = process.env;

const PR_BRANCH = process.env.PR_BRANCH || GITHUB_HEAD_REF;
const REPO_ROOT = process.cwd();

// ---------- small helpers ----------

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

// ---------- 0. configuration gate ----------

if (!CURSOR_API_KEY) {
  skip("CURSOR_API_KEY is not set.");
}
if (!CONFLUENCE_BASE_URL || !CONFLUENCE_EMAIL || !CONFLUENCE_API_TOKEN) {
  skip(
    "Confluence credentials are not set (need CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN).",
  );
}

// ---------- 1. extract the ticket name ----------

function extractTicket(branch, title) {
  if (SPEC_TICKET.trim()) {
    return { ticket: SPEC_TICKET.trim(), kind: "override" };
  }

  const haystack = `${branch} ${title}`;
  // Jira-style key, e.g. ABC-123 / SHADOW-7.
  const jira = haystack.match(/[A-Z][A-Z0-9]+-\d+/);
  if (jira) {
    return { ticket: jira[0], kind: "jira-key" };
  }

  // Fallback: the feature slug after a known branch prefix, with the leading
  // handle segment dropped, hyphens turned into spaces.
  // e.g. "workshop/jgrace-shape-shadow-weight" -> "shape shadow weight".
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

// ---------- 2. find the matching Confluence spec ----------

const confluenceBase = CONFLUENCE_BASE_URL.replace(/\/+$/, "");
const authHeader =
  "Basic " +
  Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`).toString("base64");

async function confluence(path) {
  const res = await fetch(`${confluenceBase}${path}`, {
    headers: { Authorization: authHeader, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(
      `Confluence request failed: ${res.status} ${res.statusText} for ${path}`,
    );
  }
  return res.json();
}

function htmlToText(html) {
  return html
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function findSpec(ticketName) {
  // Escape double quotes for CQL.
  const q = ticketName.replace(/"/g, '\\"');
  const cql = encodeURIComponent(
    `type = page AND (title ~ "${q}" OR text ~ "${q}") ORDER BY lastmodified DESC`,
  );

  let results = [];
  try {
    const search = await confluence(`/wiki/rest/api/search?cql=${cql}&limit=10`);
    results = search.results || [];
  } catch (err) {
    // A failed search should not hard-fail the PR; treat as "no spec found".
    log(`Confluence search error: ${err.message}`);
    return null;
  }

  if (results.length === 0) {
    return null;
  }

  const needle = ticketName.toLowerCase();
  // Prefer a title match, then fall back to the first result.
  const ranked = results
    .map((r) => r.content)
    .filter(Boolean)
    .sort((a, b) => {
      const at = a.title?.toLowerCase().includes(needle) ? 0 : 1;
      const bt = b.title?.toLowerCase().includes(needle) ? 0 : 1;
      return at - bt;
    });

  for (const candidate of ranked) {
    const page = await confluence(
      `/wiki/rest/api/content/${candidate.id}?expand=body.storage`,
    );
    const bodyHtml = page.body?.storage?.value || "";
    const text = htmlToText(bodyHtml);
    const titleMatches = (page.title || "").toLowerCase().includes(needle);
    const bodyMatches = text.toLowerCase().includes(needle);

    // Confirm the ticket name really appears, to avoid loose CQL false positives.
    if (titleMatches || bodyMatches) {
      const webui = page._links?.webui ? `${confluenceBase}/wiki${page._links.webui}` : "";
      return {
        id: page.id,
        title: page.title,
        url: webui,
        text: text.slice(0, Number(MAX_SPEC_CHARS)),
      };
    }
  }

  return null;
}

const spec = await findSpec(ticket);
if (!spec) {
  skip(`No Confluence page found that contains the ticket name "${ticket}".`);
}
log(`matched spec: "${spec.title}" (${spec.url || spec.id})`);

// ---------- 3. compute the PR diff ----------

function getDiff(base) {
  if (base) {
    try {
      execSync(`git fetch --no-tags --depth=200 origin ${base}`, {
        cwd: REPO_ROOT,
        stdio: "ignore",
      });
    } catch {
      /* best effort */
    }
  }
  const ranges = base
    ? [`origin/${base}...HEAD`, `origin/${base}..HEAD`, "HEAD~1..HEAD"]
    : ["HEAD~1..HEAD"];
  for (const range of ranges) {
    try {
      const diff = execSync(`git diff --no-color ${range}`, {
        cwd: REPO_ROOT,
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 128,
      });
      if (diff.trim()) {
        return diff;
      }
    } catch {
      /* try next range */
    }
  }
  return "";
}

let diff = getDiff(GITHUB_BASE_REF);
if (!diff.trim()) {
  skip("Could not compute a non-empty diff for this PR.");
}
const maxDiff = Number(MAX_DIFF_CHARS);
let diffTruncated = false;
if (diff.length > maxDiff) {
  diff = diff.slice(0, maxDiff);
  diffTruncated = true;
}

// ---------- 4. judge adherence with the Cursor SDK ----------

const prompt = `You are a strict spec-adherence reviewer for a pull request.

A product spec (from Confluence) describes what the change should do. Decide
whether the code changes in the PR diff ADHERE to that spec. Only judge against
what the spec actually requires — do not invent new requirements, and do not
fail the PR for unrelated pre-existing issues. A PR that partially implements a
larger spec is acceptable as long as what it does is consistent with the spec
and does not contradict it. You may read files in the working directory for
extra context.

Respond with ONLY a single JSON object (no prose, no code fences) of the form:
{
  "verdict": "pass" | "fail",
  "summary": "one or two sentence explanation",
  "violations": [
    { "requirement": "the spec requirement", "issue": "how the diff violates or contradicts it" }
  ]
}
"violations" must be empty when verdict is "pass".

=== TICKET ===
${ticket}

=== SPEC: ${spec.title} ===
${spec.text}

=== PR DIFF${diffTruncated ? " (truncated)" : ""} ===
${diff}
`;

let result;
try {
  result = await Agent.prompt(prompt, {
    apiKey: CURSOR_API_KEY,
    model: { id: CURSOR_MODEL },
    local: { cwd: REPO_ROOT, settingSources: [] },
  });
} catch (err) {
  if (err instanceof CursorAgentError) {
    // Run never started (auth/config/network). Don't block the PR on infra.
    log(`startup failed: ${err.message} (retryable=${err.isRetryable})`);
    skip(`Cursor agent could not start: ${err.message}`);
  }
  throw err;
}

if (result.status === "error") {
  log(`run failed: ${result.id ?? "unknown"}`);
  skip("Cursor agent run errored before producing a verdict.");
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
    "The Cursor agent did not return a parseable JSON verdict.\n\nRaw output:\n\n```\n" +
      String(result.result ?? "").slice(0, 4000) +
      "\n```",
  );
}

const specLink = spec.url ? `[${spec.title}](${spec.url})` : spec.title;

if (verdict.verdict === "pass") {
  log(`PASS — ${verdict.summary ?? ""}`);
  summary(
    `## Spec adherence — passed\n\n` +
      `**Ticket:** \`${ticket}\`  \n**Spec:** ${specLink}\n\n${verdict.summary ?? ""}`,
  );
  process.exit(0);
}

const rows = (verdict.violations || [])
  .map((v) => `| ${(v.requirement || "").replace(/\|/g, "\\|")} | ${(v.issue || "").replace(/\|/g, "\\|")} |`)
  .join("\n");

fail(
  verdict.summary || "PR does not adhere to the spec.",
  `**Ticket:** \`${ticket}\`  \n**Spec:** ${specLink}\n\n` +
    (rows
      ? `| Requirement | Issue |\n| --- | --- |\n${rows}`
      : "No specific violations were itemized."),
);
