import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { agencies, recipients, requesters, requests } from '@/db/schema';
import { ageYears, fiscalMonthOf, fiscalYearOf } from '@/lib/format';

/** One month of the fiscal year. ch = children under 18, ad = adults. */
export type MonthRow = { ch: number; ad: number; rec: number; fil: number; dec: number };

export type ReportData = {
  /** Fiscal years with any activity, newest first. */
  years: number[];
  /** The fiscal year in progress right now. */
  currentFy: number;
  /** Rows per fiscal year: 12 for a finished year, fewer for the one in progress. */
  byYear: Record<number, MonthRow[]>;
  /** Requests received in each fiscal year, by where they came from. */
  agencies: Record<number, [string, number][]>;
};

const blank = (): MonthRow => ({ ch: 0, ad: 0, rec: 0, fil: 0, dec: 0 });

const SELF_REFERRED = 'Requested directly by household';

/**
 * Figures for the monthly and year-to-date report.
 *
 * The fiscal year runs 1 July to 30 June, keyed by the calendar year it
 * starts in, so "year to date" means since 1 July and never since 1 January.
 *
 * People are counted in the month the request was FILLED, not received -- a
 * request filled in a later month belongs to the month the clothing actually
 * went out. Requests received and declined are counted on their own dates.
 */
export async function loadReport(): Promise<ReportData> {
  const rows = await db
    .select({
      id: requests.id,
      receivedOn: requests.receivedOn,
      filledOn: requests.filledOn,
      declinedOn: requests.declinedOn,
      agencyName: agencies.name,
    })
    .from(requests)
    .innerJoin(requesters, eq(requests.requesterId, requesters.id))
    .leftJoin(agencies, eq(requesters.agencyId, agencies.id));

  const people = await db
    .select({
      requestId: recipients.requestId,
      ageValue: recipients.ageValue,
      ageUnit: recipients.ageUnit,
    })
    .from(recipients);

  // Children under 18 vs adults, per request.
  const split = new Map<string, { ch: number; ad: number }>();
  for (const p of people) {
    const s = split.get(p.requestId) ?? { ch: 0, ad: 0 };
    if (ageYears(p) < 18) s.ch += 1;
    else s.ad += 1;
    split.set(p.requestId, s);
  }

  const now = new Date();
  const currentFy = fiscalYearOf(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
  );
  const currentMonth = fiscalMonthOf(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
  );

  const byYear: Record<number, MonthRow[]> = {};
  const agencyCounts: Record<number, Map<string, number>> = {};

  const ensure = (fy: number): MonthRow[] => {
    if (!byYear[fy]) {
      // The year in progress stops at the current month; a finished year has
      // all twelve.
      const months = fy === currentFy ? currentMonth + 1 : 12;
      byYear[fy] = Array.from({ length: months }, blank);
      agencyCounts[fy] = new Map();
    }
    return byYear[fy];
  };

  for (const r of rows) {
    const fy = fiscalYearOf(r.receivedOn);
    const m = fiscalMonthOf(r.receivedOn);
    const year = ensure(fy);
    if (year[m]) year[m].rec += 1;

    const label = r.agencyName ?? SELF_REFERRED;
    agencyCounts[fy].set(label, (agencyCounts[fy].get(label) ?? 0) + 1);

    if (r.filledOn) {
      const ffy = fiscalYearOf(r.filledOn);
      const fm = fiscalMonthOf(r.filledOn);
      const fyear = ensure(ffy);
      if (fyear[fm]) {
        fyear[fm].fil += 1;
        const s = split.get(r.id);
        if (s) {
          fyear[fm].ch += s.ch;
          fyear[fm].ad += s.ad;
        }
      }
    }

    if (r.declinedOn) {
      const dfy = fiscalYearOf(r.declinedOn);
      const dm = fiscalMonthOf(r.declinedOn);
      const dyear = ensure(dfy);
      if (dyear[dm]) dyear[dm].dec += 1;
    }
  }

  // The current fiscal year is always offered, even before the first request
  // of it arrives -- an empty report is a truthful one.
  ensure(currentFy);

  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

  const agencyOut: Record<number, [string, number][]> = {};
  for (const fy of years) {
    agencyOut[fy] = [...(agencyCounts[fy] ?? new Map()).entries()].sort((a, b) => b[1] - a[1]);
  }

  return { years, currentFy, byYear, agencies: agencyOut };
}
