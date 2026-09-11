/**
 * Volunteer access is a single shared passcode, not per-person sign-in.
 *
 * That was a deliberate choice: the closet wanted the queue gated without
 * asking volunteers to hold accounts. The consequence is that nothing records
 * WHICH volunteer filled a request or wrote a note -- the open question in
 * CLAUDE.md stays open, and this is the file to revisit when it is answered.
 *
 * The cookie carries only an expiry, signed with SESSION_SECRET. There is no
 * identity in it to steal, and a rotated secret logs everyone out.
 */

export const SESSION_COOKIE = 'cc_volunteer';
export const SESSION_DAYS = 30;

const encoder = new TextEncoder();

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sign(payload: string, secret: string): Promise<string> {
  return hex(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload)));
}

export async function mintSession(secret: string): Promise<string> {
  const exp = String(Date.now() + SESSION_DAYS * 86400_000);
  return `${exp}.${await sign(exp, secret)}`;
}

export async function verifySession(value: string | undefined, secret: string): Promise<boolean> {
  if (!value || !secret) return false;
  const [exp, mac] = value.split('.');
  if (!exp || !mac) return false;
  if (!Number(exp) || Number(exp) < Date.now()) return false;
  const expected = await sign(exp, secret);
  // Length-safe comparison; both sides are fixed-width hex.
  if (expected.length !== mac.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ mac.charCodeAt(i);
  return diff === 0;
}

/** Constant-time-ish passcode check, so timing does not leak its length. */
export function passcodeMatches(given: string, expected: string): boolean {
  if (!expected) return false;
  const a = encoder.encode(given);
  const b = encoder.encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}
