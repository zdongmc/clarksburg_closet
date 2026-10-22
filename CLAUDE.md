# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo holds a **working application**: a Next.js 15 app on Neon Postgres with Drizzle, built from the mockups that are still here as the design record (`design/mockups/`). It also keeps the reference material (the current paper intake form, `design/reference/`) and the ministry's logo (`public/logo.png`).

The size vocabulary and form behaviour below were settled with the volunteers and should be treated as decided, not re-litigated.

Run it with `pnpm install`, a filled-in `.env.local`, then `pnpm dev`. `pnpm db:push` is only for creating the tables in a **new, empty** database. `.env.local` points at production, where pushing is unsafe (see *Where things live*). See `README.md`.

## The application

| Route | Who it is for | Gated |
| --- | --- | --- |
| `/request` | Case workers and households | No — public |
| `/queue` | Volunteers working the requests | Shared passcode |
| `/reports` | Volunteers and the board | Shared passcode |

Where things live:

- `db/schema.ts` — the whole schema in one file. No migration files. **Never `drizzle-kit push` to the live database** — this drizzle-kit version plans to drop every NOT NULL constraint along with the intended change (README, Gotchas). Apply changes as one hand-written `ALTER TABLE` and keep the schema file in step.
- `lib/sizes.ts` — the size vocabulary. Simultaneously the form's dropdowns, the values the database accepts, and the key for reading sizes off past paper requests.
- `lib/format.ts` — request numbers, size display strings, fiscal-year arithmetic.
- `lib/queries.ts` / `lib/reports.ts` — the queue and the report figures.
- `app/queue/pickSheet.ts` — the jsPDF pick sheet, ported coordinate for coordinate from the mockup.
- `app/globals.css` plus one CSS file per route — the mockups' own CSS, with the three near-identical token blocks merged into `globals.css`.

**Volunteer access is a single shared passcode** (`VOLUNTEER_PASSCODE`), not per-person sign-in — decided on 2026-09-11. The session is a signed cookie carrying only an expiry; `lib/auth.ts` and `middleware.ts` are the whole of it. The consequence is that item 2 below stays open.

### Sizes in the database

Sizes are not one shared vocabulary, so the columns are not either:

- `shirtSize` + `shirtGroup` — a single value, plus the list it came from.
- `pantSize` + `pantGroup`, **or** `pantWaist` + `pantInseam` for men's. Never both.
- `shoeSizes text[]` — a set, because a requester ticks every size that would fit.
- `diaperSize` — nullable, opt-in.

**Every size carries its group.** A stored "10" is exactly the paper form's failure; `shirtGroup` / `pantGroup` are what let it print as "10 · Girls'". The request form encodes the group into every option value (`"Girls'|10"`), and the server action refuses a group+size pair that list does not actually offer.

`'none'` is the stored value for **Not needed** — a decision someone recorded, distinct from a blank.

### Request numbers

`requests.seq` is a Postgres identity column; the displayed `#2026-0413` is composed at read time from the year in `receivedOn` plus the padded seq (`lib/format.ts`). Nothing is stored, so nothing can collide or drift.

## Deployed

Live at **https://clarksburgcloset.vercel.app**, deployed 2026-09-11.

- **GitHub**: `zdongmc/clarksburg_closet`. Push to `main` deploys to production.
- **Vercel**: project `clarksburg_closet` under the team `jethrolams-projects`.
- **Database**: Neon (`neon-aero-ferry`) from the Vercel Marketplace. It sets `POSTGRES_URL` itself, which is the name the app already read.
- **Passcode**: the closet's street number. Guessable by anyone who knows the address, and it gates real recipients' names, phone numbers and prayer requests — change it before real intake (open item 1).

The `vercel` CLI is authenticated and the repo is linked (`.vercel/`, gitignored). Note that the **Vercel MCP connector cannot see this project** — it is scoped to `summer_project` and returns 404 for everything else, so never conclude from `list_projects` that something does not exist. Use the CLI or curl the live URL.

See README.md for the deployment gotchas that cost time (drizzle `--force`, the `vercel env add ... preview` loop, `vercel redeploy` failing on a healthy git link).

## Where this left off

**Last session: 2026-10-22.** The app is still ready for real intake apart from the passcode (item 1 below). The live queue was still empty at the end of the session, so nothing below has yet met a real request. That session:

- **Made the request form bilingual** (English / Español). See *Language / localization* for how it works. A request made on the Spanish form starts with the volunteer note "Form filled out in Spanish."
- **Added recipient marks**: Coat, Include toiletries, Extra love. These are checkboxes on each recipient in the queue, printed as **C**, **T** and a heart on that person's slip. Marking a request crisis ticks Extra love for everyone on it. See *Status / fulfilment*.
- **Took CRISIS off the slips.** Slips are attached to the bags and go home with the families, so CRISIS now prints in the header only, and nothing on a slip may read as a warning.
- **Fixed a hydration mismatch on the request form**: the first recipient's field ids differed between the server and the browser.
- **Found that `drizzle-kit push` is unsafe on this database**: it planned to drop every NOT NULL constraint. The `recipients.flags` column was added by hand instead. See README, Gotchas.

The session before (2026-09-24) made the form phone-friendly, published the QR code, reorganised the repo under `design/`, and emptied the production database.

On the closet's iPad, volunteers reach the queue by opening `/queue` once, signing in, and using Share → Add to Home Screen. The session cookie lasts 30 days.

**The production database was emptied on 2026-09-24** — the queue was confirmed empty afterwards. The 369 seeded sample requests were truncated and the identity counters restarted, so the first real request is `#2026-0001`.

**Do not run `pnpm db:seed` locally** — `.env.local` points at the same Neon database as production, so seeding from a laptop fills the live queue and reports with invented people. Seed only a separate Neon branch.

`SESSION_SECRET` is set on Production and Development but **not Preview** — the CLI would not do it. Harmless unless PR previews get used.

Still open, in rough priority order:

1. **Change the volunteer passcode before real intake.** It is still the street number. Set a new `VOLUNTEER_PASSCODE` in Vercel and redeploy; no code change.
2. **Email confirmations — waiting on the user.** The form and thank-you screen promise an email that nothing sends. The blocker is a sending domain: mail cannot come from `vercel.app`, so it needs SPF/DKIM records on **clarksburgcloset.org**, and the user is finding out who manages that DNS. Proposed plan, not yet approved: **Resend** from the Vercel Marketplace (`resend/resend-email`), sending from something like `requests@clarksburgcloset.org` with replies to `info@`, called from `submitRequest` in `app/request/actions.ts` after the insert — a failed send must never fail the submission. Open decisions: the addresses; whether the email repeats sizes (the prayer request stays out); and two optional extras on the same setup, a new-request alert to volunteers and a filled/declined email to the requester. If real intake starts first, soften the form's wording to "we'll contact you by email or phone".
3. **Volunteer identity** — nothing records *who* did anything: who filled a request, or who wrote a note. The shared passcode was chosen knowing this. One decision covers both; `lib/auth.ts` is where it lands. Cheap to capture at the click, impossible to reconstruct later.
4. **Have a Spanish speaker read the Spanish form.** The wording (`app/request/i18n.tsx`) was written in-session and has not been reviewed by a native speaker.
5. **Watch the first real requests**: none of the 2026-10-22 work has met live data. Check that a Spanish-form request arrives with its note, that the marks save and print, that ticking Crisis adds the hearts, and that the drawn heart (about 2.5 mm) is big enough on the closet's printer. If not, enlarge it in `heart()` in `app/queue/pickSheet.ts`.
6. **Upgrade drizzle-kit** until a `push` plan against the live database comes back clean. Until then, apply schema changes by hand (README, Gotchas).
7. The public website still advertises a 4-week turnaround; the new form does not.

## About Clarksburg Closet

Clarksburg Closet (https://www.cedarbrook.org/clarksburgcloset) is a free clothing distribution ministry run by Cedarbrook Community Church.

- **Mission**: provide free clothing/shoes to neighbors facing financial hardship, motivated by Matthew 25:36-40.
- **Who it serves**: local families and children, often referred via crisis agencies (~90% of agency referrals are for children).
- **Location**: 23810 Stringtown Road, Clarksburg, MD 20871.
- **Drop-off hours**: Tue-Fri 10am-1pm, first Saturday of the month 10am-12pm; closed on MCPS delay/closure days.
- **Priority items**: children's clothing (3T-12), boys' 8-18, men's S-L, children's/boys'/men's shoes (sizes 6-9), unopened diapers/wipes/underwear/socks.
- **Request rules**: requests are currently submitted as a PDF emailed to info@clarksburgcloset.org, and are limited to once per season per recipient/household. **There is no turnaround deadline** — the "processed within 4 weeks" language was dropped from the new form, and the system does not track requests as overdue. (The 4-week promise still appears on the public website; that is outside this repo.)
- **Volunteers**: coordinated separately via SignUpGenius (not currently part of this system). Volunteers work the queue **on an iPad**, so every interface must be touch-sized (44px targets, 16px form text to avoid iOS focus zoom).

### Branding

`public/logo.png` (360×360, white background, no transparency) — navy `#00467F` hanger, green `#5C8727` "CLARKSBURG". Navy is the accent throughout the mockups. The mockups embed the logo as a base64 data URI rather than linking it, because published artifacts cannot load local files. There is one copy of the logo; the app serves it at `/logo.png`.

`public/request-qr.png` is a printable QR code for the request form — logo, heading, code, and the address in text — served at `/request-qr.png` so volunteers and agencies can download it. It is drawn by `scripts/make-qr.py`; **rerun that if the form's address changes** (e.g. a clarksburgcloset.org domain), since every printed copy then points at the old one.

## Existing reference: Clothing Request Form

`design/reference/Clothing_Request_Form_2025.pdf` is the current paper intake form. Read it with `pdftotext -layout design/reference/Clothing_Request_Form_2025.pdf -`.

Its weaknesses are what the new system exists to fix: shirt/pant/shoe sizes are blank lines, and a single Adult/Youth checkbox covers all three at once. A case worker writes "10" and nobody downstream knows whether that is a youth 10, a women's 10, or a shoe size in the wrong row.

Form fields:
- **Request header**: date of request, total # recipients, "Request Made by" (requester name), Organization/Agency, contact phone number.
- **Per recipient** (up to 10 per submission, across 2 pages): name, age, gender (Male/Female), size category (Adult/Youth), shirt size, pant size, shoe size, "Items Needed Most / Additional Info" free text.
- **Prayer request**: free-text field at the request level.

## Size vocabulary (settled)

**The governing rule: offer whatever appears on a US garment tag, not whatever the closet has in stock.** A requester reading a label should always find that exact size on the form. Sorting into bins and matching against the racks is the closet's job at the other end. So the lists are deliberately complete, including sizes that rarely arrive. Where a tag convention is likely to confuse someone, the fix is a plain-English note at the point of choosing, never a shorter list.

Each list becomes three things at once: the options in the dropdown, the values the database accepts, and the key for reading sizes off past paper requests. Changing one later means re-reading old requests.

### Youth — girls
- By month: `0–3M` `3–6M` `6–9M` `9–12M` `12–18M` `18–24M`
- Toddler: `2T` `3T` `4T` (**not** 5T)
- Numeric: `4` `5` `6` `7` `8` `10` `12` `14` `16` — **no 6X**, and girls' stops at 16

### Youth — boys
- By month and toddler: same as girls
- Numeric: `4` `5` `6` `7` `8` `10` `12` `14` `16` `18` — boys' runs to 18

### Adult — tops
- Women's: `XS` `S` `M` `L` `XL` `2XL` `3XL`
- Men's: `S` `M` `L` `XL` `2XL` `3XL` (**no XS**)

### Adult — pants
- Women's: even `0`–`20`
- **Juniors**: odd `1`–`15`, a separate cut rather than the sizes between the even ones (a juniors 7 is not between a women's 6 and 8). Labelled **"Juniors (teen girls, odd sizes)"** on the form so someone reading an odd number off a tag lands in the right list.
- Men's: **waist × inseam**, not letters. Waist `28`–`44` including odd waists; inseam `28`–`34`. This is the one size that needs two values.

### Shoes
Standard US, **whole and half sizes on every scale**: kids' `1C`–`13C`, youth `1Y`–`7Y`, women's `5`–`12`, men's `6`–`15`.

Shoe size is **multi-select** — a requester ticks every size that would fit (e.g. `5` and `5½`), rather than picking one.

### Diapers
`Newborn` `Size 1`–`Size 8`, plus `Pull-Ups 2T–3T` `3T–4T` `4T–5T`. **No adult sizes.** Opt-in via a checkbox so adult recipients are not asked a pointless question.

### Open questions
- Do requesters read the tag, or guess from the child's age? (Answer: **both** — some requesters are case workers, some are the recipients themselves.)
- What do requesters get wrong most often? Known so far: **kids wearing adult sizes**, and **shoe size left unspecified or given as a clothing size** (e.g. "24 months" in the shoe field).

## Request form behaviour (settled)

- **No guessing.** Every size must be chosen explicitly or marked **"Not needed"**. There is no "unsure" option — the closet cannot guess sizes on a requester's behalf. Submitting with anything blank lists exactly what is missing, per recipient by name.
- **Sizing help** on every size field: a chart by age, height and weight, with a find-a-size box that highlights matching rows, and a "Use this" button on each row. The charts are **standard US sizing conventions** — confirmed as the right basis, since the closet holds no height/weight data on the families it serves. No need to tailor them.
- **Gender narrows the lists** (Female → Girls'/Women's/Juniors), but **age never hides options** — a child small or large for their age still needs every size reachable.
- **Adult sizes for a child are confirmed, not blocked.** Choosing an adult size for someone under 13 shows a note asking the requester to confirm. Age is recorded alongside, so volunteers can pick age-appropriate styles — a teenager in a women's L needs different styles than a 45-year-old in a women's L.
- **No "room to grow" option.** Requesters place a separate request for a larger size.
- **Requester contact**: name, phone **and email**, both required. Email is the more stable lookup key for case workers; cell numbers move with the person.
- The single Adult/Youth checkbox from the paper form is **gone** — each size field carries its own groups.

## Data model (design decisions)

### Entities

- **Agency** — organization name (optional; null for individuals self-referring). Most requests come through agencies, each with multiple agents/case workers. Use a type-ahead matched against existing agencies (with "add new" fallback) to avoid name fragmentation ("Mercy Health" vs "Mercy Health Svc").
- **Requester** (agent) — name, phone, email, optionally linked to an Agency. Multiple requesters can belong to the same agency.
- **Request** — one submission: date, requester, recipients, status, crisis flag, prayer request, and **volunteer notes** (all request-level, not per-recipient).
- **Recipient** — per-request entry: name, gender, age (number + unit: years or months), shirt size, pant size, shoe sizes (**multiple**), diaper size (nullable), items needed/additional info, and the volunteers' **marks** (coat, toiletries, extra love — below). No persistent cross-request recipient/household record for now.

### Schema notes for whenever the DB gets built

- Sizes are **not** one shared vocabulary. Shirt takes a single value; pants take either a single value or a **waist + inseam pair** (men's); shoes take a **set**. Likely columns: `shirtSize`, `pantSize`, `pantWaist`, `pantInseam`, `shoeSizes[]`, `diaperSize` — most of them nullable, with which one applies driven by gender and age group.
- "Not needed" is a real recorded value, distinct from null. A blank means nobody answered; "not needed" means someone decided.
- Enumerations as `as const` string arrays typed onto plain `text()` columns rather than PG enums, so the lists can be revised without a migration dance.

### Lookup ("pull up records")

Search when staff start a new request, by **requester phone**, **email**, **agency name** (type-ahead), or request number. Agency search finds all past requests across every agent under that agency.

### "Last order" display

For each match, show date + recipient names, each row expandable to the full prior request (sizes, items given, status, prayer request).

### Eligibility (once-per-season)

Not enforced by the system. The "last order" display gives volunteers what they need to judge it themselves. When they do decline on those grounds, "Already received clothing this season" is one of the decline reasons — the judgment is recorded, not automated.

### Volunteer notes

Each request carries a free-text **notes** field that volunteers write and edit — the closet's own record, distinct from the two other free-text fields it must never be confused with:

| Field | Written by | Level |
| --- | --- | --- |
| Items needed most | the requester | recipient |
| Prayer request | the requester | request |
| **Volunteer notes** | **the closet** | **request** |

Notes can be added at any point, including after a request is filled or declined, and they **print on the pick sheet** above the prayer request — a note like "Isaiah is between a 10C and 10½C, take both" is an instruction to whoever is holding the sheet. Two lines print; the rest stays on screen.

Notes are searchable from the queue. The field stores when it was last updated but **not who wrote it** — see the open question about recording which volunteer did the work; the same answer covers both.

### Status / fulfilment

Volunteer-set, from the queue: **Not started → Printed → Filled**, plus **Declined** (with a required reason) and **Crisis** (a priority flag, not a status).

- **Crisis** is set by volunteers, never by the requester, and never visible on the request form. It lives on the request, not the requester — an agency that sends one urgent case is not permanently urgent. It moves the request to the top of the queue and prints on the sheet's header (not the slips).
- **Recipient marks** (added 2026-10-22) — three checkboxes per recipient, set by volunteers in the queue's expanded view: **Coat**, **Include toiletries**, **Extra love**. Stored as `recipients.flags text[]` (`RECIPIENT_FLAGS` in `db/schema.ts`: `coat`, `toiletries`, `extra-love`). They show as chips under the recipient's name in the queue (🧥 🪥 ❤️) and print on **that recipient's slip**, beside the age, as **C**, **T** and a drawn heart (Helvetica has no heart glyph). **Slips are attached to the bags and go home with the families**, so they carry symbols only — no words, and nothing that reads as a warning; the user removed a ⚠️ for exactly that reason. A mark changed after printing does not reach the sheet already printed, so the toast says to print again. **Marking a request crisis ticks Extra love for every recipient on it** (user, 2026-10-22) — a starting point volunteers can untick per person; clearing crisis leaves the marks alone.
- **Declining requires a reason** — the requester will be told, and "why was I turned down?" needs an answer months later. Reasons: already received this season, duplicate, outside the area served, could not reach the requester, items not available, other.
- **Partial fulfilment does not exist — confirmed.** Orders are never filled partially, so status lives on the **request**, not on each recipient. A request is filled or it is not. Do not add a per-recipient status column.
- **Nothing records which volunteer did the work.** Deliberate, but cheap to add at the click and impossible to reconstruct later.

### Language / localization

Spanish-speaking households are a significant part of the population served, so **the request form is bilingual** (added 2026-10-22). Only `/request` is translated; the queue and reports stay English.

- **Which language**: `?lang=es` / `?lang=en` wins; without it, a browser whose first language is Spanish gets Spanish. An **English / Español** button top right switches in place, keeps everything typed, and rewrites the URL so the Spanish link can be shared (`/request?lang=es`).
- **Every word lives in `app/request/i18n.tsx`**, one dictionary per language; the Spanish one is typed against the English, so a missing string is a type error.
- **Only display is translated, never a stored value.** Group labels (`"Girls'"`), sizes (`Newborn`, `28" waist`) and chart cells are translated at render time by `groupLabel` / `sizeLabel` / `chartText`; the option values, the server's checks and what the queue prints are unchanged, so a Spanish request is identical in the database. The sizing-help estimator still parses the English chart text.
- Standard US size codes (XS/S/M/L, 2T, 4C, 1Y) stay untranslated, since those are the codes printed on garment labels.
- **A request made on the Spanish form starts with the volunteer note "Form filled out in Spanish."** (`submitRequest`, user's choice 2026-10-22), so the queue shows it and its search finds it. It is a note rather than a column — no schema change, and volunteers can edit or clear it. `notesUpdatedAt` stays null, since no volunteer wrote it. Free text is stored as typed, never translated.
- Spanish uses **usted** throughout. A recipient is **Persona**; gender is **Sexo** (Femenino/Masculino).
- The QR code (`public/request-qr.png`) points at the language-neutral `/request`. **One code, deliberately** — the user ruled out a separate Spanish QR (2026-10-22) as confusing; the toggle and browser detection cover it.

## Mockups

Static, self-contained HTML in `design/mockups/` (embedded CSS + vanilla JS, no build tools). **These are now the design record, not the product** — the app was built from them and the app is what ships. Keep them for the reasoning they carry; when a behaviour changes, change the app and note it here rather than trying to keep four HTML files in step.

| File | What it is |
| --- | --- |
| `request-form-mockup.html` | The requester-facing form. Sizing-help dialogs, "Not needed", multi-select shoes, opt-in diapers, adult-size confirmation, submit validation. |
| `dashboard-mockup.html` | The volunteer queue. Filter/search, expand to review sizes, crisis flag, volunteer notes, generate the pick-sheet PDF, mark filled, decline with reason. |
| `report-mockup.html` | Monthly and year-to-date reporting on a **1 July - 30 June fiscal year**. Headline tiles, people clothed by month, requests received vs filled, referring agencies, fiscal-year and month pickers, chart/table toggle. |
| `pick-sheet-mockup.html` | Visual reference for the printed slip layout. **Superseded as the print path** by the dashboard's PDF generator; kept as the design reference. |

Serve them over http rather than opening from disk — see below.

### The pick sheet is generated as a PDF, not printed from HTML

The dashboard's **Print pick sheet** button builds the sheet with **jsPDF** (pinned, from cdnjs) at fixed coordinates and opens it in a tab; the volunteer prints the PDF.

This is deliberate. Printing the HTML directly was tried and abandoned: **Chrome does not honour `break-inside: avoid` on grid or flex items**, so slips split across page boundaries no matter what break rules were set, and nested flex containers would not let two slip rows share a page with the header. Drawing the PDF makes the page a slip lands on arithmetic.

Layout, verified across recipient counts (1–4 → one page, 5–10 → two):
- Letter, 0.5in margins; slips 264 × 230pt, two per row
- **Page 1**: request header, then 2 rows × 2 columns = **4 slips**
- **Every page after**: 3 rows × 2 columns = **6 slips**
- Since the form caps at 10 recipients, a sheet is never more than two pages

Each slip is self-contained and traceable — requester name, agency, request number, "3 of 5" — so a slip separated from the others on the sorting table still says who it belongs to. If the request is flagged crisis, a black **CRISIS** badge prints in the **header only**, and the filename gets a `-CRISIS` suffix. **Never on the slips** (user, 2026-10-22): slips are attached to the bags and go home with the families, while the header stays at the closet.

Print output is **black and white by design** to save ink: no solid fills anywhere. The only colour is the logo.

### How the PDF is delivered, per platform

1. **iPad** (how volunteers actually work) — the PDF goes to the **iOS share sheet**, where AirPrint sits. Safari will not reliably open a `blob:` URL in a new tab. iPadOS reports itself as a Mac, so detection uses touch points, not the user agent.
2. **Desktop over http** — opens in a new tab.
3. **Anything else** — falls back to saving the file, with the toast explaining why.

### Reporting periods

**The fiscal year runs 1 July to 30 June**, so "year to date" means since 1 July, never since 1 January. A fiscal year is keyed in the data by the calendar year it *starts* in — `2026` means Jul 2026 to Jun 2027, displayed as **FY 2026-27** — and months run Jul, Aug, Sep ... Jun in that order. Because a fiscal year spans two calendar years, month labels carry their calendar year (`Feb 2027`) anywhere the year could be ambiguous.

The report covers two periods at once, which is what the volunteers asked for:
- **A single month** — its own figures, compared to the month before it and to the same month a fiscal year earlier, with year-to-date kept in view alongside.
- **Year to date / whole fiscal year** — totals across the period.

Selecting a month does not reduce the charts to one bar; it highlights that month and leaves the rest of the year for context. Clicking a month in a chart selects it. Comparisons are worded as counts ("23 more than Jul"), not percentages.

### Charts

`report-mockup.html` draws its charts as inline SVG — no charting library. Two rules worth keeping if more charts are added:

- **The series colours are validated, not chosen by eye.** `--s1: #2F74AD` (blue) and `--s2: #7BA33C` (green) are brand-adjacent steps that pass the lightness band, chroma floor, colour-blind separation, and surface-contrast checks in **both** light and dark, which is why one pair serves both themes. The brand navy `#00467F` itself **fails** as a chart fill — too dark for the lightness band. Re-validate before substituting anything.
- **Keep non-ASCII characters out of `<script>` blocks.** Use `\u00b7`, `\u00d7`, `\u00bd` rather than the literal `·`, `×`, `½`. A published artifact gets a charset from its wrapper, but a plain local server does not, and the characters arrive as mojibake (`Â·`, `10Â½`). This bit twice.
- Identity is never colour alone: every chart with two series carries a legend, stacked totals are directly labelled, and the **chart/table toggle** gives the same figures as text.

### Running the mockups

Serve over http; do **not** open from disk:

```bash
python3 -m http.server 8787 -d design/mockups
# then http://localhost:8787/dashboard-mockup.html
```

A `blob:` URL inherits the origin of the page that created it, and a `file://` page has the null origin — Chrome refuses to navigate to such a blob and reports `ERR_BLOCKED_BY_CLIENT`. The dashboard detects `file://` and saves the PDF instead of showing a blocked tab, but http is the path that matches how the real app will run.

### Verifying layout — measure, do not estimate

Do not eyeball page breaks or element heights. Render to PDF headlessly and check which recipients land on which page:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=/tmp/out.pdf "http://localhost:8787/pick-sheet-mockup.html"
pdftotext -f 1 -l 1 -layout /tmp/out.pdf -   # page 1 contents
```

Element heights can be probed the same way — inject a script that writes `offsetHeight` values into a `<div>` before rendering to PDF, then read them out with `pdftotext`. The same trick screenshots a page for visual review:

```bash
"$CHROME" --headless --disable-gpu --virtual-time-budget=5000 \
  --window-size=1000,1200 --screenshot=/tmp/shot.png \
  "http://localhost:8787/report-mockup.html"
```

**Headless Chrome will not lay out narrower than 500px**, whatever `--window-size` says — a phone-width screenshot comes back cropped, not reflowed. For phone widths, drive Chrome with `puppeteer-core` and `page.emulate({ viewport: { width: 375, isMobile: true, hasTouch: true, ... } })`, then measure `scrollWidth` and button heights rather than trusting the picture.

This is worth doing every time. Estimating heights from the CSS wasted several rounds on the pick sheet; one measurement settled it. Screenshotting the report caught mojibake, a panel that would not hide, and ugly axis ticks that reading the code had not revealed.
