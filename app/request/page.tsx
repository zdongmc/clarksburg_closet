import { asc } from 'drizzle-orm';

import { db } from '@/db';
import { agencies } from '@/db/schema';

import RequestForm from './RequestForm';
import './request.css';

export const metadata = { title: 'Clothing Request Form · Clarksburg Closet' };

// The form is public and reads the agency list on every load, so a name added
// by the last requester is on offer to the next one.
export const dynamic = 'force-dynamic';

export default async function RequestPage() {
  let names: string[] = [];
  try {
    const rows = await db
      .select({ name: agencies.name })
      .from(agencies)
      .orderBy(asc(agencies.name));
    names = rows.map((r) => r.name);
  } catch {
    // A type-ahead with nothing to suggest is still a usable text box; never
    // let a database hiccup take the request form down.
    names = [];
  }

  return <RequestForm agencies={names} />;
}
