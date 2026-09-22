import type {
  DailySubmission,
  IssueSubmission,
  PrSubmission,
  SlackBlock,
} from "@/models/slack-api";

export const MAX_WATCHER_COUNT = 100;

export function encodeActionValue(
  action: string,
  ...fields: (string | undefined)[]
) {
  return [action, ...fields.map((field) => field ?? "")].join(":");
}

export function decodeActionValue(value: string | undefined) {
  const [action, ...fields] = value?.split(":") ?? [];

  return action ? { action, fields } : null;
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

export function createIssueMessage(
  submission: IssueSubmission,
  issueId: string,
) {
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
      {
        type: "actions",
        block_id: "issue_actions",
        elements: [
          {
            type: "overflow",
            action_id: "issue_overflow",
            options: [
              {
                text: { type: "plain_text", text: "Delete" },
                value: encodeActionValue("delete", userId, issueId),
              },
            ],
            confirm: {
              title: { type: "plain_text", text: "ลบ issue นี้" },
              text: {
                type: "plain_text",
                text: "ข้อความนี้และข้อมูลใน dashboard จะถูกลบ กู้คืนไม่ได้",
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

const MARKDOWN_LINK = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;

function formatTicketLink(raw: string) {
  const match = MARKDOWN_LINK.exec(raw.trim());

  if (!match) {
    return escapeMrkdwn(raw);
  }

  const [, label, url] = match;

  try {
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
            value: encodeActionValue("merged", watcherUserIds.join(",")),
          },
          {
            type: "overflow",
            action_id: "pr_overflow",
            options: [
              {
                text: { type: "plain_text", text: "Delete" },
                value: encodeActionValue("delete", userId),
              },
            ],
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

export function createPrMergedMessage(watcherUserIds: string[]) {
  const watchers = watcherUserIds
    .map((watcherId) => `<@${watcherId}>`)
    .join(", ");

  return {
    text: `Merged · แจ้ง ${watchers}`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Already merged* ${watchers}` },
      },
    ] satisfies SlackBlock[],
  };
}

type PrActionElement = {
  type?: string;
  action_id?: string;
};

type PrActionsBlock = {
  block_id?: string;
  elements?: PrActionElement[];
};

export function isMessageOwner(
  ownerUserId: string | undefined,
  clickedByUserId: string | undefined,
) {
  return Boolean(ownerUserId) && ownerUserId === clickedByUserId;
}

export function createPrMergedUpdate(
  message: { text?: string; blocks?: SlackBlock[] },
  mergedByUserId: string | undefined,
) {
  const originalBlocks = message.blocks ?? [];
  const isActions = (block: SlackBlock) =>
    (block as PrActionsBlock).block_id === "pr_actions";

  const remainingElements = (
    (originalBlocks.find(isActions) as PrActionsBlock | undefined)?.elements ??
    []
  ).filter((element) => element.action_id !== "pr_merged");
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
  if (remainingElements.length) {
    blocks.push({
      type: "actions",
      block_id: "pr_actions",
      elements: remainingElements,
    });
  }

  return {
    text: message.text ? `${message.text} · Merged` : "Merged",
    blocks,
  };
}
