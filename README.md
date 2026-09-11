# Clarksburg Closet

Clothing requests and record keeping for [Clarksburg Closet](https://www.cedarbrook.org/clarksburgcloset),
a free clothing ministry of Cedarbrook Community Church.

Three surfaces:

| Route | Who it is for | Gated |
| --- | --- | --- |
| `/request` | Case workers and households asking for clothing | No — public |
| `/queue` | Volunteers working the requests | Shared passcode |
| `/reports` | Volunteers and the board | Shared passcode |

## Stack

Next.js 15 (App Router) · Neon Postgres · Drizzle ORM · jsPDF for the pick sheet.
No CSS framework: the design tokens and page styles come straight from the
mockups they were settled in.

Schema lives in one file, `db/schema.ts`, and is applied with `drizzle-kit push`
— there are no migration files to keep in step.

## Setup

```bash
pnpm install
cp .env.example .env.local     # then fill in the three values
pnpm db:push                   # create the tables
pnpm db:seed                   # optional: sample requests + two closed fiscal years
pnpm dev
```

`.env.local` needs:

- `POSTGRES_URL` — a Neon connection string.
- `VOLUNTEER_PASSCODE` — what volunteers type to reach the queue.
- `SESSION_SECRET` — any long random string; signs the session cookie.
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Things that are the way they are on purpose

Read `CLAUDE.md` before changing any of these — each was settled with the
volunteers, and several were settled the hard way.

- **The size vocabulary is a contract.** `lib/sizes.ts` is simultaneously the
  form's dropdowns, the values the database accepts, and the key for reading
  sizes off past paper requests. Changing a list means re-reading old requests.
- **Every size carries the list it came from.** A stored "10" is useless on its
  own; `shirtGroup` / `pantGroup` are what let it print as "10 · Girls'".
- **"Not needed" is a recorded value, not a blank.** A blank means nobody
  answered.
- **The pick sheet is drawn as a PDF, not printed from HTML.** Chrome does not
  honour `break-inside: avoid` on grid or flex items, so slips split across
  pages. See `app/queue/pickSheet.ts`.
- **Partial fulfilment does not exist.** Status lives on the request, never on
  a recipient.
- **The fiscal year runs 1 July – 30 June.** "Year to date" means since 1 July.
- **Nothing records which volunteer did the work.** Deliberate, given the shared
  passcode — and still the open question worth settling.

## Checks

```bash
pnpm typecheck
pnpm build
```
