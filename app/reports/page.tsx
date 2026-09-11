import { TopBar } from '@/components/TopBar';
import { loadReport } from '@/lib/reports';

import Report from './Report';
import './report.css';

export const metadata = { title: 'Reports · Clarksburg Closet' };
export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const data = await loadReport();
  return (
    <>
      <TopBar current="reports" />
      <Report data={data} />
    </>
  );
}
