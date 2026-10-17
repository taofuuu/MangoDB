import { z } from 'zod';

// Prisma Int is a 32-bit int4 column. Without this ceiling, 2147483648 passes
// validation and reaches the database, which answers with a 500.
export const INT4_MAX = 2147483647;

// A row id from the path or the query string. Both arrive as strings, so it is
// coerced first. JSON bodies send real numbers and use INT4_MAX directly.
export const int4Id = z.coerce.number().int().positive().max(INT4_MAX);

// Create schemas validate submitted budget pairs directly. PATCH controllers
// call this after merging submitted fields over the stored pair.
export function minBudgetDoesNotExceedMax(data: {
    minBudget?: number | null | undefined;
    maxBudget?: number | null | undefined;
}): boolean {
    return (
        data.minBudget == null ||
        data.maxBudget == null ||
        data.minBudget <= data.maxBudget
    );
}

// z.url() accepts any scheme, so javascript: and data: pass it. Those become
// stored XSS the moment the frontend renders the value as an href or img src.
export const httpUrl = z
    .url()
    .max(255)
    .refine((value) => /^https?:$/.test(new URL(value).protocol), {
        message: 'Must be an http or https URL',
    });

// Thai numbers are 9 digits for a landline (021234567) and 10 for a mobile
// (0812345678), both starting with 0. People type them with spaces, hyphens or
// the +66 country code, so strip those first and judge the result — the column
// then holds one shape instead of five, and search can match on it.
export const thaiPhone = z
    .string()
    .transform((value) => {
        const compact = value.trim().replace(/[\s()-]/g, '');
        return compact.startsWith('+66') ? `0${compact.slice(3)}` : compact;
    })
    .refine((value) => /^0\d{8,9}$/.test(value), {
        message: 'Use a Thai phone number, e.g. 0812345678',
    });

// A blank value (empty or only spaces) was not really sent: ?page= is page
// 1, ?status= is no filter. Without this, z.coerce reads '' as 0.
export function blankToUndefined(value: unknown): unknown {
    return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

// A cleared input in a form is null: the field is emptied, not left alone.
// Multipart sends every field as a string, so a cleared one arrives as ''.
export function blankToNull(value: unknown): unknown {
    return typeof value === 'string' && value.trim() === '' ? null : value;
}

// The paging every list takes: page 1 and 12 rows unless asked, at most 50,
// so one request cannot pull a whole table into memory (conventions §3).
export const pageQueryFields = {
    page: z.preprocess(
        blankToUndefined,
        z.coerce.number().int().positive().default(1),
    ),
    pageSize: z.preprocess(
        blankToUndefined,
        z.coerce.number().int().min(1).max(50).default(12),
    ),
} as const;

// An id in the query string, like ?companyId=. Digits only: Number() alone
// would read "0x10" as 16 and "1e3" as 1000, so those are a 400, as are
// "abc" and 0.
export function queryId(name: string) {
    return z
        .string()
        .regex(/^\d+$/, `${name} must be a whole number`)
        .transform(Number)
        .pipe(z.number().int().positive().max(INT4_MAX));
}

// The same id as an optional filter: blank means the filter is not used.
// .optional() sits inside the preprocess, so a blank value counts as absent.
export function optionalQueryId(name: string) {
    return z.preprocess(blankToUndefined, queryId(name).optional());
}
