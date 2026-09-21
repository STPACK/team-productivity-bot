import { listDailySubmissions } from "@/libs/repositories/channel-repository";
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
