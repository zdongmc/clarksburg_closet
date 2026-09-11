import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

// Lazy so `next build` can import routes without a connection string -- the
// error only fires on the first real query.
let instance: DB | null = null;

function init(): DB {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL is not set. See .env.example.');
  }
  return drizzle(neon(connectionString), { schema });
}

export function getDb(): DB {
  instance ??= init();
  return instance;
}

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    instance ??= init();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export { schema };
