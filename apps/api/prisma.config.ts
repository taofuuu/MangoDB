import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
    schema: 'prisma/schema.prisma',
    datasource: {
        // Direct (non-pooled) connection — used by the CLI (migrate, db pull, studio).
        // Supabase's pooled connection (PgBouncer transaction mode) doesn't support
        // what these commands need, so this must be the direct one, not DATABASE_URL.
        url: env('DIRECT_URL'),
    },
});
