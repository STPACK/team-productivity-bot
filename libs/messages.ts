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
    askUserId,
    need,
    minutes,
    note,
    userId,
  } = submission;
  const noteText = note ? `\n*Note:* ${escapeMrkdwn(note)}` : "";

  return {
    text: `ขอความช่วยเหลือ: ${problem ?? "-"}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Problem:* ${escapeMrkdwn(problem)}\n*Blocking:* ${escapeMrkdwn(blocking)}\n*Ask:* (<@${askUserId}>)\n*Need:* ${escapeMrkdwn(need)}\n*Time:* ${minutes ?? "-"} นาที${noteText}\n*Owner issue:*  (<@${userId}>)`,
        },
      },
    ] satisfies SlackBlock[],
  };
}
