import { redirect } from 'next/navigation';

// The form is the front door: most people who reach this app are requesting
// clothing, not working the queue.
export default function Home() {
  redirect('/request');
}
