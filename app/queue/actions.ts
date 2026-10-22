'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { db } from '@/db';
import {
  DECLINE_REASONS,
  RECIPIENT_FLAGS,
  REQUEST_STATUSES,
  recipients,
  requests,
} from '@/db/schema';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';
import { todayISO } from '@/lib/format';

/**
 * Every action re-checks the passcode session. The middleware already
 * redirects an unauthenticated browser away from /queue, but a server action
 * is a POST endpoint of its own and has to stand on its own feet.
 */
async function requireVolunteer() {
  const store = await cookies();
  const ok = await verifySession(
    store.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET ?? '',
  );
  if (!ok) throw new Error('Not signed in.');
}

const id = z.string().uuid();

async function patch(requestId: string, values: Partial<typeof requests.$inferInsert>) {
  await requireVolunteer();
  await db.update(requests).set(values).where(eq(requests.id, id.parse(requestId)));
  revalidatePath('/queue');
  revalidatePath('/reports');
}

/**
 * Crisis is a priority flag, not a status: it moves the request to the top of
 * the queue and prints on the sheet, and it lives on the request rather than
 * the requester -- an agency that sends one urgent case is not permanently
 * urgent. Volunteers set it; it is never visible on the request form.
 *
 * Marking crisis also gives every recipient on the request extra love. That
 * is a starting point, not a rule: each box can be unticked afterwards, and
 * clearing crisis leaves them as they are, since some may be deliberate.
 */
export async function setCrisis(requestId: string, on: boolean) {
  await patch(requestId, { crisis: on });
  if (on) {
    // 'extra-love' is last in RECIPIENT_FLAGS, so appending keeps list order.
    await db
      .update(recipients)
      .set({ flags: sql`array_append(${recipients.flags}, 'extra-love')` })
      .where(
        and(
          eq(recipients.requestId, id.parse(requestId)),
          sql`NOT ('extra-love' = ANY(${recipients.flags}))`,
        ),
      );
  }
}

/** Called once the PDF is actually in the volunteer's hands, not before. */
export async function markPrinted(requestId: string) {
  await patch(requestId, { status: 'progress', printedOn: todayISO() });
}

/** A request is filled or it is not: partial fulfilment does not exist. */
export async function markFilled(requestId: string) {
  await patch(requestId, { status: 'filled', filledOn: todayISO() });
}

export async function declineRequest(requestId: string, reason: string, note: string) {
  const parsed = z.enum(DECLINE_REASONS).parse(reason);
  await patch(requestId, {
    status: 'declined',
    declineReason: parsed,
    declineNote: note.slice(0, 500),
    declinedOn: todayISO(),
  });
}

export async function reopenRequest(requestId: string, hasPrinted: boolean) {
  await patch(requestId, {
    status: hasPrinted ? 'progress' : 'new',
    filledOn: null,
    declinedOn: null,
    declineReason: null,
    declineNote: '',
  });
}

/**
 * Volunteer notes: the closet's own record, never to be confused with the
 * requester's prayer request or a recipient's "items needed most". Can be
 * written at any point, including after a request is filled or declined.
 * Stores when it was last updated but not who wrote it.
 */
export async function saveNote(requestId: string, text: string) {
  const notes = text.trim().slice(0, 4000);
  await patch(requestId, {
    notes,
    notesUpdatedAt: notes ? new Date() : null,
  });
}

/**
 * A recipient's marks for whoever fills the order -- crisis, extra love,
 * include toiletries. Stored in list order whatever order they were ticked,
 * so the slip always prints them the same way.
 */
export async function setRecipientFlags(recipientId: string, flags: string[]) {
  await requireVolunteer();
  const chosen = new Set(z.array(z.enum(RECIPIENT_FLAGS)).parse(flags));
  await db
    .update(recipients)
    .set({ flags: RECIPIENT_FLAGS.filter((f) => chosen.has(f)) })
    .where(eq(recipients.id, id.parse(recipientId)));
  revalidatePath('/queue');
}

/** Undo, for the toast. Restores exactly the fields an action changed. */
export async function restoreRequest(
  requestId: string,
  prev: {
    status: string;
    crisis?: boolean;
    filledOn?: string | null;
    declinedOn?: string | null;
    declineReason?: string | null;
    declineNote?: string;
    notes?: string;
    notesUpdatedAt?: string | null;
  },
) {
  const status = z.enum(REQUEST_STATUSES).parse(prev.status);
  await patch(requestId, {
    status,
    ...(prev.crisis === undefined ? {} : { crisis: prev.crisis }),
    ...(prev.filledOn === undefined ? {} : { filledOn: prev.filledOn }),
    ...(prev.declinedOn === undefined ? {} : { declinedOn: prev.declinedOn }),
    ...(prev.declineReason === undefined
      ? {}
      : { declineReason: prev.declineReason ? z.enum(DECLINE_REASONS).parse(prev.declineReason) : null }),
    ...(prev.declineNote === undefined ? {} : { declineNote: prev.declineNote }),
    ...(prev.notes === undefined ? {} : { notes: prev.notes }),
    ...(prev.notesUpdatedAt === undefined
      ? {}
      : { notesUpdatedAt: prev.notesUpdatedAt ? new Date(prev.notesUpdatedAt) : null }),
  });
}
