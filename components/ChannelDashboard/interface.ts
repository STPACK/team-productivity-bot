import type { IssueRecord } from "@/models/dashboard";

export interface WithChannelDashboardProps {
  channelId: string;
}

export interface ChannelDashboardProps {
  channelId: string;
  channelLabel: string;
  channelError: string | null;
  dailyCount: number;
  issues: IssueRecord[];
  issuesPending: boolean;
  issuesError: string | null;
}
