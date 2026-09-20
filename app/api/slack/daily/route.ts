type SlackViewsOpenResponse = {
  ok: boolean;
  error?: string;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const triggerId = formData.get("trigger_id");

  if (typeof triggerId !== "string" || !triggerId) {
    return Response.json({ error: "trigger_id is required" }, { status: 400 });
  }

  if (!process.env.SLACK_BOT_TOKEN) {
    return Response.json(
      { error: "SLACK_BOT_TOKEN is not configured" },
      { status: 500 },
    );
  }

  const timezone = process.env.SLACK_TIMEZONE ?? "Asia/Bangkok";
  const response = await fetch("https://slack.com/api/views.open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      trigger_id: triggerId,
      view: {
        type: "modal",
        callback_id: "daily_create",
        title: {
          type: "plain_text",
          text: "Daily",
        },
        submit: {
          type: "plain_text",
          text: "ส่ง",
        },
        close: {
          type: "plain_text",
          text: "ยกเลิก",
        },
        blocks: [
          {
            type: "input",
            block_id: "start_time",
            label: {
              type: "plain_text",
              text: "เวลาเริ่มต้น",
            },
            hint: {
              type: "plain_text",
              text: "ระบุเวลาได้ละเอียดเป็นนาที เช่น 09:00",
            },
            element: {
              type: "timepicker",
              action_id: "start_time_input",
              timezone,
              placeholder: {
                type: "plain_text",
                text: "เช่น 09:00",
              },
            },
          },
          {
            type: "input",
            block_id: "end_time",
            label: {
              type: "plain_text",
              text: "เวลาสิ้นสุด",
            },
            hint: {
              type: "plain_text",
              text: "ระบุเวลาได้ละเอียดเป็นนาที เช่น 09:34",
            },
            element: {
              type: "timepicker",
              action_id: "end_time_input",
              timezone,
              placeholder: {
                type: "plain_text",
                text: "เช่น 09:34",
              },
            },
          },
        ],
      },
    }),
  });

  const result = (await response.json()) as SlackViewsOpenResponse;

  if (!response.ok || !result.ok) {
    console.error("Unable to open daily modal:", result.error);

    return Response.json(
      { error: result.error ?? "Unable to open daily modal" },
      { status: 502 },
    );
  }

  return new Response(null, { status: 200 });
}
