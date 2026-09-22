import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createIssueMessage,
  createPrMergedMessage,
  createPrMergedUpdate,
  createPrMessage,
  decodeIssueDeleteValue,
  decodeWatcherUserIds,
  encodeIssueDeleteValue,
  encodeWatcherUserIds,
  isMessageOwner,
} from "./messages.ts";
import type { PrSubmission } from "@/models/slack-api";

function prSubmission(overrides: Partial<PrSubmission> = {}): PrSubmission {
  return {
    channel: { channelId: "C1", channelName: "dev" },
    userId: "U1",
    ticketLinks: ["https://jira/PROJ-1"],
    prUrl: "https://github.com/org/repo/pull/7",
    reviewerUserIds: ["U2", "U3"],
    watcherUserIds: [],
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

function actionsBlock(watcherUserIds: string[]) {
  return createPrMessage(prSubmission({ watcherUserIds })).blocks[1] as {
    type: string;
    elements: {
      action_id: string;
      value?: string;
      style?: string;
      confirm?: unknown;
    }[];
  };
}

test("adds exactly the Merged and Delete buttons", () => {
  const block = actionsBlock([]);

  assert.equal(block.type, "actions");
  assert.deepEqual(
    block.elements.map((element) => element.action_id),
    ["pr_merged", "pr_delete"],
  );
});

test("never mentions watchers in the posted message", () => {
  const { text, blocks } = createPrMessage(
    prSubmission({ watcherUserIds: ["U_WATCH1", "U_WATCH2"] }),
  );
  const body = (blocks[0] as { text: { text: string } }).text.text;

  assert.ok(!body.includes("U_WATCH1"), "watcher must not appear in the body");
  assert.ok(!body.includes("U_WATCH2"), "watcher must not appear in the body");
  assert.ok(!text.includes("U_WATCH1"), "watcher must not appear in the fallback text");
  assert.ok(!body.includes("Watcher"), "no watcher field should be rendered");
});

test("carries the watchers on the Merged button instead", () => {
  const [merged] = actionsBlock(["U_WATCH1", "U_WATCH2"]).elements;

  assert.equal(merged.value, "U_WATCH1,U_WATCH2");
});

test("leaves the Merged button without a value when nobody is watching", () => {
  const [merged] = actionsBlock([]).elements;

  assert.equal(merged.value, undefined);
});

test("guards Delete behind a confirmation dialog", () => {
  const [, remove] = actionsBlock([]).elements;

  assert.equal(remove.style, "danger");
  assert.ok(remove.confirm, "Delete must ask before destroying the thread");
});

test("mentions every watcher in the merged thread reply", () => {
  const { text, blocks } = createPrMergedMessage(["U_W1", "U_W2"], "U_MERGER");
  const body = (blocks[0] as { text: { text: string } }).text.text;

  assert.match(body, /\*Merged\* โดย <@U_MERGER>/);
  assert.match(body, /<@U_W1>, <@U_W2>/);
  assert.match(text, /<@U_W1>, <@U_W2>/);
});

test("omits the merger when Slack did not say who clicked", () => {
  const body = (
    createPrMergedMessage(["U_W1"], undefined).blocks[0] as {
      text: { text: string };
    }
  ).text.text;

  assert.equal(body, "*Merged*\n<@U_W1>");
});

test("round-trips watcher ids through the button value", () => {
  const userIds = ["U012ABCDEF", "U345GHIJKL"];

  assert.equal(encodeWatcherUserIds(userIds), "U012ABCDEF,U345GHIJKL");
  assert.deepEqual(decodeWatcherUserIds(encodeWatcherUserIds(userIds)), userIds);
});

test("omits the button value entirely when there are no watchers", () => {
  // Slack rejects an empty string value, so it has to be absent rather than "".
  assert.equal(encodeWatcherUserIds([]), undefined);
  assert.deepEqual(decodeWatcherUserIds(undefined), []);
});

test("decodes defensively around stray separators and spacing", () => {
  assert.deepEqual(decodeWatcherUserIds(" U1 , ,U2, "), ["U1", "U2"]);
  assert.deepEqual(decodeWatcherUserIds(""), []);
});

test("stays inside Slack's 2000 char button value cap for a big channel", () => {
  const userIds = Array.from({ length: 166 }, (_, i) => `U${String(i).padStart(10, "0")}`);

  assert.ok(
    (encodeWatcherUserIds(userIds) ?? "").length <= 2000,
    "166 watchers should still fit",
  );
});

test("only the owner may delete", () => {
  assert.equal(isMessageOwner("U_OWNER", "U_OWNER"), true);
  assert.equal(isMessageOwner("U_OWNER", "U_SOMEONE_ELSE"), false);
});

test("nobody may delete when the owner id is missing or unknown", () => {
  // Fail closed rather than letting an unattributed message be deleted by anyone.
  assert.equal(isMessageOwner(undefined, "U_OWNER"), false);
  assert.equal(isMessageOwner("", "U_OWNER"), false);
  assert.equal(isMessageOwner("U_OWNER", undefined), false);
  assert.equal(isMessageOwner(undefined, undefined), false);
});

test("the Delete button carries the owner id", () => {
  const [, remove] = actionsBlock([]).elements;

  assert.equal(remove.value, "U1");
});

function mergedBlocks(mergedBy: string | undefined = "U_MERGER") {
  const posted = createPrMessage(prSubmission({ watcherUserIds: ["U_W1"] }));

  return createPrMergedUpdate(posted, mergedBy).blocks as {
    type: string;
    block_id?: string;
    elements?: { action_id?: string; value?: string; text?: { text: string } }[];
  }[];
}

test("removes the Merged button so it cannot be clicked twice", () => {
  const actions = mergedBlocks().find((block) => block.block_id === "pr_actions");

  assert.deepEqual(
    actions?.elements?.map((element) => element.action_id),
    ["pr_delete"],
    "only Delete should remain",
  );
});

test("keeps Delete working after a merge by preserving its owner value", () => {
  const actions = mergedBlocks().find((block) => block.block_id === "pr_actions");

  assert.equal(actions?.elements?.[0].value, "U1");
});

test("leaves a merged marker naming who merged it", () => {
  const marker = mergedBlocks().find(
    (block) => block.block_id === "pr_merged_marker",
  );

  assert.equal(marker?.type, "context");
  assert.match(
    (marker?.elements?.[0] as unknown as { text: string }).text,
    /:white_check_mark: \*Merged\* โดย <@U_MERGER>/,
  );
});

test("keeps the original PR details visible after merging", () => {
  const body = (mergedBlocks()[0] as unknown as { text: { text: string } }).text.text;

  assert.match(body, /\*Owner PR:\* <@U1>/);
  assert.match(body, /\*PR:\* https:\/\/github\.com\/org\/repo\/pull\/7/);
});

test("marks the fallback text as merged too", () => {
  const posted = createPrMessage(prSubmission());

  assert.equal(
    createPrMergedUpdate(posted, "U_MERGER").text,
    `${posted.text} · Merged`,
  );
});

test("still produces a marker when Slack sends no blocks back", () => {
  const { blocks, text } = createPrMergedUpdate({}, "U_MERGER");

  assert.equal(text, "Merged");
  assert.deepEqual(
    blocks.map((block) => (block as { block_id?: string }).block_id),
    ["pr_merged_marker"],
  );
});

function issueActions(issueId: string, userId: string | undefined) {
  const message = createIssueMessage(
    {
      channel: { channelId: "C1", channelName: "dev" },
      userId,
      problem: "build พัง",
      blocking: "deploy ไม่ได้",
      askUserIds: ["U_ASK"],
      need: "ช่วยดู CI",
      minutes: 15,
      createdDate: "2026-09-22",
      timezone: "Asia/Bangkok",
    },
    issueId,
  );

  return {
    message,
    actions: message.blocks[1] as {
      type: string;
      block_id?: string;
      elements: { action_id: string; value?: string; style?: string; confirm?: unknown }[];
    },
  };
}

test("round-trips the issue owner and row id through the button value", () => {
  const value = encodeIssueDeleteValue("U_OWNER", "ISSUE_DOC_ID");

  assert.equal(value, "U_OWNER:ISSUE_DOC_ID");
  assert.deepEqual(decodeIssueDeleteValue(value), {
    ownerUserId: "U_OWNER",
    issueId: "ISSUE_DOC_ID",
  });
});

test("refuses to encode or decode a half-filled issue delete value", () => {
  assert.equal(encodeIssueDeleteValue(undefined, "ISSUE_DOC_ID"), undefined);
  assert.equal(encodeIssueDeleteValue("U_OWNER", ""), undefined);
  assert.equal(decodeIssueDeleteValue(undefined), null);
  assert.equal(decodeIssueDeleteValue(""), null);
  assert.equal(decodeIssueDeleteValue("U_OWNER"), null);
  assert.equal(decodeIssueDeleteValue(":ISSUE_DOC_ID"), null);
  assert.equal(decodeIssueDeleteValue("U_OWNER:"), null);
});

test("gives the issue message a single confirmed Delete button", () => {
  const { actions } = issueActions("ISSUE_DOC_ID", "U_OWNER");

  assert.equal(actions.type, "actions");
  assert.equal(actions.block_id, "issue_actions");
  assert.deepEqual(
    actions.elements.map((element) => element.action_id),
    ["issue_delete"],
  );
  assert.equal(actions.elements[0].style, "danger");
  assert.ok(actions.elements[0].confirm, "deleting a stored row must be confirmed");
});

test("carries both ids so the row can be found and the click authorised", () => {
  const { actions } = issueActions("ROW123", "U_OWNER");
  const target = decodeIssueDeleteValue(actions.elements[0].value);

  assert.equal(target?.issueId, "ROW123");
  assert.equal(isMessageOwner(target?.ownerUserId, "U_OWNER"), true);
  assert.equal(isMessageOwner(target?.ownerUserId, "U_ASK"), false);
});

test("leaves the issue Delete button inert when the owner is unknown", () => {
  const { actions } = issueActions("ROW123", undefined);

  assert.equal(actions.elements[0].value, undefined);
  assert.equal(decodeIssueDeleteValue(actions.elements[0].value), null);
});

test("keeps the existing issue details untouched", () => {
  const body = (issueActions("ISSUE_DOC_ID", "U_OWNER").message.blocks[0] as unknown as { text: { text: string } }).text.text;

  assert.match(body, /\*Owner issue:\* <@U_OWNER>/);
  assert.match(body, /\*Problem:\* build พัง/);
  assert.match(body, /\*Ask:\* <@U_ASK>/);
});
