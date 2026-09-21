import { ChannelList } from "@/components/channel-list";

export default function Home() {
  return (
    <main className="dashboard-shell">
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
