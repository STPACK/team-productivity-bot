import type {
  SlackApiResponse,
  SlackBlock,
  SlackMember,
  SlackModal,
  SlackUserInfoResponse,
} from "@/models/slack-api";

class SlackApiError extends Error {
  constructor(
    readonly method: string,
    readonly slackError: string,
    readonly needed?: string,
    readonly provided?: string,
  ) {
    super(`${method} failed: ${slackError}`);
    this.name = "SlackApiError";
  }
}

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
    throw new SlackApiError(
      method,
      result.error ?? `HTTP ${response.status}`,
      result.needed,
      result.provided,
    );
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
  source: string,
): Promise<SlackMember | null> {
  if (!userId) {
    return null;
  }

  try {
    const result = await callSlack<SlackUserInfoResponse>("users.info", {
      user: userId,
    });
    const name =
      result.user?.profile?.display_name ||
      result.user?.profile?.real_name ||
      result.user?.real_name ||
      result.user?.name;

    if (!name) {
      return null;
    }

    return {
      id: result.user?.id ?? userId,
      name,
    };
  } catch (error) {
    if (error instanceof SlackApiError && error.slackError === "user_not_found") {
      return null;
    }

    if (error instanceof SlackApiError) {
      console.error("Unable to fetch Slack member", {
        source,
        method: error.method,
        error: error.slackError,
        needed: error.needed,
        provided: error.provided,
      });
    } else {
      console.error("Unable to fetch Slack member", {
        source,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return null;
  }
}
