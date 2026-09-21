import { listChannels } from "@/libs/repositories/channel-repository";
import { getSessionUser, unauthorizedResponse } from "@/libs/auth/session";

export async function GET() {
  if (!(await getSessionUser())) {
    return unauthorizedResponse();
  }

  try {
    return Response.json({ channels: await listChannels() });
  } catch (error) {
    console.error("Unable to list Slack channels", error);
    return Response.json(
      { error: "Unable to list Slack channels" },
      { status: 500 },
    );
  }
}
