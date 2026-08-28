import type { ZodError, ZodType } from 'zod';
import { ApiError, type ApiErrorDetail } from '../lib/ApiError';

// Functions, not middleware: middleware would return the parsed value through
// req.body, which Express types as `any`, losing the schema's type.
function toDetails(error: ZodError): ApiErrorDetail[] {
    return error.issues.map((issue) => ({
        field: issue.path.map(String).join('.') || '(body)',
        message: issue.message,
    }));
}

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
    const result = schema.safeParse(body);
    if (!result.success) {
        throw ApiError.validationFailed(toDetails(result.error));
    }
    return result.data;
}

// Query values arrive as strings, so schemas here need z.coerce for numbers.
export function parseQuery<T>(schema: ZodType<T>, query: unknown): T {
    const result = schema.safeParse(query);
    if (!result.success) {
        throw ApiError.badRequest(
            'Query parameters are invalid',
            toDetails(result.error),
        );
    }
    return result.data;
}
