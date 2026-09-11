import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { AGE_UNITS, GENDERS } from '@/lib/sizes';

/**
 * Schema for the Clarksburg Closet request system.
 *
 * Enumerations are `as const` string arrays typed onto plain `text()` columns
 * rather than PG enums, so a list can be revised without a migration dance.
 */

// Volunteer-set. Crisis is a priority FLAG, not a status, so it lives in its
// own boolean column: an agency that sends one urgent case is not permanently
// urgent. Partial fulfilment does not exist, so status is on the request and
// there is deliberately no per-recipient status column.
export const REQUEST_STATUSES = ['new', 'progress', 'filled', 'declined'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  new: 'Not started',
  progress: 'Printed',
  filled: 'Filled',
  declined: 'Declined',
};

// Declining requires a reason -- the requester will be told, and "why was I
// turned down?" needs an answer months later. "Already received this season"
// is how the once-per-season rule gets recorded: the judgment is a volunteer's,
// never the system's.
export const DECLINE_REASONS = [
  'Already received clothing this season',
  'Duplicate of another request',
  'Outside the area we serve',
  'Could not reach the requester',
  'We do not have these items',
  'Other',
] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

// ---------------------------------------------------------------------------
// agencies -- optional, because a household may self-refer. Matched by a
// type-ahead against existing rows so the list does not fragment into
// "Mercy Health" and "Mercy Health Svc".
// ---------------------------------------------------------------------------
export const agencies = pgTable(
  'agencies',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('agencies_name_lower_idx').on(sql`lower(${t.name})`)],
);

// ---------------------------------------------------------------------------
// requesters -- the agent or the household member who submitted. Several
// requesters can belong to one agency, and agency search finds every request
// across all of them.
//
// Email is indexed alongside phone because it is the more stable lookup key:
// cell numbers move with the person, work email does not.
// ---------------------------------------------------------------------------
export const requesters = pgTable(
  'requesters',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
    agencyId: uuid('agency_id').references(() => agencies.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('requesters_email_idx').on(sql`lower(${t.email})`),
    index('requesters_phone_idx').on(t.phone),
    index('requesters_agency_idx').on(t.agencyId),
  ],
);

// ---------------------------------------------------------------------------
// requests -- one submission.
//
// `seq` is the human-facing request number. It is an identity column rather
// than a stored string so it can never collide; the displayed "#2026-0413"
// is composed from receivedOn's year plus seq (see lib/format.ts). Nothing
// records WHICH volunteer changed a status or wrote a note -- deliberate, and
// the open question in CLAUDE.md.
// ---------------------------------------------------------------------------
export const requests = pgTable(
  'requests',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    seq: integer('seq').generatedByDefaultAsIdentity({ startWith: 401 }).notNull(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => requesters.id, { onDelete: 'restrict' }),
    receivedOn: date('received_on').notNull(),
    status: text('status').$type<RequestStatus>().notNull().default('new'),
    crisis: boolean('crisis').notNull().default(false),

    /** Written by the requester, at request level. */
    prayer: text('prayer').notNull().default(''),

    /**
     * Written by the CLOSET, at request level -- never to be confused with the
     * requester's own prayer request or a recipient's "items needed most".
     * Stores when it was last updated but not who wrote it.
     */
    notes: text('notes').notNull().default(''),
    notesUpdatedAt: timestamp('notes_updated_at', { withTimezone: true }),

    printedOn: date('printed_on'),
    filledOn: date('filled_on'),
    declinedOn: date('declined_on'),
    declineReason: text('decline_reason').$type<DeclineReason>(),
    declineNote: text('decline_note').notNull().default(''),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('requests_seq_idx').on(t.seq),
    index('requests_status_idx').on(t.status),
    index('requests_received_idx').on(t.receivedOn),
    index('requests_requester_idx').on(t.requesterId),
  ],
);

// ---------------------------------------------------------------------------
// recipients -- per-request entries, up to 10. There is no persistent
// cross-request recipient or household record for now.
//
// Sizes are NOT one shared vocabulary:
//   - shirt takes a single value,
//   - pants take EITHER a single value OR a waist + inseam pair (men's),
//   - shoes take a SET, because a requester ticks every size that would fit,
//   - diapers are nullable and opt-in.
// The group columns record which list a value came from, so "10" can be
// printed as "10 - Girls'" and never mistaken for a women's 10.
// ---------------------------------------------------------------------------
export const recipients = pgTable(
  'recipients',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    /** 0-based order on the form, so slips print in the order they were filled. */
    position: integer('position').notNull(),

    name: text('name').notNull(),
    gender: text('gender').$type<(typeof GENDERS)[number]>().notNull(),
    ageValue: integer('age_value').notNull(),
    ageUnit: text('age_unit').$type<(typeof AGE_UNITS)[number]>().notNull(),

    shirtSize: text('shirt_size').notNull(),
    shirtGroup: text('shirt_group'),

    /** Null exactly when this is a men's waist x inseam pair. */
    pantSize: text('pant_size'),
    pantGroup: text('pant_group'),
    pantWaist: text('pant_waist'),
    pantInseam: text('pant_inseam'),

    /** Always at least one entry; `['none']` means "Not needed". */
    shoeSizes: text('shoe_sizes').array().notNull(),

    diaperSize: text('diaper_size'),

    /** Written by the requester, at recipient level. */
    itemsNeeded: text('items_needed').notNull().default(''),
  },
  (t) => [index('recipients_request_idx').on(t.requestId)],
);

export type Agency = typeof agencies.$inferSelect;
export type Requester = typeof requesters.$inferSelect;
export type Request = typeof requests.$inferSelect;
export type Recipient = typeof recipients.$inferSelect;
