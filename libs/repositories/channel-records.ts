import type { IssueSubmission } from "@/models/slack-api";

export function createIssueRecordData(submission: IssueSubmission) {
  const askedUserNames = submission.askUserNames ?? [];

  return {
    channelId: submission.channel.channelId,
    channelName: submission.channel.channelName,
    createdBy: {
      userId: submission.userId ?? null,
      userName: submission.userName ?? null,
    },
    askedUserIds: submission.askUserIds,
    askedUsers: submission.askUserIds.map((userId, index) => ({
      userId,
      userName: askedUserNames[index] ?? null,
    })),
    problem: submission.problem ?? null,
    blocking: submission.blocking ?? null,
    need: submission.need ?? null,
    minutes: submission.minutes,
    note: submission.note ?? null,
    createdDate: submission.createdDate,
    timezone: submission.timezone,
  };
}
