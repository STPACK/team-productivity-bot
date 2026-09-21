import { NextResponse } from "next/server";
import { getFirebaseAuth } from "@/libs/firebase/admin";
import { isAllowedCompanyIdentity } from "@/libs/auth/policy";
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from "@/libs/auth/session";

const RECENT_SIGN_IN_SECONDS = 5 * 60;

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  return origin !== null && origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { idToken?: unknown };

    if (typeof body.idToken !== "string" || !body.idToken) {
      return Response.json({ error: "ID token is required" }, { status: 400 });
    }

    const firebaseAuth = getFirebaseAuth();
    const claims = await firebaseAuth.verifyIdToken(body.idToken);
    const tokenAgeSeconds = Date.now() / 1000 - claims.auth_time;

    if (
      !isAllowedCompanyIdentity(claims) ||
      tokenAgeSeconds < -60 ||
      tokenAgeSeconds > RECENT_SIGN_IN_SECONDS
    ) {
      return Response.json(
        { error: "กรุณาเข้าสู่ระบบด้วยบัญชีบริษัท" },
        { status: 403 },
      );
    }

    const sessionCookie = await firebaseAuth.createSessionCookie(body.idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
    const response = NextResponse.json({ ok: true });

    response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_MS / 1000,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Unable to create Firebase session", error);
    return Response.json(
      { error: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองอีกครั้ง" },
      { status: 401 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
