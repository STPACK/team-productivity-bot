import { ChannelDashboard } from "@/components/ChannelDashboard";
import { DashboardUser } from "@/components/DashboardUser";
import { requireSessionUser } from "@/libs/auth/session";

export default async function ChannelPage({
  params,
}: PageProps<"/channels/[channelId]">) {
  const { channelId } = await params;
  const returnPath = `/channels/${encodeURIComponent(channelId)}`;
  const user = await requireSessionUser(returnPath);

  return (
    <>
      <div className="dashboard-user-shell">
        <DashboardUser email={user.email} />
      </div>
      <ChannelDashboard channelId={channelId} />
    </>
  );
}
