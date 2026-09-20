import { createIssueModal } from "@/libs/modals";
import { handleSlackCommand } from "@/libs/utils/commands";

export async function POST(request: Request) {
  return handleSlackCommand(request, createIssueModal);
}
