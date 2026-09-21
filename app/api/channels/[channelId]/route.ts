import { getChannel } from "@/libs/repositories/channel-repository";
import { getSessionUser, unauthorizedResponse } from "@/libs/auth/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  if (!(await getSessionUser())) {
    return unauthorizedResponse();
  }

  try {
    const { channelId } = await params;
    const channel = await getChannel(channelId);

    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    return Response.json({ channel });
  } catch (error) {
    console.error("Unable to get Slack channel", error);
    return Response.json(
      { error: "Unable to get Slack channel" },
      { status: 500 },
    );
  }
}
