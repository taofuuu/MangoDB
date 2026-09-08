import { z } from 'zod';
import { httpUrl } from './common.schema';

// Path params arrive as strings, so this coerces before the integer check —
// the same reason parseQuery's schemas need z.coerce.
export const portfolioIdParamSchema = z.object({
    portfolioId: z.coerce.number().int().positive().max(2147483647),
});

export type PortfolioIdParam = z.infer<typeof portfolioIdParamSchema>;

// One definition per editable column, sizes matching prisma/schema.prisma —
// same reasoning as companyFields in company.schema.ts. portfolio_id and
// listing_id are not here: portfolio_id names the row, and moving a sample to
// a different listing is a different operation than editing it in place,
// needing a fresh ownership check against the destination.
export const portfolioFields = {
    portfolio_name: z.string().trim().min(1).max(255),
    portfolio_description: z.string().trim().max(2000),
    // Date-only column (@db.Date): a YYYY-MM-DD string, then a Date at UTC
    // midnight. z.coerce.date() would also take a full timestamp, and a client
    // in UTC+7 sending one would store the day before.
    development_date: z.iso
        .date()
        .transform((day) => new Date(`${day}T00:00:00Z`)),
    portfolio_image: httpUrl,
    portfolio_link: httpUrl,
} as const;

// PATCH is a partial update: every field is optional so the client sends only
// what changed. portfolio_description is nullable on top of that — it's the
// one column allowed to actually be empty (schema.prisma: String?) — the
// other four are required whenever they're present in the body at all.

// Schema for CREATE (POST /portfolios)
// with service_id (or listing_id) combine with portfolioFields
export const createPortfolioSchema = z.object({
    listing_id: z.coerce.number().int().positive(),
    portfolio_name: portfolioFields.portfolio_name,
    portfolio_description: portfolioFields.portfolio_description.optional().nullable(),
    development_date: portfolioFields.development_date,
    portfolio_link: portfolioFields.portfolio_link
});

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;

export const updatePortfolioSchema = z
    .object({
        portfolio_name: portfolioFields.portfolio_name,
        portfolio_description: portfolioFields.portfolio_description.nullable(),
        development_date: portfolioFields.development_date,
        portfolio_link: portfolioFields.portfolio_link
        // portfolio_image: portfolioFields.portfolio_image
    })
    .partial()
    // An empty body is a client bug, not a no-op worth a 200.
    .refine((body) => Object.keys(body).length > 0, {
        message: 'Provide at least one field to update',
    });

export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;

// The columns a unique index can reject. prismaErrors uses this to decide which
// constraint names are worth reporting back to the caller.
export const PORTFOLIO_UNIQUE_FIELDS = ['portfolio_link'] as const;
