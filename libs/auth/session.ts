import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAuth } from "@/libs/firebase/admin";
import { isAllowedCompanyIdentity } from "@/libs/auth/policy";

export const SESSION_COOKIE_NAME = "__session";
export const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

export type SessionUser = {
  uid: string;
  email: string;
  name: string | null;
  picture: string | null;
};

function toSessionUser(claims: DecodedIdToken): SessionUser | null {
  if (!isAllowedCompanyIdentity(claims) || !claims.email) {
    return null;
  }

  return {
    uid: claims.uid,
    email: claims.email,
    name: typeof claims.name === "string" ? claims.name : null,
    picture: typeof claims.picture === "string" ? claims.picture : null,
  };
}

export async function getSessionUser() {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const claims = await getFirebaseAuth().verifySessionCookie(
      sessionCookie,
      true,
    );

    return toSessionUser(claims);
  } catch {
    return null;
  }
}

export async function requireSessionUser(returnPath = "/") {
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  return user;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
