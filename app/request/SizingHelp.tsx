'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { chartsFor, type ChartRow, type SizeField } from '@/lib/sizes';

import { STRINGS, chartText, columnLabel, groupLabel, sizeLabel, type Lang } from './i18n';

/**
 * Does a chart row's "typical age" string cover this many whole years?
 * Anything measured in months is a match only for an under-one.
 */
function ageMatches(ageStr: string, years: number): boolean {
  if (!ageStr) return false;
  if (/mo/.test(ageStr)) return years === 0;
  const range = ageStr.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return years >= +range[1] && years <= +range[2];
  const plus = ageStr.match(/(\d+)\+/);
  if (plus) return years >= +plus[1];
  const one = ageStr.match(/(\d+)/);
  return one ? years === +one[1] : false;
}

function inRange(v: number | null, range: [number, number] | null): boolean {
  return !!range && v != null && v >= range[0] && v <= range[1];
}

export type PickedSize = { size: string; group: string };

/**
 * The chart behind every "Sizing help" button: standard US sizing by age,
 * height and weight, with a find-a-size box that highlights matching rows and
 * a "Use this" button on each one.
 *
 * It is help, never a substitute: nothing here fills a field on its own, and
 * the caveat says so.
 */
export default function SizingHelp({
  field,
  gender,
  ageYears,
  lang,
  onPick,
  onClose,
}: {
  field: SizeField;
  gender: string;
  ageYears: number | null;
  lang: Lang;
  onPick: (picked: PickedSize) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [h, setH] = useState('');
  const [w, setW] = useState('');
  const t = STRINGS[lang].help;
  const fieldName = t.field[field];

  useEffect(() => {
    const dlg = ref.current;
    if (dlg && !dlg.open) dlg.showModal();
  }, []);

  const sections = useMemo(() => chartsFor(field, gender), [field, gender]);

  const hNum = Number.parseFloat(h);
  const wNum = Number.parseFloat(w);
  const height = Number.isNaN(hNum) ? null : hNum;
  const weight = Number.isNaN(wNum) ? null : wNum;

  const matched = (row: ChartRow): boolean => {
    if (height != null && inRange(height, row.hi)) return true;
    if (weight != null && inRange(weight, row.wi)) return true;
    if (height == null && weight == null && ageYears != null) return ageMatches(row.age, ageYears);
    return false;
  };

  const hits = sections.flatMap((s) =>
    s.rows.filter(matched).map((r) => sizeLabel(r.size, lang)),
  );

  let out: React.ReactNode;
  let outClass = 'est-out empty';
  if (hits.length) {
    outClass = 'est-out';
    out = (
      <>
        {t.closest(fieldName)}
        <strong>{hits.slice(0, 3).join(t.or)}</strong>
      </>
    );
  } else if (height != null || weight != null) {
    out = t.noMatch;
  } else if (ageYears != null) {
    out = t.ageRows(ageYears);
  } else {
    out = t.prompt;
  }

  return (
    <dialog ref={ref} lang={lang} onClose={onClose} onCancel={onClose}>
      <div className="dlg-head">
        <h2>{t.title(fieldName)}</h2>
        <button type="button" className="link-btn" onClick={() => ref.current?.close()}>
          {t.close}
        </button>
      </div>
      <div className="dlg-body">
        <div className="estimator">
          <h3>{t.find}</h3>
          <div className="est-inputs">
            {field !== 'diaper' ? (
              <div className="field">
                <label htmlFor="est-h">{t.height}</label>
                <input
                  id="est-h"
                  type="number"
                  placeholder={`${t.eg} 48`}
                  value={h}
                  onChange={(e) => setH(e.target.value)}
                />
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="est-w">{t.weight}</label>
              <input
                id="est-w"
                type="number"
                placeholder={`${t.eg} 55`}
                value={w}
                onChange={(e) => setW(e.target.value)}
              />
            </div>
          </div>
          <div className={outClass}>{out}</div>
        </div>

        <p className="caveat">{t.caveat}</p>

        {sections.map((sec) => (
          <div key={sec.cap}>
            <div className="grp-cap">{groupLabel(sec.cap, lang)}</div>
            <div className="tbl-scroll">
              <table>
                <thead>
                  <tr>
                    {sec.cols.map((c, i) => (
                      <th key={i}>{columnLabel(c, lang)}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sec.rows.map((row) => (
                    <tr key={row.size} className={matched(row) ? 'match' : undefined}>
                      <td>{sizeLabel(row.size, lang)}</td>
                      <td>{chartText(row.age, lang)}</td>
                      <td>{chartText(row.h, lang)}</td>
                      {sec.cols.length === 4 ? <td>{chartText(row.w, lang)}</td> : null}
                      <td>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => {
                            onPick({ size: row.size, group: sec.cap });
                            ref.current?.close();
                          }}
                        >
                          {t.use}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </dialog>
  );
}
