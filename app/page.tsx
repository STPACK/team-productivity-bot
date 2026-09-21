import { ChannelList } from "@/components/channel-list";
import { DashboardUser } from "@/components/dashboard-user";
import { requireSessionUser } from "@/libs/auth/session";

export default async function Home() {
  const user = await requireSessionUser("/");

  return (
    <main className="dashboard-shell">
      <DashboardUser email={user.email} />
      <header className="dashboard-header">
        <p className="dashboard-eyebrow">Slack workspace</p>
        <h1 className="dashboard-title">Team Productivity</h1>
        <p className="dashboard-description">
          เลือก Channel เพื่อดูข้อมูล Daily และ Issue ล่าสุด
        </p>
      </header>
      <ChannelList />
    </main>
  );
}
