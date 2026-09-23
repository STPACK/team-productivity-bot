import type { ChannelSummary } from "@/models/dashboard";

export interface WithChannelListProps {
  className?: string;
}

export interface ChannelListProps {
  className?: string;
  channels: ChannelSummary[];
  isPending: boolean;
  error: string | null;
}
