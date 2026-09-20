import { createDailyModal } from "@/libs/modals";
import { handleSlackCommand } from "@/libs/utils/commands";
import { getDailyTimeRange } from "@/libs/utils/daily-settings";

export async function POST(request: Request) {
  const timezone = process.env.SLACK_TIMEZONE ?? "Asia/Bangkok";

  return handleSlackCommand(request, async (context) => {
    const timeRange = await getDailyTimeRange(context.channelId);

    return createDailyModal(context, timezone, timeRange);
  });
}
