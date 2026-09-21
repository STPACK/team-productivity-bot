import { listIssueSubmissions } from "@/libs/repositories/channel-repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> },
) {
  try {
    const { channelId } = await params;

    return Response.json({
      issues: await listIssueSubmissions(channelId),
    });
  } catch (error) {
    console.error("Unable to list Issue submissions", error);
    return Response.json(
      { error: "Unable to list Issue submissions" },
      { status: 500 },
    );
  }
}
