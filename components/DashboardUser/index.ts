"use client";

import { DashboardUser } from "./DashboardUser";
import { withDashboardUser } from "./withDashboardUser";

const ConnectedDashboardUser = withDashboardUser(DashboardUser);

export { ConnectedDashboardUser as DashboardUser };