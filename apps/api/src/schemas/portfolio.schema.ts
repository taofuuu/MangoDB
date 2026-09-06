import { z } from 'zod';

// Path params arrive as strings, so this coerces before the integer check —
// the same reason parseQuery's schemas need z.coerce.
export const portfolioIdParamSchema = z.object({
    portfolioId: z.coerce.number().int().positive(),
});

export type PortfolioIdParam = z.infer<typeof portfolioIdParamSchema>;

// Only the link is editable. portfolio_id names the row and listing_id says
// which listing owns it — moving a sample to a different listing is a
// different operation than fixing its URL, and would need a fresh ownership
// check against the destination.
export const updatePortfolioSchema = z.object({
    // 255 matches @db.VarChar(255) in prisma/schema.prisma. Without the cap a
    // longer link comes back as a database error instead of a field message.
    portfolio_link: z.url().max(255),
});

export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
