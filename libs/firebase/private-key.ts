// ponytail: .env loaders strip surrounding quotes, Vercel stores the value verbatim.
// A key pasted as "-----BEGIN...\n-----END-----\n" therefore reaches us with the quotes
// still attached, and OpenSSL rejects it with ERR_OSSL_UNSUPPORTED. Normalise both the
// quoting and the \n escaping here so every paste shape lands on the same PEM.
export function normalizePrivateKey(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }

  // Only a matched pair is stripped — an unbalanced quote is left in place so cert()
  // fails loudly instead of us silently handing OpenSSL a half-mangled key.
  const quoted = /^(["'])([\s\S]*)\1$/.exec(raw.trim());

  return (quoted ? quoted[2] : raw).replace(/\\n/g, "\n");
}
