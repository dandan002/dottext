/** Query parameters that carry credentials in publisher APIs (e.g. BCCh BDE `token`, legacy `user`/`pass`). */
export const DEFAULT_SECRET_PARAMS = ['token', 'user', 'pass', 'password', 'apikey', 'api_key', 'key'];

/** Replace secret query values so URLs are safe for logs, errors, and stored reports. */
export function redactUrl(url: string, secretParams: readonly string[] = DEFAULT_SECRET_PARAMS): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return '[unparseable-url]';
  }
  const lower = new Set(secretParams.map((p) => p.toLowerCase()));
  for (const name of [...parsed.searchParams.keys()]) {
    if (lower.has(name.toLowerCase())) parsed.searchParams.set(name, 'REDACTED');
  }
  if (parsed.username || parsed.password) {
    parsed.username = 'REDACTED';
    parsed.password = '';
  }
  return parsed.toString();
}

/** Remove any literal secret values from free text (error messages from fetch can echo URLs). */
export function redactText(text: string, secrets: readonly string[]): string {
  let out = text;
  for (const secret of secrets) {
    if (secret.length >= 4) out = out.split(secret).join('REDACTED');
  }
  return out;
}
