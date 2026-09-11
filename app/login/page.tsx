import LoginForm from './LoginForm';
import './login.css';

export const metadata = { title: 'Volunteer sign in · Clarksburg Closet' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="login-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src="/logo.png" alt="Clarksburg Closet" width={72} height={72} />
      <div>
        <div className="eyebrow">Volunteer view</div>
        <h1>Sign in</h1>
      </div>
      <p>
        The queue and the reports are behind the closet&rsquo;s shared passcode. The request form
        itself is open to anyone.
      </p>
      <LoginForm next={next ?? '/queue'} />
    </div>
  );
}
