/**
 * Sample data, so the queue and the reports have something to show before the
 * first real request arrives.
 *
 * Run with `pnpm db:seed`. It refuses to touch a database that already holds
 * requests, so it can never quietly overwrite real records.
 *
 * The sizes here follow the settled vocabulary exactly -- youth 0-3M to 16/18,
 * adult letters, men's pants waist x inseam, women's even / juniors odd, US
 * shoes with halves, diapers to size 8.
 */
import { sql } from 'drizzle-orm';

import { db } from '../db';
import { agencies, recipients, requesters, requests } from '../db/schema';
import type { RequestStatus } from '../db/schema';

type Person = {
  name: string;
  gender: 'female' | 'male';
  ageValue: number;
  ageUnit: 'years' | 'months';
  shirtSize: string;
  shirtGroup: string;
  pantSize?: string;
  pantGroup?: string;
  pantWaist?: string;
  pantInseam?: string;
  shoeSizes: string[];
  diaperSize?: string;
  itemsNeeded?: string;
};

type Seed = {
  requester: string;
  agency: string | null;
  phone: string;
  email: string;
  receivedOn: string;
  status: RequestStatus;
  printedOn?: string;
  filledOn?: string;
  declinedOn?: string;
  declineReason?: (typeof requests.$inferInsert)['declineReason'];
  declineNote?: string;
  crisis?: boolean;
  prayer?: string;
  notes?: string;
  people: Person[];
};

const AGENCIES = [
  'Montgomery County Crisis Center',
  'Clarksburg Elementary School',
  'Rocky Hill Middle School',
  'Interfaith Works',
  'Manna Food Center',
];

const SEEDS: Seed[] = [
  {
    requester: 'Maria Delgado',
    agency: 'Montgomery County Crisis Center',
    phone: '(301) 555-0142',
    email: 'mdelgado@mccrisis.org',
    receivedOn: '2026-09-10',
    status: 'new',
    prayer: 'For steady work and a warm winter for the children.',
    people: [
      { name: 'Aaliyah Carter', gender: 'female', ageValue: 9, ageUnit: 'years',
        shirtSize: '10', shirtGroup: "Girls'", pantSize: '10', pantGroup: "Girls'",
        shoeSizes: ['3Y', '3½Y'], itemsNeeded: 'School shoes and a winter coat.' },
      { name: 'Marcus Carter', gender: 'male', ageValue: 14, ageUnit: 'years',
        shirtSize: '16', shirtGroup: "Boys'", pantWaist: '30', pantInseam: '30',
        pantGroup: "Men's waist", shoeSizes: ['8', '8½'], itemsNeeded: 'Jeans, warm hoodie.' },
      { name: 'Nia Carter', gender: 'female', ageValue: 12, ageUnit: 'years',
        shirtSize: 'S', shirtGroup: "Women's", pantSize: '7',
        pantGroup: 'Juniors (teen girls, odd sizes)', shoeSizes: ['6', '6½'] },
      { name: 'Jordan Carter', gender: 'male', ageValue: 8, ageUnit: 'months',
        shirtSize: '6-9M', shirtGroup: 'Baby', pantSize: '6-9M', pantGroup: 'Baby',
        shoeSizes: ['none'], diaperSize: 'Size 3', itemsNeeded: 'Sleepers, any warm layers.' },
      { name: 'Yolanda Carter', gender: 'female', ageValue: 38, ageUnit: 'years',
        shirtSize: 'L', shirtGroup: "Women's", pantSize: '12', pantGroup: "Women's",
        shoeSizes: ['8', '8½'] },
    ],
  },
  {
    requester: 'James Okonkwo',
    agency: 'Rocky Hill Middle School',
    phone: '(240) 555-0188',
    email: 'j.okonkwo@mcpsmd.org',
    receivedOn: '2026-09-09',
    status: 'new',
    people: [
      { name: 'Devon Price', gender: 'male', ageValue: 13, ageUnit: 'years',
        shirtSize: '18', shirtGroup: "Boys'", pantWaist: '32', pantInseam: '30',
        pantGroup: "Men's waist", shoeSizes: ['9'] },
      { name: 'Kayla Price', gender: 'female', ageValue: 11, ageUnit: 'years',
        shirtSize: '12', shirtGroup: "Girls'", pantSize: '12', pantGroup: "Girls'",
        shoeSizes: ['4Y'] },
    ],
  },
  {
    requester: 'Tanya Brooks',
    agency: null,
    phone: '(301) 555-0119',
    email: 'tbrooks88@gmail.com',
    receivedOn: '2026-09-05',
    status: 'progress',
    printedOn: '2026-09-08',
    crisis: true,
    notes: 'Called to confirm shoe sizes — Isaiah is between a 10C and 10½C, take both if we have them. Pickup Thursday afternoon.',
    prayer: 'Please pray for my mother’s health.',
    people: [
      { name: 'Tanya Brooks', gender: 'female', ageValue: 29, ageUnit: 'years',
        shirtSize: 'M', shirtGroup: "Women's", pantSize: '8', pantGroup: "Women's",
        shoeSizes: ['7½'] },
      { name: 'Isaiah Brooks', gender: 'male', ageValue: 4, ageUnit: 'years',
        shirtSize: '4T', shirtGroup: 'Toddler', pantSize: '4T', pantGroup: 'Toddler',
        shoeSizes: ['10C', '10½C'], itemsNeeded: 'Boots if there are any.' },
      { name: 'Amara Brooks', gender: 'female', ageValue: 18, ageUnit: 'months',
        shirtSize: '18-24M', shirtGroup: 'Baby', pantSize: '18-24M', pantGroup: 'Baby',
        shoeSizes: ['6C'], diaperSize: 'Size 5' },
    ],
  },
  {
    requester: 'Elena Ruiz',
    agency: 'Interfaith Works',
    phone: '(240) 555-0203',
    email: 'eruiz@interfaithworks.org',
    receivedOn: '2026-08-30',
    status: 'progress',
    printedOn: '2026-09-02',
    notes: 'Spanish-speaking household. Elena translates.',
    people: [
      { name: 'Sofia Marín', gender: 'female', ageValue: 6, ageUnit: 'years',
        shirtSize: '6', shirtGroup: "Girls'", pantSize: '6', pantGroup: "Girls'",
        shoeSizes: ['12C'] },
      { name: 'Mateo Marín', gender: 'male', ageValue: 3, ageUnit: 'years',
        shirtSize: '3T', shirtGroup: 'Toddler', pantSize: '3T', pantGroup: 'Toddler',
        shoeSizes: ['9C'] },
      { name: 'Lucía Marín', gender: 'female', ageValue: 5, ageUnit: 'months',
        shirtSize: '3-6M', shirtGroup: 'Baby', pantSize: '3-6M', pantGroup: 'Baby',
        shoeSizes: ['none'], diaperSize: 'Size 2' },
      { name: 'Rosa Marín', gender: 'female', ageValue: 41, ageUnit: 'years',
        shirtSize: 'XL', shirtGroup: "Women's", pantSize: '16', pantGroup: "Women's",
        shoeSizes: ['9'] },
    ],
  },
  {
    requester: 'Priya Raman',
    agency: 'Manna Food Center',
    phone: '(301) 555-0177',
    email: 'praman@mannafood.org',
    receivedOn: '2026-08-08',
    status: 'new',
    people: [
      { name: 'Amir Haddad', gender: 'male', ageValue: 16, ageUnit: 'years',
        shirtSize: 'M', shirtGroup: "Men's", pantWaist: '32', pantInseam: '32',
        pantGroup: "Men's waist", shoeSizes: ['10', '10½'] },
      { name: 'Layla Haddad', gender: 'female', ageValue: 14, ageUnit: 'years',
        shirtSize: '16', shirtGroup: "Girls'", pantSize: '9',
        pantGroup: 'Juniors (teen girls, odd sizes)', shoeSizes: ['7'] },
      { name: 'Sami Haddad', gender: 'male', ageValue: 10, ageUnit: 'years',
        shirtSize: '10', shirtGroup: "Boys'", pantSize: '10', pantGroup: "Boys'",
        shoeSizes: ['2Y'] },
      { name: 'Nour Haddad', gender: 'female', ageValue: 7, ageUnit: 'years',
        shirtSize: '8', shirtGroup: "Girls'", pantSize: '8', pantGroup: "Girls'",
        shoeSizes: ['13C'] },
      { name: 'Zaid Haddad', gender: 'male', ageValue: 2, ageUnit: 'years',
        shirtSize: '2T', shirtGroup: 'Toddler', pantSize: '2T', pantGroup: 'Toddler',
        shoeSizes: ['7C'], diaperSize: 'Size 6' },
      { name: 'Hana Haddad', gender: 'female', ageValue: 36, ageUnit: 'years',
        shirtSize: 'M', shirtGroup: "Women's", pantSize: '10', pantGroup: "Women's",
        shoeSizes: ['8'] },
    ],
  },
  {
    requester: 'Dawn Whitfield',
    agency: 'Clarksburg Elementary School',
    phone: '(240) 555-0166',
    email: 'dwhitfield@mcpsmd.org',
    receivedOn: '2026-08-05',
    status: 'filled',
    printedOn: '2026-08-12',
    filledOn: '2026-08-20',
    people: [
      { name: 'Trevor Nash', gender: 'male', ageValue: 8, ageUnit: 'years',
        shirtSize: '8', shirtGroup: "Boys'", pantSize: '8', pantGroup: "Boys'",
        shoeSizes: ['1Y'] },
    ],
  },
  {
    requester: 'Carlos Mendez',
    agency: 'Montgomery County Crisis Center',
    phone: '(301) 555-0155',
    email: 'cmendez@mccrisis.org',
    receivedOn: '2026-07-28',
    status: 'filled',
    printedOn: '2026-08-04',
    filledOn: '2026-08-12',
    people: [
      { name: 'Julio Mendez', gender: 'male', ageValue: 52, ageUnit: 'years',
        shirtSize: 'L', shirtGroup: "Men's", pantWaist: '36', pantInseam: '30',
        pantGroup: "Men's waist", shoeSizes: ['11'] },
      { name: 'Alma Mendez', gender: 'female', ageValue: 49, ageUnit: 'years',
        shirtSize: 'L', shirtGroup: "Women's", pantSize: '14', pantGroup: "Women's",
        shoeSizes: ['8½'] },
    ],
  },
  {
    requester: 'Renee Alston',
    agency: 'Interfaith Works',
    phone: '(240) 555-0121',
    email: 'ralston@interfaithworks.org',
    receivedOn: '2026-07-15',
    status: 'declined',
    declinedOn: '2026-07-22',
    declineReason: 'Already received clothing this season',
    declineNote: 'Filled a request for the same household in June.',
    people: [
      { name: 'Cameron Alston', gender: 'male', ageValue: 6, ageUnit: 'years',
        shirtSize: '6', shirtGroup: "Boys'", pantSize: '6', pantGroup: "Boys'",
        shoeSizes: ['12C'] },
    ],
  },
];

// ---------------------------------------------------------------------------
// History, so the fiscal-year comparisons on the report have something to
// compare against. Shape only -- names are not invented for closed years.
// ---------------------------------------------------------------------------
const HISTORY_SHAPE: Record<number, [number, number, number][]> = {
  // fiscal year -> per month [requests, children, adults]
  2024: [[13,30,9],[18,44,13],[16,37,11],[13,31,9],[12,26,8],[15,35,10],[12,27,8],[10,21,6],[14,33,10],[11,25,7],[16,39,11],[19,46,13]],
  2025: [[15,36,10],[21,51,15],[18,43,12],[15,35,10],[13,30,9],[17,41,12],[14,31,9],[11,24,7],[16,38,11],[13,29,8],[18,44,13],[21,52,15]],
};

function monthDate(fy: number, monthIndex: number, day: number): string {
  const cal = monthIndex < 6 ? fy : fy + 1;
  const m = monthIndex < 6 ? monthIndex + 7 : monthIndex - 5;
  return `${cal}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function historyPerson(i: number, adult: boolean): Person {
  return adult
    ? {
        name: `Adult recipient ${i + 1}`,
        gender: i % 2 ? 'male' : 'female',
        ageValue: 30 + (i % 25),
        ageUnit: 'years',
        shirtSize: i % 2 ? 'L' : 'M',
        shirtGroup: i % 2 ? "Men's" : "Women's",
        ...(i % 2
          ? { pantWaist: '34', pantInseam: '30', pantGroup: "Men's waist" }
          : { pantSize: '10', pantGroup: "Women's" }),
        shoeSizes: [i % 2 ? '10' : '8'],
      }
    : {
        name: `Child recipient ${i + 1}`,
        gender: i % 2 ? 'male' : 'female',
        ageValue: 3 + (i % 12),
        ageUnit: 'years',
        shirtSize: '8',
        shirtGroup: i % 2 ? "Boys'" : "Girls'",
        pantSize: '8',
        pantGroup: i % 2 ? "Boys'" : "Girls'",
        shoeSizes: ['1Y'],
      };
}

async function main() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(requests);
  if (count > 0) {
    console.error(`Refusing to seed: the database already holds ${count} requests.`);
    process.exit(1);
  }

  // Agencies first, so requesters can point at them.
  const agencyIds = new Map<string, string>();
  for (const name of AGENCIES) {
    const [row] = await db.insert(agencies).values({ name }).returning({ id: agencies.id });
    agencyIds.set(name, row.id);
  }

  const requesterIds = new Map<string, string>();
  async function requesterFor(name: string, phone: string, email: string, agency: string | null) {
    const existing = requesterIds.get(email);
    if (existing) return existing;
    const [row] = await db
      .insert(requesters)
      .values({ name, phone, email, agencyId: agency ? (agencyIds.get(agency) ?? null) : null })
      .returning({ id: requesters.id });
    requesterIds.set(email, row.id);
    return row.id;
  }

  for (const s of SEEDS) {
    const requesterId = await requesterFor(s.requester, s.phone, s.email, s.agency);
    const [req] = await db
      .insert(requests)
      .values({
        requesterId,
        receivedOn: s.receivedOn,
        status: s.status,
        crisis: s.crisis ?? false,
        prayer: s.prayer ?? '',
        notes: s.notes ?? '',
        notesUpdatedAt: s.notes ? new Date(`${s.printedOn ?? s.receivedOn}T12:00:00Z`) : null,
        printedOn: s.printedOn ?? null,
        filledOn: s.filledOn ?? null,
        declinedOn: s.declinedOn ?? null,
        declineReason: s.declineReason ?? null,
        declineNote: s.declineNote ?? '',
      })
      .returning({ id: requests.id });

    await db.insert(recipients).values(
      s.people.map((p, i) => ({
        requestId: req.id,
        position: i,
        name: p.name,
        gender: p.gender,
        ageValue: p.ageValue,
        ageUnit: p.ageUnit,
        shirtSize: p.shirtSize,
        shirtGroup: p.shirtGroup,
        pantSize: p.pantSize ?? null,
        pantGroup: p.pantGroup ?? null,
        pantWaist: p.pantWaist ?? null,
        pantInseam: p.pantInseam ?? null,
        shoeSizes: p.shoeSizes,
        diaperSize: p.diaperSize ?? null,
        itemsNeeded: p.itemsNeeded ?? '',
      })),
    );
  }

  // Closed fiscal years, for the year-on-year comparison.
  for (const [fyStr, months] of Object.entries(HISTORY_SHAPE)) {
    const fy = Number(fyStr);
    for (let m = 0; m < months.length; m++) {
      const [count, kids, adults] = months[m];
      const perRequestKids = Math.max(1, Math.round(kids / count));
      const perRequestAdults = Math.round(adults / count);
      for (let i = 0; i < count; i++) {
        const agency = AGENCIES[i % (AGENCIES.length + 1)] ?? null;
        const email = `history-${fy}-${m}-${i}@example.org`;
        const requesterId = await requesterFor(
          `Case worker ${i + 1}`,
          '(301) 555-0100',
          email,
          agency,
        );
        const received = monthDate(fy, m, Math.min(28, 2 + i));
        const [req] = await db
          .insert(requests)
          .values({
            requesterId,
            receivedOn: received,
            status: 'filled',
            printedOn: received,
            filledOn: received,
          })
          .returning({ id: requests.id });

        const people: Person[] = [];
        for (let k = 0; k < perRequestKids; k++) people.push(historyPerson(k, false));
        if (i < adults) for (let a = 0; a < Math.max(1, perRequestAdults); a++) people.push(historyPerson(a, true));

        await db.insert(recipients).values(
          people.map((p, idx) => ({
            requestId: req.id,
            position: idx,
            name: p.name,
            gender: p.gender,
            ageValue: p.ageValue,
            ageUnit: p.ageUnit,
            shirtSize: p.shirtSize,
            shirtGroup: p.shirtGroup,
            pantSize: p.pantSize ?? null,
            pantGroup: p.pantGroup ?? null,
            pantWaist: p.pantWaist ?? null,
            pantInseam: p.pantInseam ?? null,
            shoeSizes: p.shoeSizes,
            diaperSize: p.diaperSize ?? null,
            itemsNeeded: '',
          })),
        );
      }
    }
  }

  console.log('Seeded sample requests, agencies and two closed fiscal years.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
