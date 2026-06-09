// Spec-adherence check for pull requests (cloud agent + Atlassian MCP).
//
// Flow:
//   1. Derive a ticket name from the PR branch (and title as a fallback).
//   2. Launch a Cursor **cloud** agent against the PR head commit.
//   3. The agent uses the **Atlassian MCP** to find a Confluence spec:
//        a. Direct page lookup if SPEC_PAGE_ID is set
//        b. CQL / Rovo search (team/global spaces)
//        c. Fallback: enumerate pages per space via getPagesInConfluenceSpace
//           and getConfluencePageDescendants (covers personal spaces CQL misses)
//        - If none exists, verdict "skip" -> exit 0.
//   4. The agent compares the PR diff to that spec and returns pass/fail.
//
// Optional env:
//   SPEC_PAGE_ID              - Confluence page id for direct lookup (e.g. 136445954)
//   CONFLUENCE_SPEC_SPACE_IDS - comma-separated space ids to scan first (e.g. 120520747)
//   CONFLUENCE_CLOUD_ID       - Atlassian cloud id; agent resolves via MCP if unset
//
// PR comment (GitHub Actions):
//   GITHUB_TOKEN, PR_NUMBER — posts or updates a single PR comment with findings

import { Agent, CursorAgentError } from "@cursor/sdk";
import fs from "node:fs";

const COMMENT_MARKER = "<!-- spec-adherence-check -->";

const {
  CURSOR_API_KEY,
  GITHUB_TOKEN = "",
  GITHUB_SERVER_URL = "https://github.com",
  GITHUB_REPOSITORY = "",
  GITHUB_HEAD_REF = "",
  GITHUB_BASE_REF = "",
  PR_URL = "",
  PR_NUMBER = "",
  PR_TITLE = "",
  SPEC_TICKET = "",
  SPEC_PAGE_ID = "",
  CONFLUENCE_SPEC_SPACE_IDS = "",
  CONFLUENCE_CLOUD_ID = "",
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

function githubApi(path, { method = "GET", body } = {}) {
  const base = `${GITHUB_SERVER_URL.replace(/\/+$/, "")}/api/v3`;
  return fetch(`${base}${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function postPrComment(markdown) {
  if (!GITHUB_TOKEN || !PR_NUMBER || !GITHUB_REPOSITORY) {
    log("PR comment skipped (GITHUB_TOKEN, PR_NUMBER, or GITHUB_REPOSITORY missing).");
    return;
  }

  const body = `${COMMENT_MARKER}\n${markdown}`;
  const issuePath = `/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments`;

  try {
    let existing;
    for (let page = 1; !existing; page += 1) {
      const listRes = await githubApi(
        `${issuePath}?per_page=100&sort=created&direction=desc&page=${page}`,
      );
      if (!listRes.ok) {
        log(`PR comment list failed: HTTP ${listRes.status}`);
        return;
      }

      const comments = await listRes.json();
      existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));
      if (existing || comments.length < 100) {
        break;
      }
    }

    if (existing) {
      const patchRes = await githubApi(
        `/repos/${GITHUB_REPOSITORY}/issues/comments/${existing.id}`,
        { method: "PATCH", body: { body } },
      );
      if (patchRes.ok) {
        log(`updated PR comment #${existing.id}`);
      } else {
        log(`PR comment update failed: HTTP ${patchRes.status}`);
      }
      return;
    }

    const createRes = await githubApi(issuePath, {
      method: "POST",
      body: { body },
    });
    if (createRes.ok) {
      const created = await createRes.json();
      log(`posted PR comment #${created.id}`);
    } else {
      log(`PR comment create failed: HTTP ${createRes.status}`);
    }
  } catch (err) {
    log(`PR comment error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function finish({ exitCode, logLine, summaryMarkdown, commentMarkdown }) {
  log(logLine);
  summary(summaryMarkdown);
  await postPrComment(commentMarkdown);
  process.exit(exitCode);
}

async function skip(reason, commentExtra = "") {
  await finish({
    exitCode: 0,
    logLine: `SKIP — ${reason}`,
    summaryMarkdown: `## Spec adherence — skipped\n\n${reason}`,
    commentMarkdown:
      `## Spec adherence — skipped\n\n${reason}` +
      (commentExtra ? `\n\n${commentExtra}` : ""),
  });
}

async function fail(title, body, commentMarkdown) {
  await finish({
    exitCode: 1,
    logLine: `FAIL — ${title}`,
    summaryMarkdown: `## Spec adherence — failed\n\n**${title}**\n\n${body}`,
    commentMarkdown: commentMarkdown ?? `## Spec adherence — failed\n\n**${title}**\n\n${body}`,
  });
}

// ---------- configuration gate ----------

if (!CURSOR_API_KEY) {
  await skip("CURSOR_API_KEY is not set.");
}
if (!GITHUB_REPOSITORY) {
  await skip("GITHUB_REPOSITORY is not set (expected in GitHub Actions).");
}
if (!GITHUB_HEAD_REF && !PR_URL) {
  await skip("Neither GITHUB_HEAD_REF nor PR_URL is set.");
}

const repoUrl = `${GITHUB_SERVER_URL.replace(/\/+$/, "")}/${GITHUB_REPOSITORY}`;

// ---------- ticket extraction (deterministic, done before the agent) ----------

function extractTicket(branch, title) {
  if (SPEC_TICKET.trim()) {
    return { ticket: SPEC_TICKET.trim(), kind: "override" };
  }

  const haystack = `${branch} ${title}`;
  const jira = haystack.match(/\b[A-Z][A-Z0-9]+-\d+\b/i);
  if (jira) {
    return { ticket: jira[0].toUpperCase(), kind: "jira-key" };
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
  await skip(`No ticket name could be derived from branch "${PR_BRANCH}".`);
}

const spaceIds = CONFLUENCE_SPEC_SPACE_IDS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

log(`ticket="${ticket}" (source: ${kind}) from branch "${PR_BRANCH}"`);
if (SPEC_PAGE_ID) {
  log(`spec page override: ${SPEC_PAGE_ID}`);
}
if (spaceIds.length) {
  log(`confluence space scan priority: ${spaceIds.join(", ")}`);
}
log(
  `cloud repo=${repoUrl} branch=${GITHUB_HEAD_REF || "(via prUrl)"} pr=${PR_URL || "(none)"} base=${GITHUB_BASE_REF || "(unknown)"}`,
);

// ---------- cloud agent: discover spec via Atlassian MCP + judge adherence ----------

function buildSpecDiscoverySection() {
  const lines = [
    "## Spec discovery (follow this order)",
    "",
    "Personal-space and some draft-origin pages are **not** returned by CQL/Rovo",
    "search even after publish. You MUST run the fallbacks below before skipping.",
    "",
  ];

  if (SPEC_PAGE_ID) {
    lines.push(
      `### 1. Direct page lookup (highest priority)`,
      `Call getConfluencePage with pageId "${SPEC_PAGE_ID}".`,
      `Use it as the spec if the title or body contains "${ticket}" (case-insensitive).`,
      ``,
    );
  }

  lines.push(
    `### ${SPEC_PAGE_ID ? "2" : "1"}. Search index`,
    `Try searchConfluenceUsingCql, e.g.:`,
    `  type = page AND (title ~ "${ticket}" OR text ~ "${ticket}") ORDER BY lastmodified DESC`,
    `Also try the Rovo search tool with query "${ticket}".`,
    `Prefer product-requirements / PRD pages.`,
    ``,
    `### ${SPEC_PAGE_ID ? "3" : "2"}. Space enumeration fallback (required if search is empty)`,
    `When CQL/Rovo return no match, enumerate pages directly:`,
    `1. Resolve cloudId via getAccessibleAtlassianResources` +
      (CONFLUENCE_CLOUD_ID ? ` (or use "${CONFLUENCE_CLOUD_ID}" directly)` : "") +
      `.`,
  );

  if (spaceIds.length) {
    lines.push(
      `2. Scan these space ids first: ${spaceIds.join(", ")}`,
      `   (from CONFLUENCE_SPEC_SPACE_IDS), then any remaining accessible spaces.`,
    );
  } else {
    lines.push(`2. Call getConfluenceSpaces and scan each accessible space.`);
  }

  lines.push(
    `3. For each space, call getPagesInConfluenceSpace(spaceId, status: "current", limit: 250).`,
    `   Pick pages whose title contains "${ticket}" (case-insensitive).`,
    `4. Also call getConfluencePageDescendants on each space homepage for nested pages`,
    `   search may miss; match titles containing "${ticket}".`,
    `5. Fetch the best match with getConfluencePage and confirm the body references the ticket`,
    `   or is clearly the PRD for this feature.`,
    ``,
    `Only return verdict "skip" after all discovery steps above fail.`,
  );

  return lines.join("\n");
}

const prompt = `You are a strict spec-adherence reviewer for a pull request.

The repository is already cloned at the PR head commit. Use git to inspect changes
against the base branch.

## Your tasks (in order)

1. **Find the spec** using the Atlassian MCP and the discovery procedure below.

2. **If no matching Confluence page exists** after all discovery steps, return verdict "skip".

3. **If a spec exists**, read it and compare the PR's code changes (git diff
   against base branch "${GITHUB_BASE_REF || "master"}") to the spec requirements.
   Only judge against what the spec actually requires — do not invent requirements
   or fail for unrelated pre-existing code. Partial implementation of a larger
   spec is acceptable when consistent and non-contradictory.

${buildSpecDiscoverySection()}

## Response format

Return ONLY a single JSON object (no prose, no markdown fences):

{
  "verdict": "pass" | "fail" | "skip",
  "summary": "one or two sentence explanation",
  "specTitle": "title of matched Confluence page, or empty if skipped",
  "specUrl": "web URL of the Confluence page if known, else empty",
  "specDiscovery": "page-id | search | space-scan | descendants",
  "violations": [
    { "requirement": "spec requirement", "issue": "how the PR violates it" }
  ]
}

- Use verdict "skip" only when every discovery step failed to find a matching page.
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
    await fail(
      "Cursor cloud agent failed to start.",
      `Cursor cloud agent could not start: ${err.message}`,
    );
  }
  throw err;
}

if (result.status === "error") {
  log(`run failed: ${result.id ?? "unknown"}`);
  await fail(
    "Cursor cloud agent run failed.",
    `Cursor cloud agent run ${result.id ?? "unknown"} errored before producing a verdict.`,
  );
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
  const raw = String(result.result ?? "").slice(0, 4000);
  await fail(
    "Could not parse a verdict from the reviewer.",
    "The Cursor cloud agent did not return a parseable JSON verdict.\n\nRaw output:\n\n```\n" +
      raw +
      "\n```",
    `## Spec adherence — failed\n\n**Could not parse a verdict from the reviewer.**\n\nThe Cursor cloud agent did not return parseable JSON.\n\n<details><summary>Raw output</summary>\n\n\`\`\`\n${raw}\n\`\`\`\n\n</details>`,
  );
}

const specTitle = verdict.specTitle || "";
const specUrl = verdict.specUrl || "";
const specLink = specUrl
  ? `[${specTitle || "Confluence spec"}](${specUrl})`
  : specTitle || "(not reported)";
const discovery = verdict.specDiscovery ? ` (via ${verdict.specDiscovery})` : "";

const ticketLine = `**Ticket:** \`${ticket}\``;
const specLine = specTitle || specUrl
  ? `**Spec:** ${specLink}${discovery}`
  : "";

function buildViolationTable(violations) {
  const rows = (violations || [])
    .map(
      (v) =>
        `| ${(v.requirement || "").replace(/\|/g, "\\|")} | ${(v.issue || "").replace(/\|/g, "\\|")} |`,
    )
    .join("\n");
  return rows
    ? `\n\n| Requirement | Issue |\n| --- | --- |\n${rows}`
    : "";
}

if (verdict.verdict === "skip") {
  const skipSummary =
    verdict.summary ??
    "No Confluence page matched the ticket name after search and space-scan fallbacks.";
  await finish({
    exitCode: 0,
    logLine: `SKIP — ${skipSummary}`,
    summaryMarkdown:
      `## Spec adherence — skipped\n\n${ticketLine}\n\n${skipSummary}`,
    commentMarkdown:
      `## Spec adherence — skipped\n\n${ticketLine}\n\n${skipSummary}`,
  });
}

if (verdict.verdict === "pass") {
  const passSummary = verdict.summary ?? "";
  await finish({
    exitCode: 0,
    logLine: `PASS — ${passSummary}${discovery}`,
    summaryMarkdown:
      `## Spec adherence — passed\n\n${ticketLine}  \n${specLine}\n\n${passSummary}`,
    commentMarkdown:
      `## Spec adherence — passed\n\n${ticketLine}  \n${specLine}\n\n${passSummary}`,
  });
}

const failSummary = verdict.summary || "PR does not adhere to the spec.";
const violationTable = buildViolationTable(verdict.violations);
const failBody =
  `${ticketLine}  \n${specLine}\n\n${failSummary}${violationTable}`;

await fail(
  failSummary,
  failBody,
  `## Spec adherence — failed\n\n${failBody}`,
);
