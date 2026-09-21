import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePrivateKey } from "./private-key.ts";

const PEM = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\n-----END PRIVATE KEY-----\n";
const ESCAPED = PEM.replace(/\n/g, "\\n");

test("passes a real PEM through untouched", () => {
  assert.equal(normalizePrivateKey(PEM), PEM);
});

test("unescapes \\n sequences", () => {
  assert.equal(normalizePrivateKey(ESCAPED), PEM);
});

test("strips wrapping quotes Vercel keeps verbatim", () => {
  assert.equal(normalizePrivateKey(`"${ESCAPED}"`), PEM);
  assert.equal(normalizePrivateKey(`'${ESCAPED}'`), PEM);
  assert.equal(normalizePrivateKey(`"${PEM}"`), PEM);
});

test("leaves unbalanced quotes alone rather than corrupting the key", () => {
  assert.equal(normalizePrivateKey(`"${PEM}`), `"${PEM}`);
});

test("returns undefined when unset", () => {
  assert.equal(normalizePrivateKey(undefined), undefined);
  assert.equal(normalizePrivateKey(""), undefined);
});
