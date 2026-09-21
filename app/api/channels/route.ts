import { listChannels } from "@/libs/repositories/channel-repository";

export async function GET() {
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
