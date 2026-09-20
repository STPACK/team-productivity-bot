import type {
  SlackApiResponse,
  SlackBlock,
  SlackMember,
  SlackModal,
  SlackUserInfoResponse,
} from "@/models/slack-api";

function getBotToken() {
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured");
  }

  return token;
}

async function callSlack<T extends SlackApiResponse>(
  method: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getBotToken()}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as T;

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? `${method} failed`);
  }

  return result;
}

export async function openSlackModal(triggerId: string, view: SlackModal) {
  await callSlack("views.open", { trigger_id: triggerId, view });
}

export async function postSlackMessage(
  channel: string,
  message: { text: string; blocks: SlackBlock[] },
) {
  await callSlack("chat.postMessage", { channel, ...message });
}

export async function getSlackMember(
  userId: string | undefined,
): Promise<SlackMember | null> {
  if (!userId) {
    return null;
  }

  try {
    const result = await callSlack<SlackUserInfoResponse>("users.info", {
      user: userId,
    });

    return {
      id: result.user?.id ?? userId,
      name:
        result.user?.profile?.display_name ||
        result.user?.profile?.real_name ||
        result.user?.real_name ||
        result.user?.name ||
        userId,
    };
  } catch {
    return { id: userId, name: userId };
  }
}
