import { listDailySubmissions } from "@/libs/repositories/channel-repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  try {
    const { channelId } = await params;

    return Response.json({
      daily: await listDailySubmissions(channelId),
    });
  } catch (error) {
    console.error("Unable to list Daily submissions", error);
    return Response.json(
      { error: "Unable to list Daily submissions" },
      { status: 500 },
    );
  }
}
