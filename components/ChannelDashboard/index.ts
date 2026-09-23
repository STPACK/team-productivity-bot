"use client";

import { ChannelDashboard } from "./ChannelDashboard";
import { withChannelDashboard } from "./withChannelDashboard";

const ConnectedChannelDashboard = withChannelDashboard(ChannelDashboard);

export { ConnectedChannelDashboard as ChannelDashboard };