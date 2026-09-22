import { after } from "next/server";
import {
  createDailyMessage,
  createIssueMessage,
  createPrMergedMessage,
  createPrMergedUpdate,
  createPrMessage,
  decodeIssueDeleteValue,
  decodeWatcherUserIds,
  isMessageOwner,
} from "@/libs/messages";
import type {
  DailySubmission,
  IssueSubmission,
  PrSubmission,
  SlackInteractionPayload,
} from "@/models/slack-api";
import {
  deleteSlackMessage,
  getSlackMember,
  postSlackEphemeral,
  postSlackMessage,
  updateSlackMessage,
} from "@/libs/utils/client";
import {
  deleteIssueSubmission,
  newIssueSubmissionId,
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
  parsePrUrl,
  parseInteractionPayload,
  parsePositiveInteger,
  splitTicketLinks,
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
  const channelId = submission.channel.channelId;

  if (!channelId) {
    throw new Error("Channel ID is missing from private_metadata");
  }

  const issueId = newIssueSubmissionId(channelId);
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
      channelId,
      createIssueMessage(enrichedSubmission, issueId),
    ),
    saveIssueSubmission(enrichedSubmission, issueId),
  ]);
}

async function publishPr(submission: PrSubmission) {
  if (!submission.channel.channelId) {
    throw new Error("Channel ID is missing from private_metadata");
  }

  // ponytail: nothing is stored and no dashboard reads this, so <@id> mentions are
  // enough — skips the users.info fan-out publishIssue needs for saved display names.
  await postSlackMessage(
    submission.channel.channelId,
    createPrMessage(submission),
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

function handlePrSubmission(payload: SlackInteractionPayload) {
  const prUrl = parsePrUrl(getInput(payload, "pr_link", "pr_link_input")?.value);

  if (!prUrl) {
    return Response.json({
      response_action: "errors",
      errors: {
        pr_link: "กรุณาใส่ลิงก์ที่ขึ้นต้นด้วย http:// หรือ https://",
      },
    });
  }

  const submission: PrSubmission = {
    channel: getChannelContext(payload),
    ...getSubmissionIdentity(payload),
    ticketLinks: splitTicketLinks(
      getInput(payload, "ticket_link", "ticket_link_input")?.value,
    ),
    prUrl,
    reviewerUserIds:
      getInput(payload, "reviewer", "reviewer_select")?.selected_users ?? [],
    watcherUserIds:
      getInput(payload, "watcher", "watcher_select")?.selected_users ?? [],
  };

  runAfterResponse(() => publishPr(submission));

  return new Response(null, { status: 200 });
}

function handleMessageAction(payload: SlackInteractionPayload) {
  const action = payload.actions?.[0];
  const channelId = payload.channel?.id;
  // The button lives on the parent message, so its ts is also the thread to reply in.
  const messageTs = payload.message?.ts;

  if (!action?.action_id || !channelId || !messageTs) {
    return new Response(null, { status: 200 });
  }

  const clickedByUserId = payload.user?.id;

  switch (action.action_id) {
    case "pr_merged": {
      const watcherUserIds = decodeWatcherUserIds(action.value);

      runAfterResponse(async () => {
        const tasks = [
          // Dropping the Merged button is what makes this single-use, and the
          // ✅ marker it leaves behind is what tells the channel the PR is in.
          // ponytail: two clicks in the same instant can still both land — a lock
          // would cost more than the stray thread reply it would prevent.
          updateSlackMessage(
            channelId,
            messageTs,
            createPrMergedUpdate(payload.message ?? {}, clickedByUserId),
          ),
        ];

        // With nobody to mention, the ✅ marker above already says it all and a
        // thread reply would just be noise.
        if (watcherUserIds.length) {
          tasks.push(
            postSlackMessage(
              channelId,
              createPrMergedMessage(watcherUserIds, clickedByUserId),
              messageTs,
            ),
          );
        }

        await Promise.all(tasks);
      });

      return new Response(null, { status: 200 });
    }
    case "pr_delete":
      if (!isMessageOwner(action.value, clickedByUserId)) {
        if (clickedByUserId) {
          runAfterResponse(() =>
            postSlackEphemeral(
              channelId,
              clickedByUserId,
              "ลบได้เฉพาะเจ้าของ PR เท่านั้น",
            ),
          );
        }

        return new Response(null, { status: 200 });
      }

      runAfterResponse(() => deleteSlackMessage(channelId, messageTs));

      return new Response(null, { status: 200 });
    case "issue_delete": {
      const target = decodeIssueDeleteValue(action.value);

      if (!target || !isMessageOwner(target.ownerUserId, clickedByUserId)) {
        if (clickedByUserId) {
          runAfterResponse(() =>
            postSlackEphemeral(
              channelId,
              clickedByUserId,
              "ลบได้เฉพาะเจ้าของ issue เท่านั้น",
            ),
          );
        }

        return new Response(null, { status: 200 });
      }

      runAfterResponse(async () => {
        await Promise.all([
          deleteSlackMessage(channelId, messageTs),
          deleteIssueSubmission(channelId, target.issueId),
        ]);
      });

      return new Response(null, { status: 200 });
    }
    default:
      return new Response(null, { status: 200 });
  }
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

  if (payload.type === "block_actions") {
    return handleMessageAction(payload);
  }

  if (payload.type !== "view_submission") {
    return new Response(null, { status: 200 });
  }

  switch (payload.view?.callback_id) {
    case "daily_create":
      return handleDailySubmission(payload);
    case "issue_create":
      return handleIssueSubmission(payload);
    case "pr_create":
      return handlePrSubmission(payload);
    default:
      return new Response(null, { status: 200 });
  }
}
