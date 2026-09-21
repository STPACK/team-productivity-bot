import type {
  DailySubmission,
  IssueSubmission,
  PrSubmission,
  SlackBlock,
} from "@/models/slack-api";

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
  const { ticketLinks, prUrl, reviewerUserIds, userId } = submission;
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
    ] satisfies SlackBlock[],
  };
}
