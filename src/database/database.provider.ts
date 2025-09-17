import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProviders = [
  {
    provide: DATABASE_CONNECTION,
    useFactory: async () => {
      const pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'auth_db',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password',
        max: parseInt(process.env.POSTGRES_POOL_SIZE || '10'),
        idleTimeoutMillis: parseInt(
          process.env.POSTGRES_IDLE_TIMEOUT || '30000',
        ),
        connectionTimeoutMillis: parseInt(
          process.env.POSTGRES_CONNECTION_TIMEOUT || '2000',
        ),
        ssl:
          process.env.POSTGRES_SSL === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
      });

      return drizzle(pool, { schema });
    },
  },
];

export type DatabaseConnection = ReturnType<typeof drizzle>;
