import assert from "node:assert/strict";
import { test } from "node:test";
import { createPrMessage } from "./messages.ts";
import type { PrSubmission } from "@/models/slack-api";

function prSubmission(overrides: Partial<PrSubmission> = {}): PrSubmission {
  return {
    channel: { channelId: "C1", channelName: "dev" },
    userId: "U1",
    ticketLinks: ["https://jira/PROJ-1"],
    prUrl: "https://github.com/org/repo/pull/7",
    reviewerUserIds: ["U2", "U3"],
    ...overrides,
  };
}

test("mentions the owner and every reviewer", () => {
  const { text, blocks } = createPrMessage(prSubmission());
  const body = (blocks[0] as { text: { text: string } }).text.text;

  assert.match(body, /\*Owner PR:\* <@U1>/);
  assert.match(body, /\*Reviewer:\* <@U2>, <@U3>/);
  assert.match(text, /https:\/\/github\.com\/org\/repo\/pull\/7/);
});

test("posts the PR URL bare so Slack can autolink and unfurl it", () => {
  const body = (createPrMessage(prSubmission()).blocks[0] as { text: { text: string } }).text.text;

  assert.match(body, /\*PR:\* https:\/\/github\.com\/org\/repo\/pull\/7\n/);
});

test("posts a GitLab or Azure PR URL unchanged", () => {
  for (const prUrl of [
    "https://gitlab.com/group/project/-/merge_requests/42",
    "https://dev.azure.com/org/project/_git/repo/pullrequest/42",
  ]) {
    const body = (
      createPrMessage(prSubmission({ prUrl })).blocks[0] as { text: { text: string } }
    ).text.text;

    assert.ok(body.includes(prUrl), `${prUrl} should appear verbatim`);
  }
});

test("lists multiple tickets as bullets and a single one inline", () => {
  const one = (createPrMessage(prSubmission()).blocks[0] as { text: { text: string } }).text.text;
  assert.match(one, /\*Ticket:\* https:\/\/jira\/PROJ-1\n/);

  const many = (
    createPrMessage(prSubmission({ ticketLinks: ["a", "b"] })).blocks[0] as {
      text: { text: string };
    }
  ).text.text;
  assert.match(many, /\*Ticket:\* \n• a\n• b\n/);
});

test("falls back to - when no ticket was given", () => {
  const body = (
    createPrMessage(prSubmission({ ticketLinks: [] })).blocks[0] as {
      text: { text: string };
    }
  ).text.text;

  assert.match(body, /\*Ticket:\* -/);
});

test("escapes ticket text so it cannot forge mentions or links", () => {
  const body = (
    createPrMessage(
      prSubmission({ ticketLinks: ["<@U999> <https://evil.com|click> & more"] }),
    ).blocks[0] as { text: { text: string } }
  ).text.text;

  assert.ok(!body.includes("<@U999>"), "raw mention must not survive");
  assert.ok(!body.includes("<https://evil.com|click>"), "raw link must not survive");
  assert.match(body, /&lt;@U999&gt;/);
  assert.match(body, /&amp; more/);
});

test("handles no reviewers without producing an empty field", () => {
  const { blocks } = createPrMessage(prSubmission({ reviewerUserIds: [] }));
  const body = (blocks[0] as { text: { text: string } }).text.text;

  assert.match(body, /\*Reviewer:\* -/);
});

const TOOLING_URL =
  "https://toolings.co/company/2/projects/387?bust=undefined&memberIds=213&selectedTicketId=113263";

function ticketText(ticketLinks: string[]) {
  return (
    createPrMessage(prSubmission({ ticketLinks })).blocks[0] as {
      text: { text: string };
    }
  ).text.text;
}

test("turns [label](url) into a Slack hyperlink", () => {
  const body = ticketText([`[FE (Mobile) : Interface stock](${TOOLING_URL})`]);

  assert.match(body, /<https:\/\/toolings\.co\/company\/2\/projects\/387\?/);
  assert.match(body, /\|FE \(Mobile\) : Interface stock>/);
});

test("escapes ampersands in the link URL so Slack keeps the query string", () => {
  const body = ticketText([`[ticket](${TOOLING_URL})`]);

  assert.ok(!/[^m]&(?!amp;)/.test(body), "raw & must be escaped as &amp;");
  assert.match(body, /bust=undefined&amp;memberIds=213/);
});

test("hyperlinks each entry when several are given", () => {
  const body = ticketText([
    "[one](https://toolings.co/a)",
    "[two](https://toolings.co/b)",
  ]);

  assert.match(body, /• <https:\/\/toolings\.co\/a\|one>/);
  assert.match(body, /• <https:\/\/toolings\.co\/b\|two>/);
});

test("leaves plain text and bare URLs alone for Slack to autolink", () => {
  assert.match(ticketText(["PROJ-123 needs backport"]), /PROJ-123 needs backport/);
  assert.match(ticketText(["https://toolings.co/a"]), /\*Ticket:\* https:\/\/toolings\.co\/a/);
});

test("refuses to build a link from a non-http scheme", () => {
  for (const hostile of [
    "[click](javascript:alert(1))",
    "[click](data:text/html,<script>)",
    "[click](slack://channel?id=C1)",
  ]) {
    const body = ticketText([hostile]);
    assert.ok(!body.includes("|click>"), `${hostile} must not become a link`);
  }
});

test("escapes a label that tries to close the link early", () => {
  const body = ticketText(["[a>b <@U999>](https://toolings.co/a)"]);

  assert.ok(!body.includes("<@U999>"), "raw mention must not survive");
  assert.match(body, /\|a&gt;b &lt;@U999&gt;>/);
});
