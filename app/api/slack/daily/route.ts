import { createDailyModal } from "@/libs/modals";
import { handleSlackCommand } from "@/libs/utils/commands";
import { getDailyTimeRange } from "@/libs/utils/daily-settings";

export async function POST(request: Request) {
  return handleSlackCommand(request, async (context) => {
    const timeRange = await getDailyTimeRange(context.channelId);

    return createDailyModal(context, timeRange);
  });
}
