"use client";

import type { FC } from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDailyRecords } from "@/libs/api/dashboard";
import type {
  DailyCalendarProps,
  WithDailyCalendarProps,
} from "./interface";

export function withDailyCalendar(Component: FC<DailyCalendarProps>) {
  function WithDailyCalendar({ channelId }: WithDailyCalendarProps) {
    const { data, isPending, error } = useQuery({
      queryKey: ["daily", channelId],
      queryFn: () => getDailyRecords(channelId),
    });
    // A channel has at most one Daily Submission per date, so the date is a safe key.
    const recordsByDate = useMemo(
      () => new Map((data ?? []).map((record) => [record.date, record])),
      [data],
    );

    return (
      <Component
        recordsByDate={recordsByDate}
        isPending={isPending}
        error={error?.message ?? null}
      />
    );
  }

  return WithDailyCalendar;
}
