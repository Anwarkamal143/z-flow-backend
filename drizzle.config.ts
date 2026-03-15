import { defineConfig } from 'drizzle-kit';
import { APP_CONFIG } from './src/config/app.config';
if (!APP_CONFIG.DB_URL) {
  console.log('Cannot find database url');
}
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql', // 'postgresql' | 'mysql' | 'sqlite'
  // driver: 'pg',
  dbCredentials: {
    url: APP_CONFIG.DB_URL,
    // password: DB_PASSWORD,
  },
});
