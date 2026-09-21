import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, test } from "node:test";
import { isValidSlackRequest } from "./requests.ts";

const SECRET = "8f742231b10e8888abcd99yyyzzz85a5";
const BODY = "payload=%7B%22type%22%3A%22block_actions%22%7D";

function slackRequest(
  body: string,
  {
    secret = SECRET,
    timestamp = Math.floor(Date.now() / 1000),
    signature,
  }: { secret?: string; timestamp?: number; signature?: string } = {},
) {
  const sig =
    signature ??
    `v0=${createHmac("sha256", secret).update(`v0:${timestamp}:${body}`).digest("hex")}`;

  return new Request("https://example.com/api/slack/interactions", {
    method: "POST",
    headers: {
      "x-slack-request-timestamp": String(timestamp),
      "x-slack-signature": sig,
    },
    body,
  });
}

afterEach(() => {
  process.env.SLACK_SIGNING_SECRET = SECRET;
});
process.env.SLACK_SIGNING_SECRET = SECRET;

test("accepts a correctly signed Slack request", () => {
  assert.equal(isValidSlackRequest(slackRequest(BODY), BODY), true);
});

test("rejects when the configured secret is wrong", () => {
  const request = slackRequest(BODY, { secret: "0000000000000000000000000000cafe" });
  assert.equal(isValidSlackRequest(request, BODY), false);
});

test("rejects a secret stored with wrapping quotes", () => {
  const request = slackRequest(BODY);
  process.env.SLACK_SIGNING_SECRET = `"${SECRET}"`;
  assert.equal(isValidSlackRequest(request, BODY), false);
});

test("rejects a secret stored with a trailing newline", () => {
  const request = slackRequest(BODY);
  process.env.SLACK_SIGNING_SECRET = `${SECRET}\n`;
  assert.equal(isValidSlackRequest(request, BODY), false);
});

test("rejects when SLACK_SIGNING_SECRET is unset", () => {
  const request = slackRequest(BODY);
  delete process.env.SLACK_SIGNING_SECRET;
  assert.equal(isValidSlackRequest(request, BODY), false);
});

test("rejects a replayed request older than 5 minutes", () => {
  const stale = Math.floor(Date.now() / 1000) - 60 * 6;
  assert.equal(isValidSlackRequest(slackRequest(BODY, { timestamp: stale }), BODY), false);
});

test("rejects a tampered body", () => {
  const request = slackRequest(BODY);
  assert.equal(isValidSlackRequest(request, `${BODY}&evil=1`), false);
});

test("rejects missing signature headers", () => {
  const bare = new Request("https://example.com/api/slack/interactions", { method: "POST", body: BODY });
  assert.equal(isValidSlackRequest(bare, BODY), false);
});
