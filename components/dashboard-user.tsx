"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Space, Typography } from "antd";
import { signOut } from "firebase/auth";
import { getFirebaseClientAuth } from "@/libs/firebase/client";

export function DashboardUser({ email }: { email: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { message } = App.useApp();

  async function handleSignOut() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Unable to clear session");
      }

      try {
        const auth = await getFirebaseClientAuth();
        await signOut(auth);
      } catch {
        // The server session is already cleared; client cleanup is best-effort.
      }
      router.replace("/login");
      router.refresh();
    } catch {
      message.error("ไม่สามารถออกจากระบบได้ กรุณาลองอีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Space className="dashboard-user" wrap>
      <Typography.Text type="secondary">{email}</Typography.Text>
      <Button loading={isLoading} onClick={handleSignOut}>
        ออกจากระบบ
      </Button>
    </Space>
  );
}
