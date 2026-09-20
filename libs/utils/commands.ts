import type { SlackChannelContext, SlackModal } from "@/models/slack-api";
import { openSlackModal } from "@/libs/utils/client";
import { parseSlackCommand } from "@/libs/utils/requests";

type ModalFactory = (
  context: SlackChannelContext,
) => SlackModal | Promise<SlackModal>;

export async function handleSlackCommand(
  request: Request,
  createModal: ModalFactory,
) {
  const command = parseSlackCommand(await request.formData());

  if (!command) {
    return Response.json({ error: "trigger_id is required" }, { status: 400 });
  }

  try {
    const modal = await createModal(command.context);
    await openSlackModal(command.triggerId, modal);
    return new Response(null, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to open Slack modal",
      },
      { status: 502 },
    );
  }
}
