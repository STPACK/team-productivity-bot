export function normalizePrivateKey(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }

  const quoted = /^(["'])([\s\S]*)\1$/.exec(raw.trim());

  return (quoted ? quoted[2] : raw).replace(/\\n/g, "\n");
}
