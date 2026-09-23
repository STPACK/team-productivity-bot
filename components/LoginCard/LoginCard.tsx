"use client";

import React from "react";
import { Button, Card, Typography } from "antd";
import { ALLOWED_COMPANY_DOMAIN } from "@/libs/auth/policy";

import type { LoginCardProps } from "./interface";

export function LoginCard({ isLoading, onSignIn }: LoginCardProps) {
  return (
    <Card className="login-card">
      <div className="login-logo">TP</div>
      <Typography.Title level={2}>Team Productivity</Typography.Title>
      <Typography.Paragraph type="secondary">
        เข้าสู่ระบบด้วยบัญชี Google ของบริษัท
      </Typography.Paragraph>
      <Button
        block
        size="large"
        type="primary"
        loading={isLoading}
        onClick={onSignIn}
      >
        เข้าสู่ระบบด้วย Google
      </Button>
      <Typography.Text className="login-domain" type="secondary">
        อนุญาตเฉพาะ @{ALLOWED_COMPANY_DOMAIN}
      </Typography.Text>
    </Card>
  );
}
