import { jsPDF } from 'jspdf';

import { DOT, fmtDate } from '@/lib/format';
import type { QueuePerson, QueueRequest } from '@/lib/queries';

/**
 * The pick sheet, drawn at fixed coordinates rather than printed from CSS.
 *
 * Printing the HTML was tried and abandoned: Chrome does not honour
 * `break-inside: avoid` on grid or flex items, so slips split across page
 * boundaries whatever break rules were set. Drawing the PDF makes the page a
 * slip lands on arithmetic.
 *
 * Verified across recipient counts: 1-4 fits one page, 5-10 takes two, and the
 * form caps at 10, so a sheet is never longer than that.
 *
 * Output is black and white by design, to save ink -- no solid fills anywhere
 * except the CRISIS badge, and the only colour is the logo.
 */

const PT = { W: 612, H: 792, M: 36 };
const COL_GAP = 12;
const ROW_GAP = 12;
const CONTENT_W = PT.W - PT.M * 2; // 540
const SLIP_W = (CONTENT_W - COL_GAP) / 2; // 264
const SLIP_H = 230;
/** Whatever is left once two rows of slips have their space on page one. */
const HEAD_H = PT.H - PT.M * 2 - SLIP_H * 2 - ROW_GAP * 2 - ROW_GAP;

/** The masthead logo, already in the DOM, so the PDF needs no extra fetch. */
function logoData(): string | null {
  const img = document.querySelector<HTMLImageElement>('.masthead .logo');
  return img?.src ?? null;
}

function drawHeader(doc: jsPDF, r: QueueRequest, y: number) {
  const x = PT.M;
  const w = CONTENT_W;
  const h = HEAD_H;
  doc.setLineWidth(1.5);
  doc.setDrawColor(0);
  doc.rect(x, y, w, h);

  const pad = 12;
  let cy = y + pad;

  const logo = logoData();
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', x + pad, cy, 40, 40);
    } catch {
      /* a missing logo must never cost the volunteer their sheet */
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CLOTHING REQUEST', x + pad + 50, cy + 14);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text('REQUEST #' + r.number, x + w - pad, cy + 14, { align: 'right' });

  if (r.crisis) {
    const bw = 62;
    const bh = 16;
    const bx = x + w - pad - bw;
    const by = cy + 22;
    doc.setFillColor(0, 0, 0);
    doc.rect(bx, by, bw, bh, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CRISIS', bx + bw / 2, by + 11.5, { align: 'center' });
    doc.setTextColor(0);
  }

  cy += 48;
  doc.setLineWidth(0.5);
  doc.line(x + pad, cy, x + w - pad, cy);

  cy += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('REQUESTED BY', x + pad, cy);
  cy += 20;
  doc.setFontSize(22);
  doc.text(r.name, x + pad, cy);
  cy += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(r.org || 'Requesting for their own household', x + pad, cy);

  // One strip: contact and counts together.
  cy += 12;
  const sh = 30;
  const sx = x + pad;
  const sw = w - pad * 2;
  doc.setLineWidth(0.5);
  doc.rect(sx, cy, sw, sh);
  const cells: [string, string][] = [
    ['PHONE', r.phone],
    ['EMAIL', r.email],
    ['RECEIVED', fmtDate(r.receivedOn)],
    ['RECIPIENTS', String(r.people.length)],
  ];
  const cw = sw / cells.length;
  cells.forEach((c, i) => {
    const cx = sx + cw * i;
    if (i) doc.line(cx, cy, cx, cy + sh);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text(c[0], cx + 6, cy + 11);
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(c[1], cw - 12)[0], cx + 6, cy + 23);
  });

  cy += sh + 10;
  const bottom = y + h - pad; // never draw past the header box

  // Volunteer notes print ABOVE the prayer request: they are instructions for
  // whoever is holding the sheet, so they earn the higher position. Two lines
  // print; the rest stays on screen.
  if (r.notes && cy + 16 < bottom) {
    doc.setLineWidth(2);
    doc.line(x + pad, cy - 2, x + pad, cy + 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('VOLUNTEER NOTES', x + pad + 6, cy + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const nl = doc.splitTextToSize(r.notes, w - pad * 2 - 12);
    const room = Math.max(0, Math.floor((bottom - (cy + 13)) / 10));
    const shown = Math.min(2, room, nl.length);
    for (let li = 0; li < shown; li++) doc.text(nl[li], x + pad + 6, cy + 13 + li * 10);
    cy += 13 + shown * 10 + 6;
  }

  if (r.prayer && cy + 16 < bottom) {
    doc.setLineWidth(2);
    doc.line(x + pad, cy - 2, x + pad, cy + 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('PRAYER REQUEST', x + pad + 6, cy + 3);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize('“' + r.prayer + '”', w - pad * 2 - 12)[0], x + pad + 6, cy + 13);
  }
}

/**
 * One slip per recipient, each self-contained and traceable -- requester name,
 * agency, request number, "3 of 5" -- so a slip separated from the others on
 * the sorting table still says who it belongs to.
 */
function drawSlip(
  doc: jsPDF,
  r: QueueRequest,
  person: QueuePerson,
  index: number,
  total: number,
  x: number,
  y: number,
) {
  const w = SLIP_W;
  const h = SLIP_H;
  const pad = 9;
  doc.setLineWidth(0.8);
  doc.setDrawColor(0);
  doc.rect(x, y, w, h);

  let cy = y + 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(r.name, w - pad * 2 - 52)[0], x + pad, cy);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.text(index + ' of ' + total, x + w - pad, cy, { align: 'right' });
  cy += 11;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(doc.splitTextToSize(r.org || 'Own household', w - pad * 2 - 40)[0], x + pad, cy);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.text('#' + r.number, x + w - pad, cy, { align: 'right' });

  if (r.crisis) {
    cy += 12;
    const bw = 44;
    const bh = 12;
    doc.setFillColor(0, 0, 0);
    doc.rect(x + pad, cy - 9, bw, bh, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('CRISIS', x + pad + bw / 2, cy - 0.5, { align: 'center' });
    doc.setTextColor(0);
    cy -= 2;
  }

  cy += 8;
  doc.setLineWidth(1.2);
  doc.line(x, cy, x + w, cy);

  cy += 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(doc.splitTextToSize(person.name, w - pad * 2)[0], x + pad, cy);
  cy += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(person.age, x + pad, cy);

  // 2x2 size grid.
  cy += 8;
  const gx = x + pad;
  const gw = w - pad * 2;
  const cw = gw / 2;
  const ch = 38;
  doc.setLineWidth(0.5);
  doc.rect(gx, cy, gw, ch * 2);
  doc.line(gx + cw, cy, gx + cw, cy + ch * 2);
  doc.line(gx, cy + ch, gx + gw, cy + ch);

  const vals: [string, string | null][] = [
    ['SHIRT', person.shirt],
    ['PANTS', person.pant],
    ['SHOES', person.shoe],
    ['DIAPERS', person.diaper],
  ];
  vals.forEach((v, i) => {
    const cx = gx + (i % 2) * cw;
    const cyy = cy + Math.floor(i / 2) * ch;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text(v[0], cx + 5, cyy + 10);
    if (v[1]) {
      // The size and the list it came from, split so the list can be set small.
      const parts = String(v[1]).split(' ' + DOT + ' ');
      const main = parts[0];
      const sub = parts.slice(1).join(' ' + DOT + ' ');
      doc.setFont('courier', 'bold');
      doc.setFontSize(12);
      doc.text(doc.splitTextToSize(main, cw - 10)[0], cx + 5, cyy + 24);
      if (sub) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text(doc.splitTextToSize(sub, cw - 10)[0], cx + 5, cyy + 33);
      }
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('Not needed', cx + 5, cyy + 24);
    }
  });

  cy += ch * 2 + 12;

  if (person.flag) {
    doc.setLineWidth(2);
    doc.line(x + pad, cy - 8, x + pad, cy + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const fl = doc.splitTextToSize(person.flag, w - pad * 2 - 8);
    doc.text(fl[0], x + pad + 6, cy);
    if (fl[1]) {
      doc.text(fl[1], x + pad + 6, cy + 9);
      cy += 9;
    }
    cy += 14;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('ITEMS NEEDED MOST', x + pad, cy);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const notes = doc.splitTextToSize(person.itemsNeeded || '—', w - pad * 2);
  const maxLines = Math.max(1, Math.floor((y + h - (cy + 10)) / 10));
  notes.slice(0, maxLines).forEach((ln: string, i: number) => {
    doc.text(ln, x + pad, cy + 10 + i * 10);
  });
}

export function buildPickSheet(r: QueueRequest): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const total = r.people.length;
  let i = 0;
  let page = 0;

  while (i < total) {
    if (page > 0) doc.addPage();
    let top = PT.M;
    let rowsThisPage: number;
    if (page === 0) {
      drawHeader(doc, r, top);
      top += HEAD_H + ROW_GAP;
      rowsThisPage = 2; // 4 slips beneath the header
    } else {
      rowsThisPage = 3; // 6 slips on a full page
    }
    for (let row = 0; row < rowsThisPage && i < total; row++) {
      for (let col = 0; col < 2 && i < total; col++) {
        drawSlip(
          doc,
          r,
          r.people[i],
          i + 1,
          total,
          PT.M + col * (SLIP_W + COL_GAP),
          top + row * (SLIP_H + ROW_GAP),
        );
        i++;
      }
    }
    page++;
  }
  return doc;
}

export function pickSheetName(r: QueueRequest): string {
  return `pick-sheet-${r.number}${r.crisis ? '-CRISIS' : ''}.pdf`;
}

/** iPadOS reports itself as a Mac, so touch points are the reliable tell. */
export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
