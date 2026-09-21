export const ALLOWED_COMPANY_DOMAIN =
  process.env.NEXT_FIREBASE_ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase() ||
  "sennalabs.com";

export type FirebaseIdentityClaims = {
  email?: string;
  email_verified?: boolean;
  firebase?: {
    sign_in_provider?: string;
  };
};

export function isAllowedCompanyIdentity(
  claims: FirebaseIdentityClaims,
  allowedDomain = ALLOWED_COMPANY_DOMAIN,
) {
  const email = claims.email?.trim().toLowerCase();
  const domain = allowedDomain.trim().toLowerCase();
  const emailDomain = email?.split("@")[1];

  return (
    Boolean(email) &&
    Boolean(domain) &&
    claims.email_verified === true &&
    claims.firebase?.sign_in_provider === "google.com" &&
    emailDomain === domain
  );
}
