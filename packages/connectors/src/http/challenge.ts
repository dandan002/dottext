/**
 * Recognize bot-protection challenges so they are reported as `blocked` and never
 * parsed as content (or, worse, as "no new documents"). We do not attempt to solve
 * or evade challenges; the response is to back off and report.
 *
 * Signatures were taken from responses observed on 2026-11-17. Note that real
 * banrep.gov.co pages also embed the Radware connector script (`__uzdbm_`,
 * `stormcaster.js`, `validate.perfdrive.com`), so those strings alone are NOT a
 * challenge signal.
 */

export type ChallengeVendor = 'radware_shieldsquare' | 'imperva_incapsula' | 'repository_human_check';

export interface ChallengeMatch {
  vendor: ChallengeVendor;
  evidence: string;
}

const CHALLENGE_HOSTS: Array<[RegExp, ChallengeVendor]> = [[/(^|\.)perfdrive\.com$/i, 'radware_shieldsquare']];

export function challengeForRedirect(location: string): ChallengeMatch | null {
  let host: string;
  try {
    host = new URL(location).hostname;
  } catch {
    return null;
  }
  for (const [pattern, vendor] of CHALLENGE_HOSTS) {
    if (pattern.test(host)) return {vendor, evidence: `redirect to ${host}`};
  }
  return null;
}

/** Inspect an HTML-ish body (first ~64 KiB is enough) for challenge pages. */
export function challengeForBody(body: string, contentType: string | null): ChallengeMatch | null {
  if (contentType && !/html|text\/plain|xml/i.test(contentType)) return null;
  const title = /<title>\s*([^<]{0,120})/i.exec(body)?.[1]?.trim() ?? '';

  if (/^Radware\b/i.test(title)) {
    return {vendor: 'radware_shieldsquare', evidence: `title "${title}"`};
  }
  if (/^302 Found$/i.test(title) && /<center>\s*rdwr\s*<\/center>/i.test(body)) {
    return {vendor: 'radware_shieldsquare', evidence: 'soft 302 page signed rdwr'};
  }
  if (/Incapsula incident ID/i.test(body)) {
    return {vendor: 'imperva_incapsula', evidence: 'incident page'};
  }
  if (/_Incapsula_Resource/.test(body) && body.length < 10_000) {
    return {vendor: 'imperva_incapsula', evidence: 'JavaScript challenge shell'};
  }
  if (/tr[aá]fico automatizado/i.test(body) && /Comprobaci[oó]n de Seguridad/i.test(body)) {
    return {vendor: 'repository_human_check', evidence: 'repository verification page'};
  }
  return null;
}
