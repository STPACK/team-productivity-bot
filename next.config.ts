import type { NextConfig } from "next";

// ponytail: Vercel rejects NEXT_PUBLIC_* names, and only that prefix gets inlined
// from .env. next.config `env` inlines any name at build time, so the browser
// bundle gets these without renaming anything in Vercel.
const clientEnvKeys = [
  "NEXT_FIREBASE_API_KEY",
  "NEXT_FIREBASE_AUTH_DOMAIN",
  "NEXT_FIREBASE_PROJECT_ID",
  "NEXT_FIREBASE_STORAGE_BUCKET",
  "NEXT_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_FIREBASE_APP_ID",
  "NEXT_FIREBASE_MEASUREMENT_ID",
  "NEXT_FIREBASE_ALLOWED_EMAIL_DOMAIN",
] as const;

const nextConfig: NextConfig = {
  env: Object.fromEntries(
    clientEnvKeys.map((key) => [key, process.env[key] ?? ""]),
  ),
};

export default nextConfig;
