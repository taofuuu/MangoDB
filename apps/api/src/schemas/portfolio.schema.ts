import { z } from 'zod';
import { httpUrl } from './common.schema';

// Path params arrive as strings, so this coerces before the integer check —
// the same reason parseQuery's schemas need z.coerce.
export const portfolioIdParamSchema = z.object({
    portfolioId: z.coerce.number().int().positive().max(2147483647),
});

export type PortfolioIdParam = z.infer<typeof portfolioIdParamSchema>;

// One definition per editable column, sizes matching prisma/schema.prisma —
// same reasoning as companyFields in company.schema.ts. portfolioId and
// listingId are not here: portfolioId names the row, and moving a sample to
// a different listing is a different operation than editing it in place,
// needing a fresh ownership check against the destination.
export const portfolioFields = {
    portfolioName: z.string().trim().min(1).max(255),
    portfolioDescription: z.string().trim().max(2000),
    // Date-only column (@db.Date): a YYYY-MM-DD string, then a Date at UTC
    // midnight. z.coerce.date() would also take a full timestamp, and a client
    // in UTC+7 sending one would store the day before.
    developmentDate: z.iso
        .date()
        .transform((day) => new Date(`${day}T00:00:00Z`)),
    portfolioImage: httpUrl,
    portfolioLink: httpUrl,
} as const;

// PATCH is a partial update: every field is optional so the client sends only
// what changed. portfolioDescription is nullable on top of that — it's the
// one column allowed to actually be empty (schema.prisma: String?) — the
// other four are required whenever they're present in the body at all.

// Schema for CREATE (POST /portfolios)
// with service_id (or listingId) combine with portfolioFields
export const createPortfolioSchema = z.object({
    listingId: z.coerce.number().int().positive().max(2147483647),
    portfolioName: portfolioFields.portfolioName,
    portfolioDescription: portfolioFields.portfolioDescription
        .optional()
        .nullable(),
    developmentDate: portfolioFields.developmentDate,
    portfolioLink: portfolioFields.portfolioLink,
});

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;

export const updatePortfolioSchema = z
    .object({
        portfolioName: portfolioFields.portfolioName,
        portfolioDescription: portfolioFields.portfolioDescription.nullable(),
        developmentDate: portfolioFields.developmentDate,
        portfolioLink: portfolioFields.portfolioLink,
    })
    .partial();

export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;

// The columns a unique index can reject. prismaErrors uses this to decide which
// constraint names are worth reporting back to the caller.
export const PORTFOLIO_UNIQUE_FIELDS = ['portfolioLink'] as const;

export const portfolioQuerySchema = z.object({
    listingId: z.coerce.number().int().positive().max(2147483647).optional(),
    // No owner column on the row: the company is three hops away, so this
    // filters through service -> listing, the chain assertPortfolioOwned walks.
    companyId: z.coerce.number().int().positive().max(2147483647).optional(),
});

export type PortfolioQuery = z.infer<typeof portfolioQuerySchema>;
