import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveSubmissionIdentity,
  resolveSubmissionUserName,
} from "./slack-identity.ts";

test("keeps the requester identity captured by the slash command", () => {
  assert.deepEqual(
    resolveSubmissionIdentity("U-HUMAN", "pack", {
      id: "U-HUMAN",
      name: "pack",
      username: "pack",
    }),
    { userId: "U-HUMAN", userName: "pack" },
  );
});

test("uses the signed payload name when users.info cannot resolve the member", () => {
  assert.equal(resolveSubmissionUserName(undefined, "pack"), "pack");
});
