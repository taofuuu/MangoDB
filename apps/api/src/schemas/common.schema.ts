import { z } from 'zod';

// z.url() accepts any scheme, so javascript: and data: pass it. Those become
// stored XSS the moment the frontend renders the value as an href or img src.
export const httpUrl = z
    .url()
    .max(255)
    .refine((value) => /^https?:$/.test(new URL(value).protocol), {
        message: 'Must be an http or https URL',
    });
