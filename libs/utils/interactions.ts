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
  getChannelContext,
  getInput,
  getMinutesSinceMidnight,
  isValidSlackRequest,
  parseInteractionPayload,
  parsePositiveInteger,
} from "@/libs/utils/requests";

async function publishDaily(submission: DailySubmission) {
  if (!submission.channel.channelId) {
    throw new Error("Channel ID is missing from private_metadata");
  }

  const member = await getSlackMember(submission.userId);
  await postSlackMessage(
    submission.channel.channelId,
    createDailyMessage({ ...submission, userName: member?.name }),
  );
}

async function publishIssue(submission: IssueSubmission) {
  if (!submission.channel.channelId) {
    throw new Error("Channel ID is missing from private_metadata");
  }

  const [submittedBy, askedMembers] = await Promise.all([
    getSlackMember(submission.userId),
    Promise.all(submission.askUserIds.map(getSlackMember)),
  ]);
  await postSlackMessage(
    submission.channel.channelId,
    createIssueMessage({
      ...submission,
      userName: submittedBy?.name,
      askUserNames: askedMembers.flatMap((member) =>
        member ? [member.name] : [],
      ),
    }),
  );
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

function handleDailySubmission(payload: SlackInteractionPayload) {
  const startTime = getInput(
    payload,
    "start_time",
    "start_time_input",
  )?.selected_time;
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

  const submission: DailySubmission = {
    channel: getChannelContext(payload),
    userId: payload.user?.id,
    startTime,
    endTime,
    durationMinutes:
      getMinutesSinceMidnight(endTime) - getMinutesSinceMidnight(startTime),
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

  const submission: IssueSubmission = {
    channel: getChannelContext(payload),
    userId: payload.user?.id,
    problem: getInput(payload, "problem", "problem_input")?.value,
    blocking: getInput(payload, "blocking", "blocking_input")?.value,
    askUserIds:
      getInput(payload, "ask", "ask_select")?.selected_users ?? [],
    need: getInput(payload, "need", "need_input")?.value,
    minutes,
    note: getInput(payload, "note", "note_input")?.value,
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
