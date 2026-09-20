import type {
  DailySubmission,
  IssueSubmission,
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
