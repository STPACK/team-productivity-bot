import type { DailyRecord } from "@/models/dashboard";

export const DEFAULT_TARGET_MINUTES = 30;

export interface DailySummary {
  daysInMonth: number;
  recordedDays: number;
  passedDays: number;
  passedPercent: number;
}

export function getDaysInMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
    return 0;
  }

  // Day 0 of the next month is the last day of this one, which also settles leap years.
  return new Date(year, monthNumber, 0).getDate();
}

export function summariseMonth(
  records: DailyRecord[],
  month: string,
  targetMinutes: number,
): DailySummary {
  const daysInMonth = getDaysInMonth(month);
  // Dates are stored as YYYY-MM-DD, so the trailing dash keeps the prefix exact.
  const monthRecords = records.filter((record) =>
    record.date.startsWith(`${month}-`),
  );
  const passedDays = monthRecords.filter(
    (record) => record.durationMinutes <= targetMinutes,
  ).length;

  return {
    daysInMonth,
    recordedDays: monthRecords.length,
    passedDays,
    // Measured against the days that actually have a submission, so a month that
    // is only half filled in is not scored as half failed.
    passedPercent: monthRecords.length
      ? Math.round((passedDays / monthRecords.length) * 100)
      : 0,
  };
}
