"use client";

import type { FC } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { App } from "antd";
import { signOut } from "firebase/auth";
import { getFirebaseClientAuth } from "@/libs/firebase/client";
import type {
  DashboardUserProps,
  WithDashboardUserProps,
} from "./interface";

export function withDashboardUser(Component: FC<DashboardUserProps>) {
  function WithDashboardUser({ email }: WithDashboardUserProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { message } = App.useApp();

    const onSignOut = useCallback(async () => {
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
    }, [message, router]);

    return (
      <Component email={email} isLoading={isLoading} onSignOut={onSignOut} />
    );
  }

  return WithDashboardUser;
}
