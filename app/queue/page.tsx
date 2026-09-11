import { TopBar } from '@/components/TopBar';
import { loadQueue } from '@/lib/queries';

import Queue from './Queue';
import './queue.css';

export const metadata = { title: 'Request Queue · Clarksburg Closet' };
export const dynamic = 'force-dynamic';

export default async function QueuePage() {
  const requests = await loadQueue();
  return (
    <>
      <TopBar current="queue" />
      <Queue initial={requests} />
    </>
  );
}
