import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";

type SlackInputValue = {
  value?: string;
  selected_time?: string;
  selected_user?: string;
};

type SlackInteractionPayload = {
  type: string;
  user?: {
    id?: string;
  };
  view?: {
    callback_id?: string;
    private_metadata?: string;
    state?: {
      values?: Record<string, Record<string, SlackInputValue>>;
    };
  };
};

type SlackPrivateMetadata = {
  channelId: string | null;
  channelName: string | null;
};

type SlackUserInfoResponse = {
  ok: boolean;
  error?: string;
  needed?: string;
  provided?: string;
  user?: {
    id?: string;
    real_name?: string;
    name?: string;
    profile?: {
      display_name?: string;
      real_name?: string;
    };
  };
};

type SlackPostMessageResponse = {
  ok: boolean;
  error?: string;
};

function isValidSlackRequest(request: Request, rawBody: string) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");

  if (!signingSecret || !timestamp || !signature) {
    return false;
  }

  const timestampSeconds = Number(timestamp);

  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(Date.now() / 1000 - timestampSeconds) > 60 * 5
  ) {
    return false;
  }

  const expectedSignature = `v0=${createHmac("sha256", signingSecret)
    .update(`v0:${timestamp}:${rawBody}`)
    .digest("hex")}`;
  const expectedBuffer = Buffer.from(expectedSignature);
  const actualBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function getInput(
  values: Record<string, Record<string, SlackInputValue>>,
  blockId: string,
  actionId: string,
) {
  return values[blockId]?.[actionId];
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function getPrivateMetadata(payload: SlackInteractionPayload) {
  try {
    return JSON.parse(
      payload.view?.private_metadata ?? "{}",
    ) as SlackPrivateMetadata;
  } catch {
    return { channelId: null, channelName: null };
  }
}

function escapeMrkdwn(value: string | undefined) {
  return (value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function getSlackMember(userId: string | undefined) {
  if (!userId) {
    return null;
  }

  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured");
  }

  const response = await fetch(
    `https://slack.com/api/users.info?user=${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const result = (await response.json()) as SlackUserInfoResponse;

  if (!response.ok) {
    throw new Error(`users.info failed with HTTP ${response.status}`);
  }

  if (!result.ok || !result.user) {
    console.warn("Unable to resolve Slack member name; using user ID", {
      userId,
      error: result.error,
      needed: result.needed,
      provided: result.provided,
    });

    return {
      id: userId,
      name: userId,
    };
  }

  return {
    id: result.user.id ?? userId,
    name:
      result.user.profile?.display_name ||
      result.user.profile?.real_name ||
      result.user.real_name ||
      result.user.name ||
      userId,
  };
}

async function postSlackMessage(
  channelId: string,
  text: string,
  blocks: unknown[],
) {
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured");
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel: channelId, text, blocks }),
  });
  const result = (await response.json()) as SlackPostMessageResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Unable to post Slack message");
  }
}

function handleDailySubmission(payload: SlackInteractionPayload) {
  const values = payload.view?.state?.values ?? {};
  const startTime = getInput(
    values,
    "start_time",
    "start_time_input",
  )?.selected_time;
  const endTime = getInput(
    values,
    "end_time",
    "end_time_input",
  )?.selected_time;

  if (!startTime || !endTime || toMinutes(endTime) <= toMinutes(startTime)) {
    return Response.json({
      response_action: "errors",
      errors: {
        end_time: "เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น",
      },
    });
  }

  const metadata = getPrivateMetadata(payload);

  after(async () => {
    try {
      if (!metadata.channelId) {
        throw new Error("Channel ID is missing from private_metadata");
      }

      const member = await getSlackMember(payload.user?.id);
      const durationMinutes = toMinutes(endTime) - toMinutes(startTime);

      await postSlackMessage(
        metadata.channelId,
        `Daily ${startTime}-${endTime} (${durationMinutes} นาที)`,
        [
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
                text: `*ผู้ส่ง*\n<@${payload.user?.id}>`,
              },
            ],
          },
        ],
      );

      console.info("Daily submitted", {
        channelId: metadata.channelId,
        channelName: metadata.channelName,
        userId: member?.id,
        userName: member?.name,
        startTime,
        endTime,
        durationMinutes,
      });
    } catch (error) {
      console.error("Unable to publish daily submission", error);
    }
  });

  return new Response(null, { status: 200 });
}

function handleIssueSubmission(payload: SlackInteractionPayload) {
  const values = payload.view?.state?.values ?? {};
  const rawMinutes = getInput(values, "time", "time_input")?.value;
  const problem = getInput(values, "problem", "problem_input")?.value;
  const blocking = getInput(values, "blocking", "blocking_input")?.value;
  const askUserId = getInput(values, "ask", "ask_select")?.selected_user;
  const need = getInput(values, "need", "need_input")?.value;
  const note = getInput(values, "note", "note_input")?.value;
  const minutes = rawMinutes ? Number.parseInt(rawMinutes, 10) : null;
  const metadata = getPrivateMetadata(payload);

  after(async () => {
    try {
      if (!metadata.channelId) {
        throw new Error("Channel ID is missing from private_metadata");
      }

      const [submittedBy, askedMember] = await Promise.all([
        getSlackMember(payload.user?.id),
        getSlackMember(askUserId),
      ]);
      const noteText = note
        ? `\n*Note*\n${escapeMrkdwn(note)}`
        : "";

      await postSlackMessage(
        metadata.channelId,
        `ขอความช่วยเหลือ: ${problem ?? "-"}`,
        [
          {
            type: "header",
            text: { type: "plain_text", text: "ขอความช่วยเหลือ" },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Problem*\n${escapeMrkdwn(problem)}\n\n*Blocking*\n${escapeMrkdwn(blocking)}\n\n*Ask*\n<@${askUserId}>\n\n*Need*\n${escapeMrkdwn(need)}\n\n*Time*\n${minutes ?? "-"} นาที${noteText}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `ส่งโดย <@${payload.user?.id}>`,
              },
            ],
          },
        ],
      );

      console.info("Issue submitted", {
        channelId: metadata.channelId,
        channelName: metadata.channelName,
        userId: submittedBy?.id,
        userName: submittedBy?.name,
        problem,
        blocking,
        askUserId: askedMember?.id,
        askUserName: askedMember?.name,
        need,
        minutes,
        note: note ?? null,
      });
    } catch (error) {
      console.error("Unable to publish issue submission", error);
    }
  });

  return new Response(null, { status: 200 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!isValidSlackRequest(request, rawBody)) {
    return Response.json({ error: "Invalid Slack signature" }, { status: 401 });
  }

  const encodedPayload = new URLSearchParams(rawBody).get("payload");

  if (!encodedPayload) {
    return Response.json({ error: "payload is required" }, { status: 400 });
  }

  let payload: SlackInteractionPayload;

  try {
    payload = JSON.parse(encodedPayload) as SlackInteractionPayload;
  } catch {
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
