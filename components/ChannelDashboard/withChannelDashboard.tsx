"use client";

import type { FC } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChannel, getDailyRecords, getIssueRecords } from "@/libs/api/dashboard";
import type {
  ChannelDashboardProps,
  WithChannelDashboardProps,
} from "./interface";

export function withChannelDashboard(Component: FC<ChannelDashboardProps>) {
  function WithChannelDashboard({ channelId }: WithChannelDashboardProps) {
    const channelQuery = useQuery({
      queryKey: ["channel", channelId],
      queryFn: () => getChannel(channelId),
    });
    // Same query key as the calendar's, so react-query serves both from one fetch.
    const dailyCountQuery = useQuery({
      queryKey: ["daily", channelId],
      queryFn: () => getDailyRecords(channelId),
    });
    const issueQuery = useQuery({
      queryKey: ["issues", channelId],
      queryFn: () => getIssueRecords(channelId),
    });

    return (
      <Component
        channelId={channelId}
        channelLabel={channelQuery.data?.channelName || channelId}
        channelError={channelQuery.error?.message ?? null}
        dailyCount={dailyCountQuery.data?.length ?? 0}
        issues={issueQuery.data ?? []}
        issuesPending={issueQuery.isPending}
        issuesError={issueQuery.error?.message ?? null}
      />
    );
  }

  return WithChannelDashboard;
}
