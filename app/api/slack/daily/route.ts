import { createDailyModal } from "@/libs/modals";
import { handleSlackCommand } from "@/libs/utils/commands";
import { getDailyTimeRange } from "@/libs/utils/daily-settings";

export async function POST(request: Request) {
  return handleSlackCommand(request, async (metadata) => {
    const timeRange = await getDailyTimeRange(metadata.channel.channelId);

    return createDailyModal(metadata, timeRange);
  });
}
