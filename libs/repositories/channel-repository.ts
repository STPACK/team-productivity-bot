import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getDatabase } from "@/libs/firebase/admin";
import { createIssueRecordData } from "@/libs/repositories/channel-records";
import type {
  DailySubmission,
  DailyTimeRange,
  IssueSubmission,
  SlackChannelContext,
} from "@/models/slack-api";

const CHANNELS_COLLECTION = "slackChannels";

function getChannelDocument(channelId: string) {
  return getDatabase().collection(CHANNELS_COLLECTION).doc(channelId);
}

function channelData(context: SlackChannelContext) {
  return {
    channelId: context.channelId,
    channelName: context.channelName,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function getChannelDailyTimeRange(channelId: string) {
  const snapshot = await getChannelDocument(channelId).get();

  return snapshot.get("dailyTimeRange") as DailyTimeRange | undefined;
}

export async function setChannelDailyTimeRange(
  context: SlackChannelContext,
  timeRange: DailyTimeRange,
) {
  if (!context.channelId) {
    throw new Error("Channel ID is required");
  }

  await getChannelDocument(context.channelId).set(
    {
      ...channelData(context),
      dailyTimeRange: timeRange,
    },
    { merge: true },
  );
}

export async function saveDailySubmission(submission: DailySubmission) {
  const channelId = submission.channel.channelId;

  if (!channelId) {
    throw new Error("Channel ID is required");
  }

  const channel = getChannelDocument(channelId);
  const record = channel.collection("dailySubmissions").doc(submission.date);
  const batch = getDatabase().batch();
  const recordData = {
    userId: submission.userId ?? null,
    userName: submission.userName ?? null,
    startTime: submission.startTime,
    endTime: submission.endTime,
    durationMinutes: submission.durationMinutes,
    date: submission.date,
    timezone: submission.timezone,
  };

  batch.set(channel, channelData(submission.channel), { merge: true });
  batch.set(
    record,
    {
      ...recordData,
      submittedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
}

export async function saveIssueSubmission(submission: IssueSubmission) {
  const channelId = submission.channel.channelId;

  if (!channelId) {
    throw new Error("Channel ID is required");
  }

  const channel = getChannelDocument(channelId);
  const record = channel.collection("issueSubmissions").doc();
  const batch = getDatabase().batch();
  const recordData = createIssueRecordData(submission);

  batch.set(channel, channelData(submission.channel), { merge: true });
  batch.set(record, {
    ...recordData,
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}
