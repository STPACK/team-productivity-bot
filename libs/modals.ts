import type {
  DailyTimeRange,
  SlackChannelContext,
  SlackModal,
} from "@/models/slack-api";

export function createIssueModal(context: SlackChannelContext): SlackModal {
  return {
    type: "modal",
    callback_id: "issue_create",
    private_metadata: JSON.stringify(context),
    title: { type: "plain_text", text: "Create Issue Log" },
    submit: { type: "plain_text", text: "ส่ง" },
    close: { type: "plain_text", text: "ยกเลิก" },
    blocks: [
      {
        type: "input",
        block_id: "problem",
        label: { type: "plain_text", text: "Problem" },
        element: {
          type: "plain_text_input",
          action_id: "problem_input",
          placeholder: { type: "plain_text", text: "ติดอะไร" },
        },
      },
      {
        type: "input",
        block_id: "blocking",
        label: { type: "plain_text", text: "Blocking" },
        element: {
          type: "plain_text_input",
          action_id: "blocking_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "ใครรอ ทำอะไรต่อไม่ได้",
          },
        },
      },
      {
        type: "input",
        block_id: "ask",
        label: { type: "plain_text", text: "Ask" },
        element: {
          type: "multi_users_select",
          action_id: "ask_select",
          placeholder: { type: "plain_text", text: "ขอใครช่วย" },
        },
      },
      {
        type: "input",
        block_id: "need",
        label: { type: "plain_text", text: "Need" },
        element: {
          type: "plain_text_input",
          action_id: "need_input",
          multiline: true,
          placeholder: { type: "plain_text", text: "อยากได้อะไรกลับมา" },
        },
      },
      {
        type: "input",
        block_id: "time",
        label: { type: "plain_text", text: "Time" },
        element: {
          type: "plain_text_input",
          action_id: "time_input",
          min_length: 1,
          placeholder: { type: "plain_text", text: "คุยกี่นาที เช่น 15" },
        },
      },
      {
        type: "input",
        block_id: "note",
        optional: true,
        label: { type: "plain_text", text: "Note" },
        element: {
          type: "plain_text_input",
          action_id: "note_input",
          multiline: true,
          placeholder: { type: "plain_text", text: "ข้อมูลเพิ่ม" },
        },
      },
    ],
  };
}

export function createDailyModal(
  context: SlackChannelContext,
  timeRange: DailyTimeRange,
): SlackModal {
  return {
    type: "modal",
    callback_id: "daily_create",
    private_metadata: JSON.stringify(context),
    title: { type: "plain_text", text: "Daily Meeting Time" },
    submit: { type: "plain_text", text: "ส่ง" },
    close: { type: "plain_text", text: "ยกเลิก" },
    blocks: [
      {
        type: "input",
        block_id: "start_time",
        label: { type: "plain_text", text: "เวลาเริ่มต้น" },
        hint: {
          type: "plain_text",
          text: "ระบุเวลาได้ละเอียดเป็นนาที เช่น 09:00",
        },
        element: {
          type: "timepicker",
          action_id: "start_time_input",
          initial_time: timeRange.startTime,
          placeholder: { type: "plain_text", text: "เช่น 09:00" },
        },
      },
      {
        type: "input",
        block_id: "end_time",
        label: { type: "plain_text", text: "เวลาสิ้นสุด" },
        hint: {
          type: "plain_text",
          text: "ระบุเวลาได้ละเอียดเป็นนาที เช่น 09:34",
        },
        element: {
          type: "timepicker",
          action_id: "end_time_input",
          initial_time: timeRange.endTime,
          placeholder: { type: "plain_text", text: "เช่น 09:34" },
        },
      },
    ],
  };
}
