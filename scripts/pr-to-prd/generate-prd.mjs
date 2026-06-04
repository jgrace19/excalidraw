#!/usr/bin/env node
// Drafts a PRD for the current PR and posts it to a Notion parent page.
// Designed to run inside a GitHub Action on `pull_request: opened`.
// Uses the Cursor SDK cloud runtime so the agent inherits the Notion MCP
// connection from the calling user/team's Cursor dashboard plugins.

import { Agent, CursorAgentError } from "@cursor/sdk";

const requiredEnv = [
  "CURSOR_API_KEY",
  "GITHUB_REPOSITORY",
  "NOTION_PARENT_PAGE_ID",
  "PR_NUMBER",
  "PR_TITLE",
  "PR_URL",
  "BASE_REF",
  "HEAD_REF",
  "BASE_SHA",
  "HEAD_SHA",
];

const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const {
  CURSOR_API_KEY,
  GITHUB_REPOSITORY,
  NOTION_PARENT_PAGE_ID,
  PR_NUMBER,
  PR_TITLE,
  PR_BODY,
  PR_URL,
  BASE_REF,
  HEAD_REF,
  BASE_SHA,
  HEAD_SHA,
  CURSOR_MODEL_ID,
} = process.env;

const prompt = [
  `You are a product manager drafting a short PRD for an Excalidraw pull request.`,
  ``,
  `Repository: ${GITHUB_REPOSITORY}`,
  `Pull request #${PR_NUMBER}: ${PR_TITLE}`,
  `URL: ${PR_URL}`,
  `Base branch: ${BASE_REF} (${BASE_SHA})`,
  `Head branch: ${HEAD_REF} (${HEAD_SHA})`,
  ``,
  `Author-supplied PR description:`,
  PR_BODY?.trim() ? PR_BODY : "(no description provided)",
  ``,
  `Steps:`,
  `1. Run \`git fetch origin ${BASE_SHA} ${HEAD_SHA}\` if needed, then \`git diff ${BASE_SHA}...${HEAD_SHA} --stat\` to`,
  `   get an overview, followed by \`git diff ${BASE_SHA}...${HEAD_SHA}\` (paginate as needed) to read the change.`,
  `2. Read whichever source files give you the context you need to describe the user-visible behavior. Skip`,
  `   generated files, lockfiles, and snapshot updates.`,
  `3. Draft a PRD with these sections, in this order:`,
  `   - Feature title (short, user-facing)`,
  `   - Problem (1-2 sentences on what user pain or product gap this addresses)`,
  `   - Solution (1-3 sentences on how the PR addresses it)`,
  `   - User-visible behavior (bulleted list of what someone using Excalidraw will notice)`,
  `   - Implementation notes (bulleted list of files/areas touched, grouped logically)`,
  `   - Risks and open questions (bulleted list - call out anything that needs review)`,
  `4. Using the Notion MCP, create a new sub-page under the Notion parent page with ID`,
  `   ${NOTION_PARENT_PAGE_ID}.`,
  `   - Page title: "PR #${PR_NUMBER}: <feature title you chose>"`,
  `   - Body content: the PRD sections above, formatted with Notion H2 headings and bulleted lists.`,
  `   - Include a callout or bookmark block at the top linking to ${PR_URL}.`,
  `5. Report the URL of the Notion page you created as the final line of your response, prefixed with`,
  `   "NOTION_PAGE_URL: ".`,
  ``,
  `Keep the whole PRD under ~400 words. This is a draft for a human PM to refine, not a final spec.`,
].join("\n");

const model = CURSOR_MODEL_ID ?? "composer-2.5";

console.log(`[pr-to-prd] Launching cloud agent for PR #${PR_NUMBER} (${HEAD_SHA.slice(0, 7)})`);

try {
  const result = await Agent.prompt(prompt, {
    apiKey: CURSOR_API_KEY,
    model: { id: model },
    cloud: {
      repos: [{ repository: GITHUB_REPOSITORY, ref: HEAD_SHA }],
    },
    skipReviewerRequest: true,
  });

  console.log(`[pr-to-prd] Agent finished. id=${result.id} status=${result.status}`);
  console.log("---");
  console.log(result.result ?? "(no textual result)");
  console.log("---");

  if (result.status !== "finished") {
    console.error(`[pr-to-prd] Agent did not complete successfully (status=${result.status}).`);
    process.exit(2);
  }
} catch (err) {
  if (err instanceof CursorAgentError) {
    console.error(`[pr-to-prd] Agent failed to start: ${err.message} retryable=${err.isRetryable}`);
    process.exit(1);
  }
  throw err;
}
