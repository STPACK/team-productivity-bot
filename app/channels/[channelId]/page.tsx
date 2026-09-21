import { ChannelDashboard } from "@/components/channel-dashboard";
import { DashboardUser } from "@/components/dashboard-user";
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
