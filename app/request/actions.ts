'use server';

import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { agencies, recipients, requesters, requests } from '@/db/schema';
import { requestNumber } from '@/lib/format';
import {
  AGE_UNITS,
  DIAPER_SIZES,
  GENDERS,
  MENS_INSEAM,
  MENS_WAIST,
  NOT_NEEDED,
  allShoeValues,
  pantGroups,
  shirtGroups,
} from '@/lib/sizes';

export type SubmitResult =
  | { number: string; recipientCount: number }
  | { error: string };

/**
 * A group+size pair is only valid if that list really offers that size. The
 * form encodes the group into every option value, so this check is what stops
 * a hand-rolled POST from storing a "10" whose list nobody can recover.
 */
function offeredBy(groupsOf: (g: string) => { label: string; opts: string[] }[]) {
  const all = groupsOf('');
  return (size: string, group: string | null) => {
    if (size === NOT_NEEDED) return true;
    if (!group) return false;
    const g = all.find((x) => x.label === group);
    return !!g && g.opts.includes(size);
  };
}

const shirtOffered = offeredBy(shirtGroups);
const pantOffered = offeredBy(pantGroups);

const recipientSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    gender: z.enum(GENDERS),
    ageValue: z.number().int().min(0).max(120),
    ageUnit: z.enum(AGE_UNITS),
    shirtSize: z.string(),
    shirtGroup: z.string().nullable(),
    pantSize: z.string().nullable(),
    pantGroup: z.string().nullable(),
    pantWaist: z.string().nullable(),
    pantInseam: z.string().nullable(),
    shoeSizes: z.array(z.string()).min(1),
    diaperSize: z.string().nullable(),
    itemsNeeded: z.string().max(2000),
  })
  .refine((r) => shirtOffered(r.shirtSize, r.shirtGroup), {
    message: 'Shirt size is not one this form offers.',
  })
  .refine(
    (r) =>
      r.pantWaist
        ? (MENS_WAIST as readonly string[]).includes(r.pantWaist) &&
          !!r.pantInseam &&
          (MENS_INSEAM as readonly string[]).includes(r.pantInseam)
        : !!r.pantSize && pantOffered(r.pantSize, r.pantGroup),
    { message: 'Pant size is not one this form offers.' },
  )
  .refine(
    (r) => {
      const ok = allShoeValues();
      return r.shoeSizes.every((s) => ok.has(s));
    },
    { message: 'Shoe size is not one this form offers.' },
  )
  .refine((r) => !r.diaperSize || DIAPER_SIZES.includes(r.diaperSize), {
    message: 'Diaper size is not one this form offers.',
  });

const submissionSchema = z.object({
  receivedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requesterName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(40),
  email: z.string().trim().email().max(200),
  agency: z.string().trim().max(200),
  prayer: z.string().max(4000),
  // Up to 10 per submission, as on the paper form.
  recipients: z.array(recipientSchema).min(1).max(10),
});

export type Submission = z.infer<typeof submissionSchema>;

export async function submitRequest(input: unknown): Promise<SubmitResult> {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Some answers were not accepted.' };
  }
  const data = parsed.data;

  try {
    // Agency: match case-insensitively against what is already on file before
    // creating a new one, so the list does not fragment.
    let agencyId: string | null = null;
    if (data.agency) {
      const found = await db
        .select({ id: agencies.id })
        .from(agencies)
        .where(sql`lower(${agencies.name}) = lower(${data.agency})`)
        .limit(1);
      agencyId =
        found[0]?.id ??
        (await db.insert(agencies).values({ name: data.agency }).returning({ id: agencies.id }))[0]
          .id;
    }

    // Requester: email is the stable key. Cell numbers move with the person,
    // so a matching email updates the name, phone and agency rather than
    // creating a second row that lookup would have to reconcile.
    const existing = await db
      .select({ id: requesters.id })
      .from(requesters)
      .where(sql`lower(${requesters.email}) = lower(${data.email})`)
      .limit(1);

    let requesterId: string;
    if (existing[0]) {
      requesterId = existing[0].id;
      await db
        .update(requesters)
        .set({ name: data.requesterName, phone: data.phone, agencyId })
        .where(eq(requesters.id, requesterId));
    } else {
      const inserted = await db
        .insert(requesters)
        .values({ name: data.requesterName, phone: data.phone, email: data.email, agencyId })
        .returning({ id: requesters.id });
      requesterId = inserted[0].id;
    }

    const [created] = await db
      .insert(requests)
      .values({
        requesterId,
        receivedOn: data.receivedOn,
        prayer: data.prayer,
      })
      .returning({ id: requests.id, seq: requests.seq, receivedOn: requests.receivedOn });

    await db.insert(recipients).values(
      data.recipients.map((r, i) => ({
        requestId: created.id,
        position: i,
        name: r.name,
        gender: r.gender,
        ageValue: r.ageValue,
        ageUnit: r.ageUnit,
        shirtSize: r.shirtSize,
        shirtGroup: r.shirtGroup,
        pantSize: r.pantSize,
        pantGroup: r.pantGroup,
        pantWaist: r.pantWaist,
        pantInseam: r.pantInseam,
        shoeSizes: r.shoeSizes,
        diaperSize: r.diaperSize,
        itemsNeeded: r.itemsNeeded,
      })),
    );

    return { number: requestNumber(created), recipientCount: data.recipients.length };
  } catch (e) {
    console.error('submitRequest failed', e);
    return { error: 'The request could not be saved. Please try again, or call the closet.' };
  }
}
