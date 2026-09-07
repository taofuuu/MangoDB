import type { ApiErrorDetail } from './ApiError';

type PrismaError = {
    code?: unknown;
    meta?: {
        driverAdapterError?: { cause?: { constraint?: { index?: unknown } } };
    };
};

// Which of `known` a unique index rejected, or null if this isn't that kind of
// error. Duck-typed because the prisma-client generator doesn't export the
// error class, and the column arrives as the index name (company_username_key)
// rather than in meta.target, which is what the docs describe.
export function uniqueViolationFields(
    err: unknown,
    known: readonly string[],
): string[] | null {
    if (typeof err !== 'object' || err === null) return null;

    const { code, meta } = err as PrismaError;
    if (code !== 'P2002') return null;

    const index = meta?.driverAdapterError?.cause?.constraint?.index;
    if (typeof index !== 'string') return [];

    const name = index.replace(/_key$/, '');
    return known.filter((field) => name.endsWith(field));
}

// One entry per rejected column, so a form can show each beside its input.
export function uniqueViolationDetails(fields: string[]): ApiErrorDetail[] {
    if (fields.length === 0) {
        return [{ field: '(body)', message: 'Already registered' }];
    }
    return fields.map((field) => ({
        field,
        message: `This ${field} is already registered`,
    }));
}

// P2025 — the row the write targeted is gone. A company deleted mid-session
// still holds a valid token, so that is a 404 rather than an unhandled 500.
export function isRecordNotFound(err: unknown): boolean {
    if (typeof err !== 'object' || err === null) return false;
    return (err as PrismaError).code === 'P2025';
}
