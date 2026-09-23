"use client";

import { DailyCalendar } from "./DailyCalendar";
import { withDailyCalendar } from "./withDailyCalendar";

const ConnectedDailyCalendar = withDailyCalendar(DailyCalendar);

export { ConnectedDailyCalendar as DailyCalendar };