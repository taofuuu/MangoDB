import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DATABASE_URL } from '../env';

// Pooled connection (Supavisor) — safe for the app's normal runtime query volume.
const adapter = new PrismaPg({ connectionString: DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
