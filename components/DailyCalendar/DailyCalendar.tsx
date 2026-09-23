"use client";

import React from "react";
import { Alert, Calendar, InputNumber, Spin, Statistic } from "antd";

import type { DailyCalendarProps } from "./interface";

export function DailyCalendar({
  recordsByDate,
  summary,
  targetMinutes,
  onTargetChange,
  onMonthChange,
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
        onPanelChange={(date) => onMonthChange(date.format("YYYY-MM"))}
        cellRender={(date, info) => {
          if (info.type !== "date") {
            return null;
          }

          const record = recordsByDate.get(date.format("YYYY-MM-DD"));

          if (!record) {
            return null;
          }

          const passed = record.durationMinutes <= targetMinutes;

          return (
            <div className={`daily-cell${passed ? "" : " daily-cell-over"}`}>
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

      <div className="daily-summary">
        <div className="daily-summary-target">
          <span className="daily-summary-label">Target ต่อวัน</span>
          <InputNumber
            min={1}
            max={480}
            step={5}
            value={targetMinutes}
            onChange={(value) => onTargetChange(value ?? 0)}
            suffix="นาที"
          />
        </div>
        <Statistic
          title="วันที่บันทึก"
          value={summary.recordedDays}
          suffix={`/ ${summary.daysInMonth} วัน`}
        />
        <Statistic
          title={`วันที่ผ่าน (ไม่เกิน ${targetMinutes} นาที)`}
          value={summary.passedDays}
          suffix={`วัน · ${summary.passedPercent}% ของวันที่บันทึก`}
        />
      </div>
    </Spin>
  );
}
