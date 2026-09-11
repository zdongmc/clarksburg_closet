'use client';

import { useActionState } from 'react';

import { signIn } from './actions';

export default function LoginForm({ next }: { next: string }) {
  const [error, action, pending] = useActionState(signIn, null);

  return (
    <form className="login-panel" action={action}>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="passcode">Passcode</label>
      <input
        id="passcode"
        name="passcode"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
      />
      {error ? <div className="login-err">{error}</div> : null}
      <button type="submit" disabled={pending}>
        {pending ? 'Checking…' : 'Sign in'}
      </button>
    </form>
  );
}
