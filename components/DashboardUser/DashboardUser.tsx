"use client";

import React from "react";
import { Button, Space, Typography } from "antd";

import type { DashboardUserProps } from "./interface";

export function DashboardUser({
  email,
  isLoading,
  onSignOut,
}: DashboardUserProps) {
  return (
    <Space className="dashboard-user" wrap>
      <Typography.Text type="secondary">{email}</Typography.Text>
      <Button loading={isLoading} onClick={onSignOut}>
        ออกจากระบบ
      </Button>
    </Space>
  );
}
