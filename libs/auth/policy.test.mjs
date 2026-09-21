import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedCompanyIdentity } from "./policy.ts";

const allowedIdentity = {
  email: "pack@sennalabs.com",
  email_verified: true,
  firebase: { sign_in_provider: "google.com" },
};

test("allows a verified Google identity from the exact company domain", () => {
  assert.equal(isAllowedCompanyIdentity(allowedIdentity, "sennalabs.com"), true);
});

test("normalizes email and configured domain casing", () => {
  assert.equal(
    isAllowedCompanyIdentity(
      { ...allowedIdentity, email: "PACK@SENNALABS.COM" },
      "Sennalabs.com",
    ),
    true,
  );
});

test("rejects a lookalike domain", () => {
  assert.equal(
    isAllowedCompanyIdentity(
      { ...allowedIdentity, email: "pack@sennalabs.com.example" },
      "sennalabs.com",
    ),
    false,
  );
});

test("rejects unverified and non-Google identities", () => {
  assert.equal(
    isAllowedCompanyIdentity(
      { ...allowedIdentity, email_verified: false },
      "sennalabs.com",
    ),
    false,
  );
  assert.equal(
    isAllowedCompanyIdentity(
      { ...allowedIdentity, firebase: { sign_in_provider: "password" } },
      "sennalabs.com",
    ),
    false,
  );
});
