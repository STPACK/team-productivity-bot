import type {
  ChannelSummary,
  DailyRecord,
  IssueRecord,
} from "@/models/dashboard";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (response.status === 401 && typeof window !== "undefined") {
    const next = `${window.location.pathname}${window.location.search}`;
    const loginUrl = new URL("/login", window.location.origin);
    loginUrl.searchParams.set("next", next);
    window.location.assign(loginUrl.toString());
    throw new Error("Session expired");
  }

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(result?.error ?? "Unable to load data");
  }

  return response.json() as Promise<T>;
}

export async function getChannels() {
  const result = await getJson<{ channels: ChannelSummary[] }>("/api/channels");

  return result.channels;
}

export async function getChannel(channelId: string) {
  const result = await getJson<{ channel: ChannelSummary }>(
    `/api/channels/${encodeURIComponent(channelId)}`,
  );

  return result.channel;
}

export async function getDailyRecords(channelId: string) {
  const result = await getJson<{ daily: DailyRecord[] }>(
    `/api/channels/${encodeURIComponent(channelId)}/daily`,
  );

  return result.daily;
}

export async function getIssueRecords(channelId: string) {
  const result = await getJson<{ issues: IssueRecord[] }>(
    `/api/channels/${encodeURIComponent(channelId)}/issues`,
  );

  return result.issues;
}
