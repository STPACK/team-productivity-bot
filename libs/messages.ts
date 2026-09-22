import type {
  DailySubmission,
  IssueSubmission,
  PrSubmission,
  SlackBlock,
} from "@/models/slack-api";

// ponytail: the watcher list rides in the Merged button's own `value` because the PR
// flow stores nothing. Slack caps that field at 2000 chars — about 166 ids — so move
// to chat.postMessage metadata if a channel ever needs more than that. Kept beside the
// button that carries it, so the encode/decode pair cannot drift apart.
export function encodeWatcherUserIds(userIds: string[]) {
  return userIds.join(",") || undefined;
}

export function decodeWatcherUserIds(value: string | undefined) {
  return (
    value
      ?.split(",")
      .map((userId) => userId.trim())
      .filter(Boolean) ?? []
  );
}

function escapeMrkdwn(value: string | undefined) {
  return (value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function createDailyMessage(submission: DailySubmission) {
  const { startTime, endTime, userId, userName } = submission;
  const summary = `*Daily Meeting:* ${startTime}–${endTime} · โดย  <@${userId}>`;

  return {
    text: `Daily Meeting: ${startTime}–${endTime} โดย ${userName ?? userId}`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: summary },
      },
    ] satisfies SlackBlock[],
  };
}

export function createIssueMessage(submission: IssueSubmission) {
  const {
    problem,
    blocking,
    askUserIds,
    askUserNames,
    need,
    minutes,
    note,
    userId,
  } = submission;
  const noteText = note ? `\n*Note:* ${escapeMrkdwn(note)}` : "";
  const askMentions =
    askUserIds.map((userId) => `<@${userId}>`).join(", ") || "-";
  const askNames = askUserNames?.join(", ") || askMentions;

  return {
    text: `ขอความช่วยเหลือ: ${problem ?? "-"} | Ask: ${askNames}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Owner issue:* <@${userId}>\n*Problem:* ${escapeMrkdwn(problem)}\n*Blocking:* ${escapeMrkdwn(blocking)}\n*Ask:* ${askMentions}\n*Need:* ${escapeMrkdwn(need)}\n*Time:* ${minutes ?? "-"} นาที${noteText}\n`,
        },
      },
    ] satisfies SlackBlock[],
  };
}

// ponytail: `[label](url)` is the one link form people paste out of a ticket tool,
// so translate just that into Slack's <url|label> instead of pulling in a Markdown
// parser. The protocol is pinned in the pattern, so javascript: can never match.
const MARKDOWN_LINK = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;

function formatTicketLink(raw: string) {
  const match = MARKDOWN_LINK.exec(raw.trim());

  if (!match) {
    return escapeMrkdwn(raw);
  }

  const [, label, url] = match;

  try {
    // Re-serialising through URL drops anything malformed and percent-encodes the
    // odd characters that could otherwise break out of the <...> link.
    const href = new URL(url).toString();

    return `<${escapeMrkdwn(href)}|${escapeMrkdwn(label)}>`;
  } catch {
    return escapeMrkdwn(raw);
  }
}

function formatTicketLinks(links: string[]) {
  if (!links.length) {
    return "-";
  }

  if (links.length === 1) {
    return formatTicketLink(links[0]);
  }

  return `\n${links.map((link) => `• ${formatTicketLink(link)}`).join("\n")}`;
}

export function createPrMessage(submission: PrSubmission) {
  const { ticketLinks, prUrl, reviewerUserIds, watcherUserIds, userId } =
    submission;
  const reviewers =
    reviewerUserIds.map((reviewerId) => `<@${reviewerId}>`).join(", ") || "-";

  return {
    text: `ขอรีวิว PR: ${prUrl} | Reviewer: ${reviewers}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          // Posted bare so Slack autolinks and unfurls it, which beats any label we
          // could guess for an arbitrary host. Everything typed goes through escapeMrkdwn.
          text: `*Owner PR:* <@${userId}>\n*Ticket:* ${formatTicketLinks(ticketLinks)}\n*PR:* ${escapeMrkdwn(prUrl)}\n*Reviewer:* ${reviewers}\n`,
        },
      },
      {
        type: "actions",
        block_id: "pr_actions",
        elements: [
          {
            type: "button",
            action_id: "pr_merged",
            style: "primary",
            text: { type: "plain_text", text: "Merged" },
            // Watchers are deliberately absent from the text above and travel here
            // instead, so nobody is pinged until this button is pressed.
            value: encodeWatcherUserIds(watcherUserIds),
          },
          {
            type: "button",
            action_id: "pr_delete",
            style: "danger",
            text: { type: "plain_text", text: "Delete" },
            // The owner id travels with the button so the click can be authorised
            // without re-parsing the rendered message text.
            value: userId,
            confirm: {
              title: { type: "plain_text", text: "ลบข้อความนี้" },
              text: {
                type: "plain_text",
                text: "ข้อความนี้และ reply ทั้ง thread จะถูกลบ กู้คืนไม่ได้",
              },
              confirm: { type: "plain_text", text: "ลบ" },
              deny: { type: "plain_text", text: "ยกเลิก" },
              style: "danger",
            },
          },
        ],
      },
    ] satisfies SlackBlock[],
  };
}

export function createPrMergedMessage(
  watcherUserIds: string[],
  mergedByUserId: string | undefined,
) {
  const watchers = watcherUserIds
    .map((watcherId) => `<@${watcherId}>`)
    .join(", ");
  const mergedBy = mergedByUserId ? ` โดย <@${mergedByUserId}>` : "";
  const summary = watchers
    ? `*Merged*${mergedBy}\n${watchers}`
    : `*Merged*${mergedBy}`;

  return {
    text: watchers ? `Merged · แจ้ง ${watchers}` : "Merged",
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: summary },
      },
    ] satisfies SlackBlock[],
  };
}

type PrActionsBlock = {
  block_id?: string;
  elements?: { action_id?: string }[];
};

// Fails closed: an absent owner id on the button means nobody is allowed to delete.
export function canDeletePrMessage(
  deleteButtonValue: string | undefined,
  clickedByUserId: string | undefined,
) {
  return Boolean(deleteButtonValue) && deleteButtonValue === clickedByUserId;
}

export function createPrMergedUpdate(
  message: { text?: string; blocks?: SlackBlock[] },
  mergedByUserId: string | undefined,
) {
  const originalBlocks = message.blocks ?? [];
  const isActions = (block: SlackBlock) =>
    (block as PrActionsBlock).block_id === "pr_actions";
  // The original Delete button is reused verbatim so it keeps the owner id in its
  // value — re-deriving it here would need submission data we no longer hold.
  const deleteButton = (
    originalBlocks.find(isActions) as PrActionsBlock | undefined
  )?.elements?.find((element) => element.action_id === "pr_delete");
  const mergedBy = mergedByUserId ? ` โดย <@${mergedByUserId}>` : "";

  const blocks: SlackBlock[] = [
    ...originalBlocks.filter((block) => !isActions(block)),
    {
      type: "context",
      block_id: "pr_merged_marker",
      elements: [
        { type: "mrkdwn", text: `:white_check_mark: *Merged*${mergedBy}` },
      ],
    },
  ];

  if (deleteButton) {
    blocks.push({
      type: "actions",
      block_id: "pr_actions",
      elements: [deleteButton],
    });
  }

  return {
    text: message.text ? `${message.text} · Merged` : "Merged",
    blocks,
  };
}
