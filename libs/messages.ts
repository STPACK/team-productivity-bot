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
  const { startTime, endTime, durationMinutes, userId, userName } = submission;

  return {
    text: `Daily ${startTime}-${endTime} (${durationMinutes} นาที)`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Daily" },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*เริ่ม*\n${startTime}` },
          { type: "mrkdwn", text: `*สิ้นสุด*\n${endTime}` },
          { type: "mrkdwn", text: `*ระยะเวลา*\n${durationMinutes} นาที` },
          {
            type: "mrkdwn",
            text: `*ผู้ส่ง*\n${escapeMrkdwn(userName)} (<@${userId}>)`,
          },
        ],
      },
    ] satisfies SlackBlock[],
  };
}

export function createIssueMessage(submission: IssueSubmission) {
  const {
    problem,
    blocking,
    askUserId,
    askUserName,
    need,
    minutes,
    note,
    userId,
    userName,
  } = submission;
  const noteText = note ? `\n*Note*\n${escapeMrkdwn(note)}` : "";

  return {
    text: `ขอความช่วยเหลือ: ${problem ?? "-"}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "ขอความช่วยเหลือ" },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Problem*\n${escapeMrkdwn(problem)}\n\n*Blocking*\n${escapeMrkdwn(blocking)}\n\n*Ask*\n${escapeMrkdwn(askUserName)} (<@${askUserId}>)\n\n*Need*\n${escapeMrkdwn(need)}\n\n*Time*\n${minutes ?? "-"} นาที${noteText}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `ส่งโดย ${escapeMrkdwn(userName)} (<@${userId}>)`,
          },
        ],
      },
    ] satisfies SlackBlock[],
  };
}
