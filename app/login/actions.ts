'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { SESSION_COOKIE, SESSION_DAYS, mintSession, passcodeMatches } from '@/lib/auth';

export async function signIn(_prev: string | null, formData: FormData): Promise<string | null> {
  const given = String(formData.get('passcode') ?? '');
  const next = String(formData.get('next') ?? '/queue');

  if (!process.env.VOLUNTEER_PASSCODE || !process.env.SESSION_SECRET) {
    return 'This app is not finished setting up: VOLUNTEER_PASSCODE and SESSION_SECRET are not configured.';
  }
  if (!passcodeMatches(given, process.env.VOLUNTEER_PASSCODE)) {
    return 'That passcode does not match. Check with whoever set up the iPad.';
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await mintSession(process.env.SESSION_SECRET), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  });

  // Only ever bounce back to a path on this app, never to a supplied URL.
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/queue');
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}
