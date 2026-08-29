import dotenv from 'dotenv';

// Keep first in any entry point: lib/prisma.ts reads process.env while being
// imported, so .env must load before it.
dotenv.config({ quiet: true });

export const PORT = Number(process.env.PORT) || 4000;
