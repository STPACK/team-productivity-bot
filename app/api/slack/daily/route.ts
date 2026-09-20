import { createDailyModal } from "@/libs/modals";
import { handleSlackCommand } from "@/libs/utils/commands";

export async function POST(request: Request) {
  const timezone = process.env.SLACK_TIMEZONE ?? "Asia/Bangkok";

  return handleSlackCommand(request, (context) =>
    createDailyModal(context, timezone),
  );
}
