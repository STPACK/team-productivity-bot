export type SlackPayloadIdentity = {
  id?: string;
  name?: string;
  username?: string;
};

export function resolveSubmissionIdentity(
  metadataUserId: string | null,
  metadataUserName: string | null,
  interactionUser?: SlackPayloadIdentity,
) {
  return {
    userId: metadataUserId ?? interactionUser?.id,
    userName:
      metadataUserName ?? interactionUser?.name ?? interactionUser?.username,
  };
}

export function resolveSubmissionUserName(
  slackApiName: string | undefined,
  payloadName: string | undefined,
) {
  return slackApiName ?? payloadName;
}
