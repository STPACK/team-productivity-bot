"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Typography } from "antd";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { ALLOWED_COMPANY_DOMAIN } from "@/libs/auth/policy";
import { getFirebaseClientAuth } from "@/libs/firebase/client";

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "auth/popup-closed-by-user"
  ) {
    return "ยกเลิกการเข้าสู่ระบบแล้ว";
  }

  return error instanceof Error
    ? error.message
    : "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองอีกครั้ง";
}

export function LoginCard({ nextPath }: { nextPath: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { message } = App.useApp();

  async function handleSignIn() {
    setIsLoading(true);
    let auth: Auth | null = null;

    try {
      auth = await getFirebaseClientAuth();
      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        hd: ALLOWED_COMPANY_DOMAIN,
        prompt: "select_account",
      });

      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "ไม่สามารถเข้าสู่ระบบได้");
      }

      await signOut(auth);
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      if (auth) {
        await signOut(auth).catch(() => undefined);
      }
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

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
        onClick={handleSignIn}
      >
        เข้าสู่ระบบด้วย Google
      </Button>
      <Typography.Text className="login-domain" type="secondary">
        อนุญาตเฉพาะ @{ALLOWED_COMPANY_DOMAIN}
      </Typography.Text>
    </Card>
  );
}
