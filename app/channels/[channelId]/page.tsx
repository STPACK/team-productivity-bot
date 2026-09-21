import { ChannelDashboard } from "@/components/channel-dashboard";

export default async function ChannelPage({
  params,
}: PageProps<"/channels/[channelId]">) {
  const { channelId } = await params;

  return <ChannelDashboard channelId={channelId} />;
}
