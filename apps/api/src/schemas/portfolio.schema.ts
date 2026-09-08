import { z } from 'zod';

// Path params arrive as strings, so this coerces before the integer check —
// the same reason parseQuery's schemas need z.coerce.
export const portfolioIdParamSchema = z.object({
    portfolioId: z.coerce.number().int().positive(),
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
    portfolio_image: z.url().max(255),
    portfolio_link: z.url().max(255),
} as const;

// PATCH is a partial update: every field is optional so the client sends only
// what changed. portfolio_description is nullable on top of that — it's the
// one column allowed to actually be empty (schema.prisma: String?) — the
// other four are required whenever they're present in the body at all.
export const updatePortfolioSchema = z
    .object({
        portfolio_name: portfolioFields.portfolio_name,
        portfolio_description: portfolioFields.portfolio_description.nullable(),
        development_date: portfolioFields.development_date,
        portfolio_image: portfolioFields.portfolio_image,
        portfolio_link: portfolioFields.portfolio_link,
    })
    .partial()
    // An empty body is a client bug, not a no-op worth a 200.
    .refine((body) => Object.keys(body).length > 0, {
        message: 'Provide at least one field to update',
    });

export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
