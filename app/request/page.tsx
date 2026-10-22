import { asc } from 'drizzle-orm';
import { headers } from 'next/headers';

import { db } from '@/db';
import { agencies } from '@/db/schema';

import RequestForm from './RequestForm';
import { STRINGS, isLang, type Lang } from './i18n';
import './request.css';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ lang?: string | string[] }> };

/**
 * `?lang=es` wins, so a link or QR code can name the language. Without it, a
 * browser set to Spanish gets the Spanish form; everyone else gets English.
 * The toggle on the form switches either way.
 */
async function langOf(searchParams: Props['searchParams']): Promise<Lang> {
  const { lang } = await searchParams;
  if (isLang(lang)) return lang;
  const accept = (await headers()).get('accept-language') ?? '';
  return /^\s*es\b/i.test(accept) ? 'es' : 'en';
}

export async function generateMetadata({ searchParams }: Props) {
  return { title: STRINGS[await langOf(searchParams)].docTitle };
}

export default async function RequestPage({ searchParams }: Props) {
  const lang = await langOf(searchParams);

  let names: string[] = [];
  try {
    const rows = await db
      .select({ name: agencies.name })
      .from(agencies)
      .orderBy(asc(agencies.name));
    names = rows.map((r) => r.name);
  } catch {
    names = [];
  }

  return <RequestForm agencies={names} initialLang={lang} />;
}
