import { z } from 'zod';

// Prisma Int is a 32-bit int4 column. Without this ceiling, 2147483648 passes
// validation and reaches the database, which answers with a 500.
export const INT4_MAX = 2147483647;

// A row id from the path or the query string. Both arrive as strings, so it is
// coerced first. JSON bodies send real numbers and use INT4_MAX directly.
export const int4Id = z.coerce.number().int().positive().max(INT4_MAX);

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
