import { after } from "next/server";
import {
  createDailyMessage,
  createIssueMessage,
} from "@/libs/messages";
import type {
  DailySubmission,
  IssueSubmission,
  SlackInteractionPayload,
} from "@/models/slack-api";
import {
  getSlackMember,
  postSlackMessage,
} from "@/libs/utils/client";
import {
  saveDailySubmission,
  saveIssueSubmission,
} from "@/libs/repositories/channel-repository";
import {
  getChannelContext,
  getCalendarDate,
  getInput,
  getMinutesSinceMidnight,
  getRequesterUserId,
  getRequesterUserName,
  isValidSlackRequest,
  parseInteractionPayload,
  parsePositiveInteger,
} from "@/libs/utils/requests";
import {
  resolveSubmissionIdentity,
  resolveSubmissionUserName,
} from "@/libs/utils/slack-identity";

async function publishDaily(submission: DailySubmission) {
  if (!submission.channel.channelId) {
    throw new Error("Channel ID is missing from private_metadata");
  }

  const member = await getSlackMember(submission.userId, "daily_submitter");
  const enrichedSubmission = {
    ...submission,
    userName: resolveSubmissionUserName(member?.name, submission.userName),
  };

  await Promise.all([
    postSlackMessage(
      submission.channel.channelId,
      createDailyMessage(enrichedSubmission),
    ),
    saveDailySubmission(enrichedSubmission),
  ]);
}

async function publishIssue(submission: IssueSubmission) {
  if (!submission.channel.channelId) {
    throw new Error("Channel ID is missing from private_metadata");
  }

  const [submittedBy, askedMembers] = await Promise.all([
    getSlackMember(submission.userId, "issue_submitter"),
    Promise.all(
      submission.askUserIds.map((userId) =>
        getSlackMember(userId, "issue_ask_member"),
      ),
    ),
  ]);
  const enrichedSubmission = {
    ...submission,
    userName: resolveSubmissionUserName(
      submittedBy?.name,
      submission.userName,
    ),
    askUserNames: askedMembers.map(
      (member, index) => member?.name ?? submission.askUserIds[index],
    ),
  };

  await Promise.all([
    postSlackMessage(
      submission.channel.channelId,
      createIssueMessage(enrichedSubmission),
    ),
    saveIssueSubmission(enrichedSubmission),
  ]);
}

function runAfterResponse(task: () => Promise<void>) {
  after(async () => {
    try {
      await task();
    } catch (error) {
      console.error("Slack submission publish failed", error);
    }
  });
}

function getSubmissionIdentity(payload: SlackInteractionPayload) {
  return resolveSubmissionIdentity(
    getRequesterUserId(payload),
    getRequesterUserName(payload),
    payload.user,
  );
}

function handleDailySubmission(payload: SlackInteractionPayload) {
  const startTimeInput = getInput(payload, "start_time", "start_time_input");
  const startTime = startTimeInput?.selected_time;
  const endTime = getInput(
    payload,
    "end_time",
    "end_time_input",
  )?.selected_time;

  if (
    !startTime ||
    !endTime ||
    getMinutesSinceMidnight(endTime) <= getMinutesSinceMidnight(startTime)
  ) {
    return Response.json({
      response_action: "errors",
      errors: { end_time: "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น" },
    });
  }

  const calendarDate = getCalendarDate(startTimeInput?.timezone);

  const identity = getSubmissionIdentity(payload);
  const submission: DailySubmission = {
    channel: getChannelContext(payload),
    ...identity,
    startTime,
    endTime,
    durationMinutes:
      getMinutesSinceMidnight(endTime) - getMinutesSinceMidnight(startTime),
    ...calendarDate,
  };

  runAfterResponse(() => publishDaily(submission));

  return new Response(null, { status: 200 });
}

function handleIssueSubmission(payload: SlackInteractionPayload) {
  const rawMinutes = getInput(payload, "time", "time_input")?.value;
  const minutes = parsePositiveInteger(rawMinutes);

  if (minutes === null) {
    return Response.json({
      response_action: "errors",
      errors: {
        time: "กรุณาระบุจำนวนนาทีเป็นเลขจำนวนเต็มที่มากกว่า 0 เช่น 15",
      },
    });
  }

  const identity = getSubmissionIdentity(payload);
  const { date: createdDate, timezone } = getCalendarDate(undefined);
  const submission: IssueSubmission = {
    channel: getChannelContext(payload),
    ...identity,
    problem: getInput(payload, "problem", "problem_input")?.value,
    blocking: getInput(payload, "blocking", "blocking_input")?.value,
    askUserIds:
      getInput(payload, "ask", "ask_select")?.selected_users ?? [],
    need: getInput(payload, "need", "need_input")?.value,
    minutes,
    note: getInput(payload, "note", "note_input")?.value,
    createdDate,
    timezone,
  };

  runAfterResponse(() => publishIssue(submission));

  return new Response(null, { status: 200 });
}

export async function handleSlackInteraction(request: Request) {
  const rawBody = await request.text();

  if (!isValidSlackRequest(request, rawBody)) {
    return Response.json({ error: "Invalid Slack signature" }, { status: 401 });
  }

  const payload = parseInteractionPayload(rawBody);

  if (!payload) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (payload.type !== "view_submission") {
    return new Response(null, { status: 200 });
  }

  switch (payload.view?.callback_id) {
    case "daily_create":
      return handleDailySubmission(payload);
    case "issue_create":
      return handleIssueSubmission(payload);
    default:
      return new Response(null, { status: 200 });
  }
}
