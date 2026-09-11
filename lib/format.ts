import { ADULT_GROUPS, NOT_NEEDED } from '@/lib/sizes';
import type { Recipient, Request } from '@/db/schema';

/** Middle dot, kept as an escape: a literal one arrived as mojibake twice. */
export const DOT = '·';

/**
 * The request number a volunteer reads aloud on the phone: "#2026-0413".
 * Composed rather than stored -- `seq` is a database identity column, so the
 * number can never collide, and the year comes from the date it was received.
 */
export function requestNumber(r: Pick<Request, 'seq' | 'receivedOn'>): string {
  return `${r.receivedOn.slice(0, 4)}-${String(r.seq).padStart(4, '0')}`;
}

/** Pull a sequence number out of whatever a volunteer typed into the search box. */
export function seqFromQuery(q: string): number | null {
  const m = q.match(/(\d{1,6})\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** A date-only column ("2026-09-10") rendered without a timezone slip. */
export function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysSince(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const then = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((today - then) / 86400000);
}

export function waitText(iso: string): string {
  const d = daysSince(iso);
  if (d <= 0) return 'today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

/** Age in whole years, for the sizing help and the adult-size note. */
export function ageYears(r: Pick<Recipient, 'ageValue' | 'ageUnit'>): number {
  return r.ageUnit === 'months' ? Math.floor(r.ageValue / 12) : Math.floor(r.ageValue);
}

/** "Girl {DOT} 9 yr", "Boy {DOT} 8 mo", "Woman {DOT} 38 yr". */
export function ageLine(r: Pick<Recipient, 'ageValue' | 'ageUnit' | 'gender'>): string {
  const years = ageYears(r);
  const adult = years >= 18;
  const who = r.gender === 'male' ? (adult ? 'Man' : 'Boy') : adult ? 'Woman' : 'Girl';
  const unit = r.ageUnit === 'months' ? 'mo' : 'yr';
  return `${who} ${DOT} ${r.ageValue} ${unit}`;
}

// Baby and toddler codes say what they are on their own face; a bare number
// does not, which is the whole failure the paper form had.
const SELF_EVIDENT = new Set(['Baby', 'Toddler']);

function withGroup(value: string, group: string | null): string {
  if (!group || SELF_EVIDENT.has(group)) return value;
  const short = group === 'Juniors (teen girls, odd sizes)' ? 'Juniors' : group;
  return `${value} ${DOT} ${short}`;
}

/**
 * Size strings for the queue and the pick sheet. `null` means the slip should
 * read "Not needed" -- which is a decision someone recorded, not a blank.
 */
export function shirtText(p: Recipient): string | null {
  if (!p.shirtSize || p.shirtSize === NOT_NEEDED) return null;
  return withGroup(p.shirtSize, p.shirtGroup);
}

export function pantText(p: Recipient): string | null {
  if (p.pantWaist && p.pantInseam) return `${p.pantWaist} × ${p.pantInseam} ${DOT} Men's`;
  if (p.pantWaist) return `${p.pantWaist}" waist ${DOT} Men's`;
  if (!p.pantSize || p.pantSize === NOT_NEEDED) return null;
  return withGroup(p.pantSize, p.pantGroup);
}

export function shoeText(p: Recipient): string | null {
  const s = (p.shoeSizes ?? []).filter((x) => x && x !== NOT_NEEDED);
  return s.length ? s.join(` ${DOT} `) : null;
}

export function diaperText(p: Recipient): string | null {
  return p.diaperSize && p.diaperSize !== NOT_NEEDED ? p.diaperSize : null;
}

/**
 * The note a volunteer sees when a child has been given an adult size. Not a
 * correction: the requester confirmed it on the form. It is here so the
 * volunteer picks styles a 12-year-old will actually wear.
 */
export function adultSizeFlag(p: Recipient): string | null {
  const years = ageYears(p);
  if (years >= 13) return null;
  const adult =
    (p.shirtGroup && ADULT_GROUPS.includes(p.shirtGroup)) ||
    (p.pantGroup && ADULT_GROUPS.includes(p.pantGroup)) ||
    !!p.pantWaist;
  if (!adult) return null;
  return `Adult sizes for a ${years}-year-old — pick age-appropriate styles.`;
}

// ---------------------------------------------------------------------------
// Fiscal year: 1 July - 30 June, keyed by the calendar year it STARTS in.
// FY 2026 means Jul 2026 - Jun 2027, displayed "FY 2026-27", and "year to
// date" means since 1 July, never since 1 January.
// ---------------------------------------------------------------------------

export const FY_MONTHS = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];

export const FY_MONTHS_FULL = ['July','August','September','October','November','December',
  'January','February','March','April','May','June'];

export function fyLabel(fy: number): string {
  return `FY ${fy}–${String(fy + 1).slice(2)}`;
}

/** Months 0-5 fall in the starting calendar year, 6-11 in the next one. */
export function calYear(fy: number, i: number): number {
  return i < 6 ? fy : fy + 1;
}

export function monthLabel(fy: number, i: number): string {
  return `${FY_MONTHS[i]} ${calYear(fy, i)}`;
}

/** Which fiscal year a date falls in. July onward starts a new one. */
export function fiscalYearOf(iso: string): number {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return m >= 7 ? y : y - 1;
}

/** 0-11 index within the fiscal year, Jul = 0. */
export function fiscalMonthOf(iso: string): number {
  const m = Number(iso.slice(5, 7));
  return m >= 7 ? m - 7 : m + 5;
}
