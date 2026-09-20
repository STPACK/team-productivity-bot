import assert from "node:assert/strict";
import test from "node:test";
import { createIssueRecordData } from "./channel-records.ts";

test("creates an issue record optimized for creator and asked-member queries", () => {
  const record = createIssueRecordData({
    channel: { channelId: "C-CHANNEL", channelName: "dev" },
    userId: "U-CREATOR",
    userName: "pack",
    problem: "blocked",
    blocking: "release",
    askUserIds: ["U-ONE", "U-TWO"],
    askUserNames: ["one", "two"],
    need: "review",
    minutes: 15,
    note: "today",
    createdDate: "2026-09-21",
    timezone: "Asia/Bangkok",
  });

  assert.deepEqual(record.createdBy, {
    userId: "U-CREATOR",
    userName: "pack",
  });
  assert.deepEqual(record.askedUserIds, ["U-ONE", "U-TWO"]);
  assert.deepEqual(record.askedUsers, [
    { userId: "U-ONE", userName: "one" },
    { userId: "U-TWO", userName: "two" },
  ]);
  assert.equal(record.createdDate, "2026-09-21");
});
