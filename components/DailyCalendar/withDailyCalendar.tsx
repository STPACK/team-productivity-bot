"use client";

import type { FC } from "react";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDailyRecords } from "@/libs/api/dashboard";
import { DEFAULT_TARGET_MINUTES, summariseMonth } from "@/libs/daily-summary";
import type { DailyCalendarProps, WithDailyCalendarProps } from "./interface";

function currentMonth() {
  const now = new Date();

  // Built from local parts, not toISOString, so the month matches the calendar
  // the viewer is looking at rather than UTC's.
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function withDailyCalendar(Component: FC<DailyCalendarProps>) {
  function WithDailyCalendar({ channelId }: WithDailyCalendarProps) {
    const [month, setMonth] = useState(currentMonth);
    const [targetMinutes, setTargetMinutes] = useState(DEFAULT_TARGET_MINUTES);
    const { data, isPending, error } = useQuery({
      queryKey: ["daily", channelId],
      queryFn: () => getDailyRecords(channelId),
    });
    // A channel has at most one Daily Submission per date, so the date is a safe key.
    const recordsByDate = useMemo(
      () => new Map((data ?? []).map((record) => [record.date, record])),
      [data],
    );
    const summary = useMemo(
      () => summariseMonth(data ?? [], month, targetMinutes),
      [data, month, targetMinutes],
    );
    const onTargetChange = useCallback((minutes: number) => {
      setTargetMinutes(minutes);
    }, []);

    return (
      <Component
        recordsByDate={recordsByDate}
        summary={summary}
        targetMinutes={targetMinutes}
        onTargetChange={onTargetChange}
        onMonthChange={setMonth}
        isPending={isPending}
        error={error?.message ?? null}
      />
    );
  }

  return WithDailyCalendar;
}
