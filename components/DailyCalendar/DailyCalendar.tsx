"use client";

import React from "react";
import { Alert, Calendar, Spin } from "antd";

import type { DailyCalendarProps } from "./interface";

export function DailyCalendar({
  recordsByDate,
  isPending,
  error,
}: DailyCalendarProps) {
  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        title="โหลดข้อมูลไม่สำเร็จ"
        description={error}
      />
    );
  }

  return (
    <Spin spinning={isPending}>
      <Calendar
        className="daily-calendar"
        cellRender={(date, info) => {
          if (info.type !== "date") {
            return null;
          }

          const record = recordsByDate.get(date.format("YYYY-MM-DD"));

          if (!record) {
            return null;
          }

          return (
            <div className="daily-cell">
              <span className="daily-cell-time">
                {record.startTime}–{record.endTime}
              </span>
              <span className="daily-cell-meta">
                {record.durationMinutes} นาที ·{" "}
                {record.userName || record.userId || "-"}
              </span>
            </div>
          );
        }}
      />
    </Spin>
  );
}
