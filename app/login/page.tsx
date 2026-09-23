import { redirect } from "next/navigation";
import { LoginCard } from "@/components/LoginCard";
import { getSessionUser } from "@/libs/auth/session";

function safeNextPath(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value;

  return path?.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const nextPath = safeNextPath((await searchParams).next);
  const user = await getSessionUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="login-shell">
      <LoginCard nextPath={nextPath} />
    </main>
  );
}
