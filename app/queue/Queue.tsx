'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DECLINE_REASONS, STATUS_LABEL, type RequestStatus } from '@/db/schema';
import { fmtDate, todayISO, waitText } from '@/lib/format';
import type { QueueRequest } from '@/lib/queries';

import {
  declineRequest,
  markFilled,
  markPrinted,
  reopenRequest,
  restoreRequest,
  saveNote,
  setCrisis,
} from './actions';
import { buildPickSheet, isIOS, pickSheetName } from './pickSheet';

type FilterKey = 'open' | 'crisis' | RequestStatus | 'all';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'open', label: 'To do' },
  { key: 'crisis', label: 'Crisis' },
  { key: 'new', label: 'Not started' },
  { key: 'progress', label: 'Printed' },
  { key: 'filled', label: 'Filled' },
  { key: 'declined', label: 'Declined' },
  { key: 'all', label: 'All' },
];

/** A request leaves the queue when it is filled or declined. */
const isOpen = (r: QueueRequest) => r.status !== 'filled' && r.status !== 'declined';

function matches(r: QueueRequest, q: string): boolean {
  if (!q) return true;
  // The same box is the "pull up records" lookup: a volunteer starting a new
  // request searches a phone, an email, an agency or a request number here.
  const hay = [
    r.number,
    r.name,
    r.org ?? '',
    r.phone,
    r.phone.replace(/\D/g, ''),
    r.email,
    r.notes,
    r.people.map((p) => p.name).join(' '),
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function inFilter(r: QueueRequest, f: FilterKey): boolean {
  if (f === 'all') return true;
  if (f === 'open') return isOpen(r);
  if (f === 'crisis') return r.crisis && isOpen(r);
  return r.status === f;
}

type Toast = { msg: string; undo?: () => void };

function SizeCell({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="sz">
      <span className="k">{k}</span>
      {v ? <span className="v">{v}</span> : <span className="v none">Not needed</span>}
    </div>
  );
}

export default function Queue({ initial }: { initial: QueueRequest[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<FilterKey>('open');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [noting, setNoting] = useState<Record<string, boolean>>({});
  const [declining, setDeclining] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Server data wins whenever it arrives: optimistic edits are a stand-in
  // until the revalidated queue comes back.
  useEffect(() => setItems(initial), [initial]);

  useEffect(() => {
    if (!toast) return;
    timer.current = setTimeout(() => setToast(null), 6000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);

  function apply(id: string, patch: Partial<QueueRequest>) {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function after(run: Promise<unknown>, t: Toast) {
    setToast(t);
    run.then(() => router.refresh()).catch(() => {
      setToast({ msg: 'That change did not save. Check the connection and try again.' });
      router.refresh();
    });
  }

  const counts = {
    all: items.length,
    open: items.filter(isOpen).length,
    crisis: items.filter((r) => r.crisis && isOpen(r)).length,
    new: items.filter((r) => r.status === 'new').length,
    progress: items.filter((r) => r.status === 'progress').length,
    filled: items.filter((r) => r.status === 'filled').length,
    declined: items.filter((r) => r.status === 'declined').length,
    people: items.filter(isOpen).reduce((a, r) => a + r.people.length, 0),
  };

  const list = items
    .filter((r) => inFilter(r, filter) && matches(r, q))
    .sort((a, b) => {
      // Oldest waiting first -- the queue is worked front to back.
      if (isOpen(a) !== isOpen(b)) return isOpen(a) ? -1 : 1;
      // Crisis requests rise to the top of the open work, then oldest first.
      if (isOpen(a) && a.crisis !== b.crisis) return a.crisis ? -1 : 1;
      return a.receivedOn < b.receivedOn ? -1 : a.receivedOn > b.receivedOn ? 1 : 0;
    });

  // -------------------------------------------------------------------------
  // Printing. Three delivery paths, because the volunteers work on an iPad.
  // -------------------------------------------------------------------------
  async function doPrint(r: QueueRequest) {
    const wasPrinted = r.status === 'progress';
    let doc;
    try {
      doc = buildPickSheet(r);
    } catch (e) {
      setToast({ msg: 'Could not build the pick sheet PDF: ' + (e as Error).message });
      return;
    }
    const name = pickSheetName(r);

    const recordPrinted = () => {
      if (r.status === 'new') {
        apply(r.id, { status: 'progress', printedOn: todayISO() });
        markPrinted(r.id).then(() => router.refresh());
      }
    };

    // 1. iPad: hand the PDF to the iOS share sheet, where AirPrint lives.
    //    Safari will not reliably open a blob: URL in a new tab.
    if (isIOS() && navigator.canShare) {
      try {
        const file = new File([doc.output('blob')], name, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator
            .share({ files: [file], title: 'Pick sheet — ' + r.name })
            .then(() => {
              recordPrinted();
              setToast({ msg: 'Pick sheet sent to the share sheet — choose Print.' });
            })
            .catch(() => {
              /* the volunteer cancelled; nothing to report */
            });
          return;
        }
      } catch {
        /* fall through to the tab, then the file */
      }
    }

    // 2. Desktop over http: open it in a tab and print from there.
    let opened: Window | null = null;
    try {
      opened = window.open(doc.output('bloburl') as unknown as string, '_blank');
    } catch {
      opened = null;
    }

    if (opened) {
      recordPrinted();
      setToast({
        msg: wasPrinted
          ? `Pick sheet for ${r.name} reopened in a new tab.`
          : `Pick sheet for ${r.name} opened in a new tab — print it from there.`,
      });
      return;
    }

    // 3. Anything else: save the file rather than lose it.
    try {
      doc.save(name);
      recordPrinted();
      setToast({ msg: `New tab was blocked, so ${name} was saved instead.` });
    } catch {
      setToast({ msg: 'This browser blocked both a new tab and the download — try another one.' });
    }
  }

  return (
    <div className="app">
      <header className="masthead">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo" src="/logo.png" alt="Clarksburg Closet" width={62} height={62} />
        <div className="mast-text">
          <div className="eyebrow">Volunteer view</div>
          <h1>Request Queue</h1>
        </div>
      </header>

      <div className="stats">
        <div className="stat">
          <span className="k">Waiting</span>
          <span className="v">{counts.open}</span>
        </div>
        <div className="stat is-crisis-stat">
          <span className="k">Crisis</span>
          <span className="v">{counts.crisis}</span>
        </div>
        <div className="stat">
          <span className="k">People to clothe</span>
          <span className="v">{counts.people}</span>
        </div>
        <div className="stat is-filled">
          <span className="k">Filled</span>
          <span className="v">{counts.filled}</span>
        </div>
      </div>

      <div className="controls">
        <div className="filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="filter"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="n">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="search">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, agency, phone or email…"
            aria-label="Search requests"
          />
          <span className="hint">Also finds a request by its number.</span>
        </div>
      </div>

      <div className="queue">
        {list.length === 0 ? (
          <div className="empty">No requests match. Try another filter or clear the search.</div>
        ) : (
          list.map((r) => (
            <article
              key={r.id}
              className={`req s-${r.status}${r.crisis ? ' is-crisis' : ''}`}
            >
              <div className="req-main">
                <div className="req-who">
                  <h2 className="req-name">{r.name}</h2>
                  <div className="req-org">
                    {r.org ?? <em>Requesting for their own household</em>}
                  </div>
                  {/* Phone and email sit on the row itself: chasing a missing
                      size or a pickup time is the commonest reason a volunteer
                      opens a request at all. */}
                  <div className="req-contact">
                    <a href={'tel:' + r.phone.replace(/[^0-9+]/g, '')}>{r.phone}</a>
                    <a href={'mailto:' + r.email}>{r.email}</a>
                  </div>
                  <div className="req-facts">
                    <span className="id">#{r.number}</span>
                    <span>
                      {r.people.length} {r.people.length === 1 ? 'recipient' : 'recipients'}
                    </span>
                    <span>
                      Received {fmtDate(r.receivedOn)} · {waitText(r.receivedOn)}
                    </span>
                    {r.status === 'filled' && r.filledOn ? (
                      <span>Filled {fmtDate(r.filledOn)}</span>
                    ) : null}
                    {r.status === 'declined' && r.declinedOn ? (
                      <span>Declined {fmtDate(r.declinedOn)}</span>
                    ) : null}
                    {r.status === 'progress' && r.printedOn ? (
                      <span>Printed {fmtDate(r.printedOn)}</span>
                    ) : null}
                  </div>
                </div>

                <div className="req-side">
                  <div className="pills">
                    {r.crisis ? <span className="pill crisis">Crisis</span> : null}
                    <span className={'pill ' + r.status}>{STATUS_LABEL[r.status]}</span>
                  </div>

                  <label className={'crisis-check' + (r.crisis ? ' on' : '')}>
                    <input
                      type="checkbox"
                      checked={r.crisis}
                      onChange={(e) => {
                        const on = e.target.checked;
                        apply(r.id, { crisis: on });
                        after(setCrisis(r.id, on), {
                          msg: on
                            ? `${r.name}’s request marked crisis — moved to the top of the queue.`
                            : `Crisis flag removed from ${r.name}’s request.`,
                        });
                      }}
                    />
                    Crisis
                  </label>

                  <div className="acts">
                    <button
                      type="button"
                      className="btn quiet"
                      onClick={() => setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))}
                    >
                      {expanded[r.id] ? 'Hide sizes' : 'View sizes'}
                    </button>

                    {/* A note can be added at any point, including after a
                        request is closed. */}
                    <button
                      type="button"
                      className="btn quiet"
                      onClick={() => setNoting((s) => ({ ...s, [r.id]: !s[r.id] }))}
                    >
                      {r.notes ? 'Edit note' : 'Add note'}
                    </button>

                    {isOpen(r) ? (
                      <>
                        <button type="button" className="btn ghost" onClick={() => doPrint(r)}>
                          {r.status === 'progress' ? 'Open PDF again' : 'Print pick sheet'}
                        </button>
                        <button
                          type="button"
                          className="btn done"
                          onClick={() => {
                            const prev = { status: r.status, filledOn: r.filledOn };
                            apply(r.id, { status: 'filled', filledOn: todayISO() });
                            after(markFilled(r.id), {
                              msg: `${r.name}’s request marked filled.`,
                              undo: () => {
                                apply(r.id, prev);
                                restoreRequest(r.id, prev).then(() => router.refresh());
                              },
                            });
                          }}
                        >
                          Mark filled
                        </button>
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => setDeclining((s) => ({ ...s, [r.id]: !s[r.id] }))}
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn quiet"
                        onClick={() => {
                          const next: RequestStatus = r.printedOn ? 'progress' : 'new';
                          apply(r.id, {
                            status: next,
                            filledOn: null,
                            declinedOn: null,
                            declineReason: null,
                            declineNote: '',
                          });
                          after(reopenRequest(r.id, !!r.printedOn), {
                            msg: `${r.name}’s request reopened.`,
                          });
                        }}
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {r.status === 'declined' && r.declineReason ? (
                <div className="decline-panel">
                  <span className="cap">Reason given</span>
                  <div className="reason-line">
                    {r.declineReason}
                    {r.declineNote ? ` — ${r.declineNote}` : ''}
                  </div>
                </div>
              ) : null}

              {declining[r.id] ? (
                <DeclinePanel
                  onCancel={() => setDeclining((s) => ({ ...s, [r.id]: false }))}
                  onConfirm={(reason, note) => {
                    const prev = {
                      status: r.status,
                      declinedOn: r.declinedOn,
                      declineReason: r.declineReason,
                      declineNote: r.declineNote,
                    };
                    setDeclining((s) => ({ ...s, [r.id]: false }));
                    apply(r.id, {
                      status: 'declined',
                      declinedOn: todayISO(),
                      declineReason: reason,
                      declineNote: note,
                    });
                    after(declineRequest(r.id, reason, note), {
                      msg: `${r.name}’s request declined — ${reason.toLowerCase()}.`,
                      undo: () => {
                        apply(r.id, prev);
                        restoreRequest(r.id, prev).then(() => router.refresh());
                      },
                    });
                  }}
                />
              ) : null}

              {noting[r.id] || r.notes ? (
                <NotesBox
                  request={r}
                  editing={!!noting[r.id]}
                  onCancel={() => setNoting((s) => ({ ...s, [r.id]: false }))}
                  onSave={(text) => {
                    const prev = { status: r.status, notes: r.notes, notesUpdatedAt: r.notesUpdatedAt };
                    const trimmed = text.trim();
                    setNoting((s) => ({ ...s, [r.id]: false }));
                    apply(r.id, {
                      notes: trimmed,
                      notesUpdatedAt: trimmed ? todayISO() : null,
                    });
                    after(saveNote(r.id, trimmed), {
                      msg: trimmed
                        ? `Note saved on ${r.name}’s request.`
                        : `Note cleared from ${r.name}’s request.`,
                      undo: () => {
                        apply(r.id, prev);
                        restoreRequest(r.id, prev).then(() => router.refresh());
                      },
                    });
                  }}
                />
              ) : null}

              {expanded[r.id] ? (
                <div className="req-detail">
                  <div className="detail-cap">
                    {r.people.length} {r.people.length === 1 ? 'recipient' : 'recipients'}
                  </div>
                  <div className="rlist">
                    {r.people.map((p, i) => (
                      <div className="rrow" key={i}>
                        <div className="who">
                          <span className="rn">{p.name}</span>
                          <span className="ra">{p.age}</span>
                        </div>
                        <SizeCell k="Shirt" v={p.shirt} />
                        <SizeCell k="Pants" v={p.pant} />
                        <SizeCell k="Shoes" v={p.shoe} />
                        <SizeCell k="Diapers" v={p.diaper} />
                        {p.flag ? <div className="rflag">{p.flag}</div> : null}
                      </div>
                    ))}
                  </div>
                  {r.prayer ? <div className="prayer-line">“{r.prayer}”</div> : null}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      {toast ? (
        <div className="toast" role="status">
          <span>{toast.msg}</span>
          {toast.undo ? (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              Undo
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Declining requires a reason: "why was I turned down?" needs an answer months later. */
function DeclinePanel({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: (typeof DECLINE_REASONS)[number], note: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  return (
    <div className="decline-panel">
      <span className="cap">Decline this request</span>
      <div className="decline-fields">
        <select
          aria-label="Reason for declining"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="">Choose a reason…</option>
          {DECLINE_REASONS.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Note for the record (optional)"
          aria-label="Note about the decline"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="decline-actions">
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (!reason) return;
            onConfirm(reason as (typeof DECLINE_REASONS)[number], note.trim());
          }}
        >
          Confirm decline
        </button>
        <button type="button" className="btn quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function NotesBox({
  request,
  editing,
  onSave,
  onCancel,
}: {
  request: QueueRequest;
  editing: boolean;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(request.notes);
  useEffect(() => setText(request.notes), [request.notes, editing]);

  return (
    <div className="notes-box">
      <div className="cap">
        Volunteer notes
        {request.notesUpdatedAt && !editing ? (
          <span className="when">last updated {fmtDate(request.notesUpdatedAt)}</span>
        ) : null}
      </div>

      {!editing ? (
        <div className="notes-text">{request.notes}</div>
      ) : (
        <>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Anything the next volunteer should know — a call made, a pickup time, something to check at the rack."
            aria-label={`Volunteer notes for ${request.name}’s request`}
          />
          <div className="notes-actions">
            <button type="button" className="btn" onClick={() => onSave(text)}>
              Save note
            </button>
            <button type="button" className="btn quiet" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
