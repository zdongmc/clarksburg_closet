import { asc, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { agencies, recipients, requesters, requests } from '@/db/schema';
import type { DeclineReason, RequestStatus } from '@/db/schema';
import {
  adultSizeFlag,
  ageLine,
  diaperText,
  pantText,
  requestNumber,
  shirtText,
  shoeText,
} from '@/lib/format';

/** One recipient, already reduced to the strings the queue and the PDF print. */
export type QueuePerson = {
  name: string;
  /** "Girl · 9 yr" */
  age: string;
  /** null means "Not needed" -- a decision someone recorded, not a blank. */
  shirt: string | null;
  pant: string | null;
  shoe: string | null;
  diaper: string | null;
  /** The adult-size-for-a-child note, if it applies. */
  flag: string | null;
  itemsNeeded: string;
};

export type QueueRequest = {
  id: string;
  number: string;
  name: string;
  org: string | null;
  phone: string;
  email: string;
  receivedOn: string;
  status: RequestStatus;
  crisis: boolean;
  prayer: string;
  notes: string;
  notesUpdatedAt: string | null;
  printedOn: string | null;
  filledOn: string | null;
  declinedOn: string | null;
  declineReason: DeclineReason | null;
  declineNote: string;
  people: QueuePerson[];
};

/**
 * The whole queue, shaped for display.
 *
 * Everything is loaded at once and filtered in the browser. That is a
 * deliberate fit to the scale: the closet takes a few hundred requests a year,
 * and holding them all is what makes "pull up records" instant -- a volunteer
 * starting a new request can search a phone number, an email, an agency or a
 * request number and see the household's last order without a round trip.
 * Revisit if the table ever runs to five figures.
 */
export async function loadQueue(): Promise<QueueRequest[]> {
  const rows = await db
    .select({
      req: requests,
      requester: requesters,
      agencyName: agencies.name,
    })
    .from(requests)
    .innerJoin(requesters, eq(requests.requesterId, requesters.id))
    .leftJoin(agencies, eq(requesters.agencyId, agencies.id))
    .orderBy(desc(requests.receivedOn), desc(requests.seq));

  if (!rows.length) return [];

  const people = await db
    .select()
    .from(recipients)
    .orderBy(asc(recipients.requestId), asc(recipients.position));

  const byRequest = new Map<string, QueuePerson[]>();
  for (const p of people) {
    const list = byRequest.get(p.requestId) ?? [];
    list.push({
      name: p.name,
      age: ageLine(p),
      shirt: shirtText(p),
      pant: pantText(p),
      shoe: shoeText(p),
      diaper: diaperText(p),
      flag: adultSizeFlag(p),
      itemsNeeded: p.itemsNeeded,
    });
    byRequest.set(p.requestId, list);
  }

  return rows.map(({ req, requester, agencyName }) => ({
    id: req.id,
    number: requestNumber(req),
    name: requester.name,
    org: agencyName,
    phone: requester.phone,
    email: requester.email,
    receivedOn: req.receivedOn,
    status: req.status,
    crisis: req.crisis,
    prayer: req.prayer,
    notes: req.notes,
    notesUpdatedAt: req.notesUpdatedAt ? req.notesUpdatedAt.toISOString().slice(0, 10) : null,
    printedOn: req.printedOn,
    filledOn: req.filledOn,
    declinedOn: req.declinedOn,
    declineReason: req.declineReason,
    declineNote: req.declineNote,
    people: byRequest.get(req.id) ?? [],
  }));
}
