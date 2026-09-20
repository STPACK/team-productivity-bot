import type { DailyTimeRange } from "@/models/slack-api";
import { isFirestoreConfigured } from "@/libs/firebase/admin";
import { getChannelDailyTimeRange } from "@/libs/repositories/channel-repository";

const DEFAULT_TIME_RANGE: DailyTimeRange = {
  startTime: "09:00",
  endTime: "10:00",
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function isTimeRange(value: unknown): value is DailyTimeRange {
  if (!value || typeof value !== "object") {
    return false;
  }

  const range = value as Partial<DailyTimeRange>;

  return (
    typeof range.startTime === "string" &&
    typeof range.endTime === "string" &&
    TIME_PATTERN.test(range.startTime) &&
    TIME_PATTERN.test(range.endTime) &&
    toMinutes(range.endTime) > toMinutes(range.startTime)
  );
}

export async function getDailyTimeRange(channelId: string | null) {
  if (!channelId) {
    return DEFAULT_TIME_RANGE;
  }

  if (isFirestoreConfigured()) {
    try {
      const storedRange = await getChannelDailyTimeRange(channelId);

      if (isTimeRange(storedRange)) {
        return storedRange;
      }
    } catch (error) {
      console.error(
        "Unable to read channel settings from Firestore; using defaults",
        error,
      );
    }
  }

  if (!process.env.SLACK_DAILY_TIME_RANGES) {
    return DEFAULT_TIME_RANGE;
  }

  try {
    const ranges = JSON.parse(process.env.SLACK_DAILY_TIME_RANGES) as Record<
      string,
      unknown
    >;
    const channelRange = ranges[channelId];

    return isTimeRange(channelRange) ? channelRange : DEFAULT_TIME_RANGE;
  } catch {
    return DEFAULT_TIME_RANGE;
  }
}
