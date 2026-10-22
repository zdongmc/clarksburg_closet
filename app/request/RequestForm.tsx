'use client';

import { useEffect, useMemo, useState } from 'react';

import SizingHelp, { type PickedSize } from './SizingHelp';
import { submitRequest } from './actions';
import { STRINGS, groupLabel, sizeLabel, type Lang } from './i18n';
import {
  ADULT_GROUPS,
  DIAPERS,
  MENS_INSEAM,
  NOT_NEEDED,
  pantGroups,
  shirtGroups,
  shoeGroups,
  type SizeField,
  type SizeGroup,
} from '@/lib/sizes';

const MAX_RECIPIENTS = 10;

/**
 * A chosen size carries the list it came from, not just its face value.
 * Encoding the group into the option value is what stops the paper form's
 * central failure: a bare "10" that nobody downstream can read as a girls' 10
 * rather than a women's 10.
 */
const encode = (group: string, size: string) => `${group}|${size}`;

function decode(value: string): { group: string; size: string } {
  if (!value || value === NOT_NEEDED) return { group: '', size: value };
  const i = value.indexOf('|');
  return i === -1 ? { group: '', size: value } : { group: value.slice(0, i), size: value.slice(i + 1) };
}

type Draft = {
  key: number;
  name: string;
  gender: string;
  ageValue: string;
  ageUnit: 'years' | 'months';
  shirt: string;
  pant: string;
  inseam: string;
  shoes: string[];
  needsDiaper: boolean;
  diaper: string;
  itemsNeeded: string;
};

let nextKey = 1;

// The first recipient's key is fixed: the counter lives on across server
// renders, and its ids must match between the server's HTML and hydration.
function blankRecipient(key = nextKey++): Draft {
  return {
    key,
    name: '',
    gender: '',
    ageValue: '',
    ageUnit: 'years',
    shirt: '',
    pant: '',
    inseam: '',
    shoes: [],
    needsDiaper: false,
    diaper: '',
    itemsNeeded: '',
  };
}

function ageYearsOf(d: Draft): number | null {
  const v = Number.parseFloat(d.ageValue);
  if (Number.isNaN(v)) return null;
  return d.ageUnit === 'months' ? Math.floor(v / 12) : Math.floor(v);
}

/** Keep a chosen size when the gender change leaves it still on offer. */
function stillOffered(value: string, groups: SizeGroup[]): boolean {
  if (!value || value === NOT_NEEDED) return true;
  const { group, size } = decode(value);
  return groups.some((g) => g.label === group && g.opts.includes(size));
}

function SizeSelect({
  id,
  label,
  value,
  groups,
  placeholder,
  invalid,
  onChange,
  onHelp,
  note,
  lang,
}: {
  id: string;
  label: string;
  value: string;
  groups: SizeGroup[];
  placeholder: string;
  invalid: boolean;
  onChange: (v: string) => void;
  onHelp: () => void;
  note: string | null;
  lang: Lang;
}) {
  const t = STRINGS[lang];
  return (
    <div className="field sizefield">
      <div className="lbl-row">
        <label htmlFor={id}>
          {label} <span className="req">*</span>
        </label>
        <button type="button" className="info-btn" onClick={onHelp}>
          {t.sizingHelp}
        </button>
      </div>
      <select
        id={id}
        className={invalid ? 'invalid' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        <option value={NOT_NEEDED}>{t.notNeeded}</option>
        {groups.map((g) => (
          <optgroup key={g.label} label={groupLabel(g.label, lang)}>
            {g.opts.map((o) => (
              <option key={o} value={encode(g.label, o)}>
                {sizeLabel(o, lang)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {note ? <div className="cross-note">{note}</div> : null}
    </div>
  );
}

export default function RequestForm({
  agencies,
  initialLang,
}: {
  agencies: string[];
  initialLang: Lang;
}) {
  // Switching language keeps everything typed so far: only the words change,
  // never a stored value. The URL follows so the Spanish form can be shared.
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = STRINGS[lang];
  useEffect(() => {
    document.title = t.docTitle;
    const url = new URL(window.location.href);
    url.searchParams.set('lang', lang);
    window.history.replaceState(null, '', url);
  }, [lang, t.docTitle]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [date, setDate] = useState(today);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [agency, setAgency] = useState('');
  const [prayer, setPrayer] = useState('');
  const [people, setPeople] = useState<Draft[]>(() => [blankRecipient(0)]);

  const [problems, setProblems] = useState<string[]>([]);
  const [badFields, setBadFields] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: string; recipientCount: number } | null>(null);

  const [help, setHelp] = useState<{ field: SizeField; index: number } | null>(null);

  // A list of missing answers already on screen follows the switch too.
  useEffect(() => {
    if (problems.length) setProblems(validate().problems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const bad = (k: string) => badFields.has(k);
  const clearBad = (k: string) =>
    setBadFields((s) => {
      if (!s.has(k)) return s;
      const n = new Set(s);
      n.delete(k);
      return n;
    });

  function update(i: number, patch: Partial<Draft>) {
    setPeople((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }

  function setGender(i: number, gender: string) {
    setPeople((prev) =>
      prev.map((p, j) => {
        if (j !== i) return p;
        // Gender narrows the lists. Anything no longer on offer is dropped
        // rather than silently kept as a value the form would not accept.
        const shirt = stillOffered(p.shirt, shirtGroups(gender)) ? p.shirt : '';
        const pant = stillOffered(p.pant, pantGroups(gender)) ? p.pant : '';
        const offeredShoes = new Set(shoeGroups(gender).flatMap((g) => g.opts));
        const shoes =
          p.shoes[0] === NOT_NEEDED ? p.shoes : p.shoes.filter((s) => offeredShoes.has(s));
        return { ...p, gender, shirt, pant, shoes, inseam: pant === p.pant ? p.inseam : '' };
      }),
    );
    clearBad(`gender-${i}`);
  }

  function toggleShoe(i: number, size: string) {
    setPeople((prev) =>
      prev.map((p, j) => {
        if (j !== i) return p;
        const without = p.shoes.filter((s) => s !== NOT_NEEDED);
        const shoes = without.includes(size)
          ? without.filter((s) => s !== size)
          : [...without, size];
        return { ...p, shoes };
      }),
    );
    clearBad(`shoe-${i}`);
  }

  function toggleShoeNone(i: number) {
    setPeople((prev) =>
      prev.map((p, j) =>
        j === i ? { ...p, shoes: p.shoes[0] === NOT_NEEDED ? [] : [NOT_NEEDED] } : p,
      ),
    );
    clearBad(`shoe-${i}`);
  }

  /** "Use this" in the sizing-help dialog fills the field it was opened from. */
  function applyPick(picked: PickedSize) {
    if (!help) return;
    const i = help.index;
    if (help.field === 'shirt') {
      update(i, { shirt: encode(picked.group, picked.size) });
      clearBad(`shirt-${i}`);
    } else if (help.field === 'pant') {
      const size = picked.group === "Men's waist" ? `${picked.size}" waist` : picked.size;
      update(i, { pant: encode(picked.group, size) });
      clearBad(`pant-${i}`);
    } else if (help.field === 'shoe') {
      toggleShoe(i, picked.size);
    } else {
      update(i, { diaper: picked.size });
      clearBad(`diaper-${i}`);
    }
  }

  function validate(): { problems: string[]; bad: Set<string> } {
    const out: string[] = [];
    const flags = new Set<string>();

    if (!name.trim()) {
      flags.add('req-name');
      out.push(t.missingName);
    }
    if (!phone.trim()) {
      flags.add('req-phone');
      out.push(t.missingPhone);
    }
    if (!email.trim()) {
      flags.add('req-email');
      out.push(t.missingEmail);
    }

    people.forEach((p, i) => {
      const missing: string[] = [];
      if (!p.name.trim()) {
        flags.add(`name-${i}`);
        missing.push(t.missing.name);
      }
      if (!p.gender) {
        flags.add(`gender-${i}`);
        missing.push(t.missing.gender);
      }
      if (!p.ageValue) {
        flags.add(`age-${i}`);
        missing.push(t.missing.age);
      }
      if (!p.shirt) {
        flags.add(`shirt-${i}`);
        missing.push(t.missing.shirt);
      }
      if (!p.pant) {
        flags.add(`pant-${i}`);
        missing.push(t.missing.pant);
      } else if (decode(p.pant).group === "Men's waist" && !p.inseam) {
        flags.add(`inseam-${i}`);
        missing.push(t.missing.inseam);
      }
      if (!p.shoes.length) {
        flags.add(`shoe-${i}`);
        missing.push(t.missing.shoe);
      }
      if (p.needsDiaper && !p.diaper) {
        flags.add(`diaper-${i}`);
        missing.push(t.missing.diaper);
      }
      if (missing.length) out.push(t.recipientMissing(i + 1, p.name.trim(), missing));
    });

    return { problems: out, bad: flags };
  }

  async function onSubmit() {
    setServerError(null);
    const { problems: found, bad: flags } = validate();
    setProblems(found);
    setBadFields(flags);
    if (found.length) {
      document.getElementById('submit-errors')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSending(true);
    try {
      const result = await submitRequest({
        receivedOn: date || today,
        requesterName: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        agency: agency.trim(),
        prayer: prayer.trim(),
        recipients: people.map((p) => {
          const shirt = decode(p.shirt);
          const pant = decode(p.pant);
          const mens = pant.group === "Men's waist";
          return {
            name: p.name.trim(),
            gender: p.gender,
            ageValue: Number(p.ageValue),
            ageUnit: p.ageUnit,
            shirtSize: shirt.size,
            shirtGroup: shirt.group || null,
            pantSize: mens ? null : pant.size,
            pantGroup: pant.group || null,
            pantWaist: mens ? pant.size.replace(/\D/g, '') : null,
            pantInseam: mens ? p.inseam : null,
            shoeSizes: p.shoes,
            diaperSize: p.needsDiaper ? p.diaper : null,
            itemsNeeded: p.itemsNeeded.trim(),
          };
        }),
      });
      if ('error' in result) setServerError(t.serverError?.[result.code] ?? result.error);
      else setDone(result);
    } catch {
      setServerError(t.networkError);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="wrap" lang={lang}>
        <header className="masthead">
          <div className="brand-lockup">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo" src="/logo.png" alt="Clarksburg Closet" width={72} height={72} />
            <div className="brand-text">
              <div className="eyebrow">{t.doneEyebrow}</div>
              <h1>{t.doneTitle}</h1>
            </div>
          </div>
        </header>
        <section className="panel">
          <h2>{t.doneHeading}</h2>
          <p className="lede">{t.doneNumber(done.number, done.recipientCount)}</p>
          <p className="lede">{t.doneContact(email, phone)}</p>
          <div className="actions">
            <a className="btn" href={`/request?lang=${lang}`}>
              {t.another}
            </a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="wrap" lang={lang}>
      <header className="masthead">
        <button
          type="button"
          className="lang-btn"
          lang={t.switchLang}
          aria-label={t.switchAria}
          onClick={() => setLang(t.switchLang)}
        >
          {t.switchTo}
        </button>
        <div className="brand-lockup">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo" src="/logo.png" alt="Clarksburg Closet" width={72} height={72} />
          <div className="brand-text">
            <div className="eyebrow">23810 Stringtown Road · Clarksburg, MD</div>
            <h1>{t.title}</h1>
          </div>
        </div>
        <p className="lede">{t.lede}</p>
      </header>

      <section className="panel">
        <h2>{t.whoHeading}</h2>
        <div className="row">
          <div className="field">
            <label htmlFor="req-date">{t.date}</label>
            <input
              type="date"
              id="req-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="req-name">
              {t.yourName} <span className="req">*</span>
            </label>
            <input
              type="text"
              id="req-name"
              placeholder={t.namePlaceholder}
              className={bad('req-name') ? 'invalid' : undefined}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearBad('req-name');
              }}
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="req-phone">
              {t.phone} <span className="req">*</span>
            </label>
            <input
              type="tel"
              id="req-phone"
              placeholder="(301) 555-0100"
              className={bad('req-phone') ? 'invalid' : undefined}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearBad('req-phone');
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="req-email">
              {t.email} <span className="req">*</span>
            </label>
            <input
              type="email"
              id="req-email"
              placeholder={t.emailPlaceholder}
              className={bad('req-email') ? 'invalid' : undefined}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearBad('req-email');
              }}
            />
            <div className="hint">{t.emailHint}</div>
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="req-agency">{t.agency}</label>
            <input
              type="text"
              id="req-agency"
              list="agency-list"
              placeholder={t.agencyPlaceholder}
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
            />
            {/* Type-ahead against agencies already on file, so the list does not
                fragment into "Mercy Health" and "Mercy Health Svc". */}
            <datalist id="agency-list">
              {agencies.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
            <div className="hint">{t.agencyHint}</div>
          </div>
        </div>
      </section>

      {people.map((p, i) => {
        const years = ageYearsOf(p);
        const shirtG = shirtGroups(p.gender);
        const pantG = pantGroups(p.gender);
        const shirtSel = decode(p.shirt);
        const pantSel = decode(p.pant);
        const isMensPant = pantSel.group === "Men's waist";

        const adultNote = (group: string) =>
          ADULT_GROUPS.includes(group) && years != null && years < 13 ? t.adultNote(years) : null;

        return (
          <section className="recip" key={p.key}>
            <div className="recip-head">
              <h3>
                {t.recipient} <span className="recip-num">{i + 1}</span>
              </h3>
              {people.length > 1 ? (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setPeople((prev) => prev.filter((_, j) => j !== i))}
                >
                  {t.remove}
                </button>
              ) : null}
            </div>

            <div className="row">
              <div className="field">
                <label htmlFor={`r${p.key}-name`}>
                  {t.name} <span className="req">*</span>
                </label>
                <input
                  type="text"
                  id={`r${p.key}-name`}
                  placeholder={t.namePlaceholder}
                  className={bad(`name-${i}`) ? 'invalid' : undefined}
                  value={p.name}
                  onChange={(e) => {
                    update(i, { name: e.target.value });
                    clearBad(`name-${i}`);
                  }}
                />
              </div>

              <div className="field">
                <label htmlFor={`r${p.key}-gender`}>
                  {t.gender} <span className="req">*</span>
                </label>
                <select
                  id={`r${p.key}-gender`}
                  className={bad(`gender-${i}`) ? 'invalid' : undefined}
                  value={p.gender}
                  onChange={(e) => setGender(i, e.target.value)}
                >
                  <option value="">{t.select}</option>
                  <option value="female">{t.female}</option>
                  <option value="male">{t.male}</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor={`r${p.key}-age`}>
                  {t.age} <span className="req">*</span>
                </label>
                <div className="age-row">
                  <input
                    type="number"
                    id={`r${p.key}-age`}
                    min="0"
                    placeholder="0"
                    className={bad(`age-${i}`) ? 'invalid' : undefined}
                    value={p.ageValue}
                    onChange={(e) => {
                      update(i, { ageValue: e.target.value });
                      clearBad(`age-${i}`);
                    }}
                  />
                  <select
                    id={`r${p.key}-ageunit`}
                    aria-label={t.ageUnit}
                    value={p.ageUnit}
                    onChange={(e) => update(i, { ageUnit: e.target.value as 'years' | 'months' })}
                  >
                    <option value="years">{t.yearsOld}</option>
                    <option value="months">{t.monthsOld}</option>
                  </select>
                </div>
                <div className="hint">{t.ageHint}</div>
              </div>
            </div>

            <div className="row">
              <SizeSelect
                id={`r${p.key}-shirt`}
                label={t.shirt}
                value={p.shirt}
                groups={shirtG}
                placeholder={t.shirtPlaceholder}
                lang={lang}
                invalid={bad(`shirt-${i}`)}
                onChange={(v) => {
                  update(i, { shirt: v });
                  clearBad(`shirt-${i}`);
                }}
                onHelp={() => setHelp({ field: 'shirt', index: i })}
                note={adultNote(shirtSel.group)}
              />
              <SizeSelect
                id={`r${p.key}-pant`}
                label={t.pant}
                value={p.pant}
                groups={pantG}
                placeholder={t.pantPlaceholder}
                lang={lang}
                invalid={bad(`pant-${i}`)}
                onChange={(v) => {
                  update(i, { pant: v, inseam: decode(v).group === "Men's waist" ? p.inseam : '' });
                  clearBad(`pant-${i}`);
                }}
                onHelp={() => setHelp({ field: 'pant', index: i })}
                note={adultNote(pantSel.group)}
              />
            </div>

            {/* Men's pants are the one size that needs two values. */}
            {isMensPant ? (
              <div className="row">
                <div className="field">
                  <label htmlFor={`r${p.key}-inseam`}>
                    {t.inseam} <span className="req">*</span>
                  </label>
                  <select
                    id={`r${p.key}-inseam`}
                    className={bad(`inseam-${i}`) ? 'invalid' : undefined}
                    value={p.inseam}
                    onChange={(e) => {
                      update(i, { inseam: e.target.value });
                      clearBad(`inseam-${i}`);
                    }}
                  >
                    <option value="">{t.select}</option>
                    {MENS_INSEAM.map((v) => (
                      <option key={v} value={v}>
                        {v}&quot;
                      </option>
                    ))}
                  </select>
                  <div className="hint">{t.inseamHint}</div>
                </div>
              </div>
            ) : null}

            {/* Shoes are multi-select: tick every size that would fit. */}
            <div className="row">
              <div className="field sizefield">
                <div className="lbl-row">
                  <label htmlFor={`r${p.key}-shoe`}>
                    {t.shoe} <span className="req">*</span>
                  </label>
                  <button
                    type="button"
                    className="info-btn"
                    onClick={() => setHelp({ field: 'shoe', index: i })}
                  >
                    {t.sizingHelp}
                  </button>
                </div>
                <details className={`picker${bad(`shoe-${i}`) ? ' invalid' : ''}`}>
                  <summary id={`r${p.key}-shoe`}>
                    {p.shoes.length === 0 ? (
                      <span className="summary-empty">{t.shoePlaceholder}</span>
                    ) : (
                      <span>{p.shoes[0] === NOT_NEEDED ? t.notNeeded : p.shoes.join(', ')}</span>
                    )}
                  </summary>
                  <div className="picker-body">
                    <div className="chips">
                      <button
                        type="button"
                        className="chip none"
                        aria-pressed={p.shoes[0] === NOT_NEEDED}
                        onClick={() => toggleShoeNone(i)}
                      >
                        {t.notNeeded}
                      </button>
                    </div>
                    {shoeGroups(p.gender).map((g) => (
                      <div key={g.label}>
                        <div className="chip-cap">{groupLabel(g.label, lang)}</div>
                        <div className="chips">
                          {g.opts.map((o) => (
                            <button
                              key={o}
                              type="button"
                              className="chip"
                              aria-pressed={p.shoes.includes(o)}
                              onClick={() => toggleShoe(i, o)}
                            >
                              {o}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
                <div className="hint">{t.shoeHint}</div>
              </div>
            </div>

            {/* Diapers are opt-in, so an adult recipient is never asked a
                pointless question. There are no adult sizes on the list. */}
            <div className="field">
              <label className="check">
                <input
                  type="checkbox"
                  checked={p.needsDiaper}
                  onChange={(e) =>
                    update(i, { needsDiaper: e.target.checked, diaper: e.target.checked ? p.diaper : '' })
                  }
                />
                <span>{t.needsDiaper}</span>
              </label>

              {p.needsDiaper ? (
                <div className="field sizefield">
                  <div className="lbl-row">
                    <label htmlFor={`r${p.key}-diaper`}>
                      {t.diaper} <span className="req">*</span>
                    </label>
                    <button
                      type="button"
                      className="info-btn"
                      onClick={() => setHelp({ field: 'diaper', index: i })}
                    >
                      {t.sizingHelp}
                    </button>
                  </div>
                  <select
                    id={`r${p.key}-diaper`}
                    className={bad(`diaper-${i}`) ? 'invalid' : undefined}
                    value={p.diaper}
                    onChange={(e) => {
                      update(i, { diaper: e.target.value });
                      clearBad(`diaper-${i}`);
                    }}
                  >
                    <option value="">{t.diaperPlaceholder}</option>
                    <optgroup label={groupLabel('Diapers and pull-ups', lang)}>
                      {DIAPERS.map((d) => (
                        <option key={d.size} value={d.size}>
                          {sizeLabel(d.size, lang)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor={`r${p.key}-notes`}>{t.items}</label>
              <textarea
                id={`r${p.key}-notes`}
                placeholder={t.itemsPlaceholder}
                value={p.itemsNeeded}
                onChange={(e) => update(i, { itemsNeeded: e.target.value })}
              />
            </div>
          </section>
        );
      })}

      <div className="actions">
        <button
          type="button"
          className="btn ghost"
          disabled={people.length >= MAX_RECIPIENTS}
          onClick={() => setPeople((prev) => [...prev, blankRecipient()])}
        >
          {t.addRecipient}
        </button>
        <span className="hint">{t.countOf(people.length, MAX_RECIPIENTS)}</span>
      </div>

      <section className="panel">
        <h2>{t.prayerHeading}</h2>
        <div className="field">
          <label htmlFor="prayer">{t.prayerLabel}</label>
          <textarea
            id="prayer"
            placeholder={t.optional}
            value={prayer}
            onChange={(e) => setPrayer(e.target.value)}
          />
        </div>
      </section>

      <div id="submit-errors">
        {problems.length ? (
          <div className="summary-err">
            <strong>{t.stillNeeded}</strong>
            <ul>
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {serverError ? (
          <div className="summary-err">
            <strong>{t.couldNotSend}</strong>
            <ul>
              <li>{serverError}</li>
            </ul>
          </div>
        ) : null}
      </div>

      <div className="actions">
        <button type="button" className="btn" disabled={sending} onClick={onSubmit}>
          {sending ? t.sending : t.submit}
        </button>
        <span className="hint">{t.submitHint}</span>
      </div>

      {help ? (
        <SizingHelp
          field={help.field}
          gender={people[help.index]?.gender ?? ''}
          ageYears={people[help.index] ? ageYearsOf(people[help.index]) : null}
          lang={lang}
          onPick={applyPick}
          onClose={() => setHelp(null)}
        />
      ) : null}
    </div>
  );
}
