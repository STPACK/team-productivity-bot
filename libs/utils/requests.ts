import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  SlackChannelContext,
  SlackCommand,
  SlackInputValue,
  SlackInteractionPayload,
  SlackModalMetadata,
} from "@/models/slack-api";

export function parseSlackCommand(formData: FormData): SlackCommand | null {
  const triggerId = formData.get("trigger_id");

  if (typeof triggerId !== "string" || !triggerId) {
    return null;
  }

  const channelId = formData.get("channel_id");
  const channelName = formData.get("channel_name");
  const requesterUserId = formData.get("user_id");
  const requesterUserName = formData.get("user_name");

  return {
    triggerId,
    metadata: {
      channel: {
        channelId: typeof channelId === "string" ? channelId : null,
        channelName: typeof channelName === "string" ? channelName : null,
      },
      requesterUserId:
        typeof requesterUserId === "string" ? requesterUserId : null,
      requesterUserName:
        typeof requesterUserName === "string" ? requesterUserName : null,
    },
  };
}

export function isValidSlackRequest(request: Request, rawBody: string) {
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

export function parseInteractionPayload(rawBody: string) {
  const encodedPayload = new URLSearchParams(rawBody).get("payload");

  if (!encodedPayload) {
    return null;
  }

  try {
    return JSON.parse(encodedPayload) as SlackInteractionPayload;
  } catch {
    return null;
  }
}

export function getInput(
  payload: SlackInteractionPayload,
  blockId: string,
  actionId: string,
): SlackInputValue | undefined {
  return payload.view?.state?.values?.[blockId]?.[actionId];
}

export function getChannelContext(
  payload: SlackInteractionPayload,
): SlackChannelContext {
  try {
    const metadata = JSON.parse(
      payload.view?.private_metadata ?? "{}",
    ) as Partial<SlackModalMetadata & SlackChannelContext>;
    const context = metadata.channel ?? metadata;

    return {
      channelId:
        typeof context.channelId === "string" ? context.channelId : null,
      channelName:
        typeof context.channelName === "string" ? context.channelName : null,
    };
  } catch {
    return { channelId: null, channelName: null };
  }
}

export function getRequesterUserId(payload: SlackInteractionPayload) {
  try {
    const metadata = JSON.parse(
      payload.view?.private_metadata ?? "{}",
    ) as Partial<SlackModalMetadata>;

    return typeof metadata.requesterUserId === "string"
      ? metadata.requesterUserId
      : null;
  } catch {
    return null;
  }
}

export function getRequesterUserName(payload: SlackInteractionPayload) {
  try {
    const metadata = JSON.parse(
      payload.view?.private_metadata ?? "{}",
    ) as Partial<SlackModalMetadata>;

    return typeof metadata.requesterUserName === "string"
      ? metadata.requesterUserName
      : null;
  } catch {
    return null;
  }
}

export function getMinutesSinceMidnight(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

export function parsePositiveInteger(value: string | undefined) {
  const normalizedValue = value?.trim();

  if (!normalizedValue || !/^[1-9]\d*$/.test(normalizedValue)) {
    return null;
  }

  const number = Number(normalizedValue);

  return Number.isSafeInteger(number) ? number : null;
}

function formatDateInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function getCalendarDate(
  timezone: string | undefined,
  date = new Date(),
) {
  const fallbackTimezone = process.env.SLACK_TIMEZONE ?? "Asia/Bangkok";

  try {
    const resolvedTimezone = timezone || fallbackTimezone;

    return {
      date: formatDateInTimezone(date, resolvedTimezone),
      timezone: resolvedTimezone,
    };
  } catch {
    return {
      date: formatDateInTimezone(date, fallbackTimezone),
      timezone: fallbackTimezone,
    };
  }
}
