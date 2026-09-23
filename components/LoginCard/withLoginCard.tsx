"use client";

import type { FC } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "antd";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { ALLOWED_COMPANY_DOMAIN } from "@/libs/auth/policy";
import { getFirebaseClientAuth } from "@/libs/firebase/client";
import type { LoginCardProps, WithLoginCardProps } from "./interface";

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

export function withLoginCard(Component: FC<LoginCardProps>) {
  function WithLoginCard({ nextPath }: WithLoginCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { message } = App.useApp();

    const onSignIn = useCallback(async () => {
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
    }, [message, nextPath, router]);

    return <Component isLoading={isLoading} onSignIn={onSignIn} />;
  }

  return WithLoginCard;
}
