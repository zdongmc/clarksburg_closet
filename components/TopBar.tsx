import Link from 'next/link';

import { logout } from '@/app/login/actions';

/** The thin bar joining the two volunteer views. Never shown on the form. */
export function TopBar({ current }: { current: 'queue' | 'reports' }) {
  return (
    <nav className="topbar" aria-label="Volunteer views">
      <Link href="/queue" aria-current={current === 'queue' ? 'page' : undefined}>
        Queue
      </Link>
      <Link href="/reports" aria-current={current === 'reports' ? 'page' : undefined}>
        Reports
      </Link>
      <span className="spacer" />
      <Link href="/request">Request form</Link>
      <form action={logout}>
        <button type="submit">Sign out</button>
      </form>
    </nav>
  );
}
