'use client';

import { useState } from 'react';

import {
  FY_MONTHS,
  FY_MONTHS_FULL,
  calYear,
  fyLabel,
  monthLabel,
} from '@/lib/format';
import type { MonthRow, ReportData } from '@/lib/reports';

/**
 * The report draws its charts as inline SVG -- no charting library.
 *
 * Two rules worth keeping if more charts are added:
 *  - The series colours are validated, not chosen by eye. --s1/--s2 pass the
 *    lightness band, chroma floor, colour-blind separation and surface
 *    contrast checks in both themes, which is why one pair serves both. The
 *    brand navy #00467F FAILS as a chart fill.
 *  - Identity is never colour alone: every two-series chart carries a legend,
 *    stacked totals are directly labelled, and the chart/table toggle gives
 *    the same figures as text.
 */

type Tip = { x: number; y: number; title: string; rows: [string, number, string | null][] };

/** Round up to a max that divides into 4 whole ticks: 0/20/40/60/80. */
function niceMax(v: number): number {
  if (v <= 0) return 8;
  const raw = v / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step =
    [1, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * mag).find((x) => x >= raw) ?? 10 * mag;
  return step * 4;
}

/**
 * A bar with rounded ends only where the data stops -- the baseline end stays
 * square so the mark reads as anchored, not floating.
 */
function barPath(x: number, y: number, w: number, h: number, r: number, roundTop: boolean): string {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  if (!roundTop || rr <= 0) return `M${x} ${y}h${w}v${h}h${-w}Z`;
  return (
    `M${x} ${y + rr}` +
    `a${rr} ${rr} 0 0 1 ${rr} ${-rr}` +
    `h${w - 2 * rr}` +
    `a${rr} ${rr} 0 0 1 ${rr} ${rr}` +
    `v${h - rr}h${-w}Z`
  );
}

/** Horizontal bars need the rounded end on the right, not the top. */
function hBarPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w, h / 2);
  return (
    `M${x} ${y}h${w - rr}` +
    `a${rr} ${rr} 0 0 1 ${rr} ${rr}` +
    `v${h - 2 * rr}` +
    `a${rr} ${rr} 0 0 1 ${-rr} ${rr}` +
    `h${-(w - rr)}Z`
  );
}

const sum = (rows: MonthRow[], key: keyof MonthRow) => rows.reduce((a, d) => a + d[key], 0);

function stats(rows: MonthRow[]) {
  const kids = sum(rows, 'ch');
  const adults = sum(rows, 'ad');
  return { kids, adults, people: kids + adults, rec: sum(rows, 'rec'), fil: sum(rows, 'fil'), dec: sum(rows, 'dec') };
}

/** "24 more than August" reads better to a volunteer than "+53%". */
function delta(now: number, before: number, label: string): string {
  const d = now - before;
  if (d === 0) return 'Same as ' + label;
  return `${Math.abs(d)}${d > 0 ? ' more than ' : ' fewer than '}${label}`;
}

export default function Report({ data }: { data: ReportData }) {
  const [year, setYear] = useState(data.currentFy);
  const [month, setMonth] = useState<number | null>(null); // null = year to date
  const [table, setTable] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);

  const rows = data.byYear[year] ?? [];
  const labels = FY_MONTHS.slice(0, rows.length);
  const isYTD = year === data.currentFy;
  const period = month !== null ? monthLabel(year, month) : isYTD ? 'Year to date' : fyLabel(year);

  const ytd = stats(rows);

  let tiles: [string, string | number, string][];
  if (month === null) {
    tiles = [
      [
        'People clothed',
        ytd.people,
        `${period} · ${labels.length} ${labels.length === 1 ? 'month' : 'months'}`,
      ],
      [
        'Children',
        ytd.kids,
        ytd.people ? `${Math.round((ytd.kids / ytd.people) * 100)}% of everyone served` : '—',
      ],
      ['Requests filled', ytd.fil, `${ytd.rec} received`],
      [
        'Average per request',
        ytd.rec ? (ytd.people / ytd.rec).toFixed(1) : '—',
        'people on a request',
      ],
    ];
  } else {
    const cur = stats([rows[month]]);
    const prev = month > 0 ? stats([rows[month - 1]]) : null;
    const lastYearRows = data.byYear[year - 1];
    const ly = lastYearRows && lastYearRows[month] ? stats([lastYearRows[month]]) : null;
    tiles = [
      [
        'People clothed',
        cur.people,
        prev
          ? delta(cur.people, prev.people, FY_MONTHS[month - 1])
          : 'First month of the fiscal year',
      ],
      [
        'Children',
        cur.kids,
        cur.people ? `${Math.round((cur.kids / cur.people) * 100)}% of this month` : '—',
      ],
      [
        'Requests filled',
        cur.fil,
        `${cur.rec} received${cur.dec ? `, ${cur.dec} declined` : ''}`,
      ],
      [
        'Year to date',
        ytd.people,
        ly
          ? `People clothed · ${ly.people} in ${monthLabel(year - 1, month)}`
          : 'People clothed since 1 July',
      ],
    ];
  }

  const lastIdx = labels.length - 1;
  const peopleNote =
    month === null
      ? isYTD
        ? `July through ${FY_MONTHS_FULL[lastIdx]} ${calYear(year, lastIdx)}. ${FY_MONTHS_FULL[lastIdx]} is still in progress.`
        : `All twelve months of ${fyLabel(year)}, July through June.`
      : `${monthLabel(year, month)} is highlighted; the rest of the fiscal year is shown for context.`;

  const agencyRows = data.agencies[year] ?? [];

  const showTip = (e: React.MouseEvent, title: string, tipRows: Tip['rows']) =>
    setTip({ x: e.clientX, y: e.clientY, title, rows: tipRows });

  return (
    <div className="app">
      <header className="masthead">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo" src="/logo.png" alt="Clarksburg Closet" width={62} height={62} />
        <div className="mast-text">
          <div className="eyebrow">Volunteer view · Reports</div>
          <h1>Requests &amp; People Served</h1>
        </div>
      </header>

      <div className="notice">
        The fiscal year runs <strong>1 July to 30 June</strong>, so &ldquo;year to date&rdquo;
        means since 1 July.
      </div>

      <div className="controls">
        <div className="ctl">
          <label htmlFor="year">Fiscal year</label>
          <select
            id="year"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setMonth(null); // a month index means nothing across a year change
              setTip(null);
            }}
          >
            {data.years.map((y) => (
              <option key={y} value={y}>
                {fyLabel(y)}
                {y === data.currentFy ? ' (year to date)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="ctl">
          <label htmlFor="month">Period</label>
          <select
            id="month"
            value={month === null ? '' : String(month)}
            onChange={(e) => {
              setMonth(e.target.value === '' ? null : Number(e.target.value));
              setTip(null);
            }}
          >
            <option value="">{isYTD ? 'Year to date' : 'Whole fiscal year'}</option>
            {rows.map((_, i) => (
              <option key={i} value={i}>
                {monthLabel(year, i)}
              </option>
            ))}
          </select>
        </div>
        <div className="ctl">
          <label htmlFor="view">Show as</label>
          <button
            type="button"
            id="view"
            className="toggle-btn"
            aria-pressed={table}
            onClick={() => {
              setTable((t) => !t);
              setTip(null);
            }}
          >
            {table ? 'Table' : 'Charts'}
          </button>
        </div>
      </div>

      <div className="tiles">
        {tiles.map((t) => (
          <div className="tile" key={t[0]}>
            <span className="k">{t[0]}</span>
            <span className="v">{t[1]}</span>
            <span className="sub">{t[2]}</span>
          </div>
        ))}
      </div>

      <section className="panel" hidden={table}>
        <div className="panel-head">
          <h2>People clothed each month</h2>
          <span className="note">{peopleNote}</span>
        </div>
        <div className="legend">
          <span>
            <i style={{ background: 'var(--s1)' }} /> Children (under 18)
          </span>
          <span>
            <i style={{ background: 'var(--s2)' }} /> Adults
          </span>
        </div>
        <div className="chart-wrap">
          <StackedMonths
            rows={rows}
            labels={labels}
            year={year}
            selected={month}
            onSelect={setMonth}
            onTip={showTip}
            onLeave={() => setTip(null)}
          />
        </div>
      </section>

      <section className="panel" hidden={table}>
        <div className="panel-head">
          <h2>Requests received and filled</h2>
          <span className="note">
            A request filled in a later month counts in the month it was filled.
          </span>
        </div>
        <div className="legend">
          <span>
            <i style={{ background: 'var(--s1)' }} /> Received
          </span>
          <span>
            <i style={{ background: 'var(--s2)' }} /> Filled
          </span>
        </div>
        <div className="chart-wrap">
          <GroupedMonths
            rows={rows}
            labels={labels}
            year={year}
            selected={month}
            onSelect={setMonth}
            onTip={showTip}
            onLeave={() => setTip(null)}
          />
        </div>
      </section>

      <section className="panel" hidden={table}>
        <div className="panel-head">
          <h2>Where requests came from</h2>
          <span className="note">
            {(isYTD ? 'Year to date' : fyLabel(year))} · {ytd.rec} requests
          </span>
        </div>
        <div className="chart-wrap">
          <AgencyBars rows={agencyRows} onTip={showTip} onLeave={() => setTip(null)} />
        </div>
      </section>

      <section className="panel" hidden={!table}>
        <div className="panel-head">
          <h2>Month by month</h2>
          <span className="note">The same figures as the charts above.</span>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                {['Month', 'Children', 'Adults', 'People', 'Received', 'Filled', 'Declined'].map(
                  (h) => (
                    <th key={h}>{h}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => (
                <tr key={i} className={month === i ? 'picked' : undefined}>
                  <td>{monthLabel(year, i)}</td>
                  <td>{d.ch}</td>
                  <td>{d.ad}</td>
                  <td>{d.ch + d.ad}</td>
                  <td>{d.rec}</td>
                  <td>{d.fil}</td>
                  <td>{d.dec}</td>
                </tr>
              ))}
              <tr className="total">
                <td>{period}</td>
                <td>{ytd.kids}</td>
                <td>{ytd.adults}</td>
                <td>{ytd.people}</td>
                <td>{ytd.rec}</td>
                <td>{ytd.fil}</td>
                <td>{ytd.dec}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {tip ? (
        <div
          className="tip"
          role="status"
          style={{ left: Math.max(8, tip.x + 14), top: Math.max(8, tip.y + 14) }}
        >
          <b>{tip.title}</b>
          {tip.rows.map((r) => (
            <div className="row" key={r[0]}>
              {r[2] ? <i style={{ background: r[2] }} /> : null}
              <span>{r[0]}</span>
              <span className="n">{r[1]}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ChartProps = {
  rows: MonthRow[];
  labels: string[];
  year: number;
  selected: number | null;
  onSelect: (i: number) => void;
  onTip: (e: React.MouseEvent, title: string, rows: Tip['rows']) => void;
  onLeave: () => void;
};

/** Selecting a month highlights it and leaves the rest of the year for context. */
function StackedMonths({ rows, labels, year, selected, onSelect, onTip, onLeave }: ChartProps) {
  const W = 720, H = 300, ml = 38, mr = 12, mt = 22, mb = 34;
  const iw = W - ml - mr;
  const ih = H - mt - mb;
  const max = niceMax(Math.max(0, ...rows.map((d) => d.ch + d.ad)));
  const y = (v: number) => mt + ih - (v / max) * ih;
  const step = rows.length ? iw / rows.length : iw;
  const bw = Math.min(46, step - 10);
  const GAP = 2; // surface gap so the two segments never fuse

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Stacked bars of children and adults clothed each month">
      {[0, 1, 2, 3, 4].map((t) => {
        const v = (max * t) / 4;
        return (
          <g key={t}>
            <line className="gridline" x1={ml} x2={ml + iw} y1={y(v)} y2={y(v)} />
            <text className="tick" x={ml - 7} y={y(v) + 3.5} textAnchor="end">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      <line className="axis-line" x1={ml} x2={ml + iw} y1={y(0)} y2={y(0)} />

      {selected !== null && selected < rows.length ? (
        <rect
          x={ml + step * selected + 2}
          y={mt - 14}
          width={step - 4}
          height={ih + 14}
          fill="var(--accent-soft)"
        />
      ) : null}

      {rows.map((d, i) => {
        const x = ml + step * i + (step - bw) / 2;
        const total = d.ch + d.ad;
        const hCh = (d.ch / max) * ih;
        const hAd = (d.ad / max) * ih;
        return (
          <g key={i}>
            {/* adults on top, rounded end; children below, square to the baseline */}
            <path d={barPath(x, y(total), bw, Math.max(0, hAd - GAP), 4, true)} fill="var(--s2)" />
            <path d={barPath(x, y(d.ch), bw, hCh, 0, false)} fill="var(--s1)" />
            <text className="bar-total" x={x + bw / 2} y={y(total) - 7} textAnchor="middle">
              {total}
            </text>
            <text
              className="tick"
              x={x + bw / 2}
              y={H - 12}
              textAnchor="middle"
              fill={selected === i ? 'var(--ink)' : undefined}
              fontWeight={selected === i ? 600 : undefined}
            >
              {labels[i]}
            </text>
            <rect
              className="hit"
              x={ml + step * i}
              y={mt}
              width={step}
              height={ih}
              tabIndex={0}
              onMouseMove={(e) =>
                onTip(e, monthLabel(year, i), [
                  ['Children', d.ch, 'var(--s1)'],
                  ['Adults', d.ad, 'var(--s2)'],
                  ['Total', total, null],
                ])
              }
              onMouseLeave={onLeave}
              onBlur={onLeave}
              onClick={() => onSelect(i)}
            />
          </g>
        );
      })}
    </svg>
  );
}

function GroupedMonths({ rows, labels, year, selected, onTip, onLeave }: ChartProps) {
  const W = 720, H = 260, ml = 38, mr = 12, mt = 20, mb = 34;
  const iw = W - ml - mr;
  const ih = H - mt - mb;
  const max = niceMax(Math.max(0, ...rows.map((d) => Math.max(d.rec, d.fil))));
  const y = (v: number) => mt + ih - (v / max) * ih;
  const step = rows.length ? iw / rows.length : iw;
  const bw = Math.min(16, (step - 12) / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grouped bars of requests received and filled each month">
      {[0, 1, 2, 3, 4].map((t) => {
        const v = (max * t) / 4;
        return (
          <g key={t}>
            <line className="gridline" x1={ml} x2={ml + iw} y1={y(v)} y2={y(v)} />
            <text className="tick" x={ml - 7} y={y(v) + 3.5} textAnchor="end">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      <line className="axis-line" x1={ml} x2={ml + iw} y1={y(0)} y2={y(0)} />

      {selected !== null && selected < rows.length ? (
        <rect x={ml + step * selected + 2} y={mt} width={step - 4} height={ih} fill="var(--accent-soft)" />
      ) : null}

      {rows.map((d, i) => {
        const cx = ml + step * i + step / 2;
        const x1 = cx - bw - 1; // 2px surface gap between the pair
        const x2 = cx + 1;
        return (
          <g key={i}>
            <path d={barPath(x1, y(d.rec), bw, ih - (y(d.rec) - mt), 4, true)} fill="var(--s1)" />
            <path d={barPath(x2, y(d.fil), bw, ih - (y(d.fil) - mt), 4, true)} fill="var(--s2)" />
            <text
              className="tick"
              x={cx}
              y={H - 12}
              textAnchor="middle"
              fill={selected === i ? 'var(--ink)' : undefined}
              fontWeight={selected === i ? 600 : undefined}
            >
              {labels[i]}
            </text>
            <rect
              className="hit"
              x={ml + step * i}
              y={mt}
              width={step}
              height={ih}
              tabIndex={0}
              onMouseMove={(e) =>
                onTip(e, monthLabel(year, i), [
                  ['Received', d.rec, 'var(--s1)'],
                  ['Filled', d.fil, 'var(--s2)'],
                  ['Declined', d.dec, null],
                ])
              }
              onMouseLeave={onLeave}
              onBlur={onLeave}
            />
          </g>
        );
      })}
    </svg>
  );
}

function AgencyBars({
  rows,
  onTip,
  onLeave,
}: {
  rows: [string, number][];
  onTip: (e: React.MouseEvent, title: string, rows: Tip['rows']) => void;
  onLeave: () => void;
}) {
  const W = 720, rowH = 34, ml = 258, mr = 46, mt = 6;
  const H = mt + Math.max(1, rows.length) * rowH + 6;
  const iw = W - ml - mr;
  const max = niceMax(Math.max(0, ...rows.map((r) => r[1])));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Horizontal bars of requests by referring agency">
      {rows.map((r, i) => {
        const y = mt + i * rowH + 6;
        const bh = 18;
        const w = (r[1] / max) * iw;
        return (
          <g key={r[0]}>
            <text className="tick" x={ml - 10} y={y + 13} textAnchor="end">
              {r[0].length > 34 ? r[0].slice(0, 33) + '…' : r[0]}
            </text>
            <path d={hBarPath(ml, y, Math.max(3, w), bh, 4)} fill="var(--s1)" />
            <text className="bar-total" x={ml + Math.max(2, w) + 8} y={y + 13}>
              {r[1]}
            </text>
            <rect
              className="hit"
              x={0}
              y={y - 6}
              width={W}
              height={rowH}
              tabIndex={0}
              onMouseMove={(e) => onTip(e, r[0], [['Requests', r[1], 'var(--s1)']])}
              onMouseLeave={onLeave}
              onBlur={onLeave}
            />
          </g>
        );
      })}
    </svg>
  );
}
