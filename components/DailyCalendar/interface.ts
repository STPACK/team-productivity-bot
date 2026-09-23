import type { DailyRecord } from "@/models/dashboard";

export interface WithDailyCalendarProps {
  channelId: string;
}

export interface DailyCalendarProps {
  recordsByDate: Map<string, DailyRecord>;
  isPending: boolean;
  error: string | null;
}
