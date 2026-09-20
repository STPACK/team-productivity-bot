export async function POST(request: Request) {
  const formData = await request.formData();

  const triggerId = formData.get("trigger_id");

  const response = await fetch("https://slack.com/api/views.open", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trigger_id: triggerId,
      view: {
        type: "modal",
        callback_id: "issue_create",
        title: {
          type: "plain_text",
          text: "ขอความช่วยเหลือ",
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
            block_id: "problem",
            label: {
              type: "plain_text",
              text: "Problem",
            },
            element: {
              type: "plain_text_input",
              action_id: "problem_input",
              placeholder: {
                type: "plain_text",
                text: "ติดอะไร",
              },
            },
          },
          {
            type: "input",
            block_id: "blocking",
            label: {
              type: "plain_text",
              text: "Blocking",
            },
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
            label: {
              type: "plain_text",
              text: "Ask",
            },
            element: {
              type: "users_select",
              action_id: "ask_select",
              placeholder: {
                type: "plain_text",
                text: "ขอใครช่วย",
              },
            },
          },
          {
            type: "input",
            block_id: "need",
            label: {
              type: "plain_text",
              text: "Need",
            },
            element: {
              type: "plain_text_input",
              action_id: "need_input",
              multiline: true,
              placeholder: {
                type: "plain_text",
                text: "อยากได้อะไรกลับมา",
              },
            },
          },
          {
            type: "input",
            block_id: "time",
            label: {
              type: "plain_text",
              text: "Time",
            },
            element: {
              type: "number_input",
              action_id: "time_input",
              is_decimal_allowed: false,
              min_value: "1",
              placeholder: {
                type: "plain_text",
                text: "คุยกี่นาที",
              },
            },
          },
          {
            type: "input",
            block_id: "note",
            optional: true,
            label: {
              type: "plain_text",
              text: "Note",
            },
            element: {
              type: "plain_text_input",
              action_id: "note_input",
              multiline: true,
              placeholder: {
                type: "plain_text",
                text: "ข้อมูลเพิ่ม",
              },
            },
          },
        ],
      },
    }),
  });

  const result = await response.json();

  console.log("views.open result:", result);

  return new Response("", { status: 200 });
}

export async function GET() {
  return Response.json({
    status: "ok",
    route: "/api/slack/issue",
  });
}
