import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

// Same pattern as math-club-v2: `pnpm db:push` reads .env.local; point ENV_FILE
// at .env.production.local to push the same schema to the production branch.
config({ path: process.env.ENV_FILE ?? '.env.local' });

export default {
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.POSTGRES_URL ?? '' },
  strict: true,
  verbose: true,
} satisfies Config;
