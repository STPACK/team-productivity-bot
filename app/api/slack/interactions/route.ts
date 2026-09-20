import { handleSlackInteraction } from "@/libs/utils/interactions";

export async function POST(request: Request) {
  return handleSlackInteraction(request);
}
