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

// Path values arrive as strings too, so schemas here need z.coerce for
// numbers. A malformed path param is not a field-level failure of the body,
// so this reports BAD_REQUEST like parseQuery rather than VALIDATION_FAILED.
export function parseParams<T>(schema: ZodType<T>, params: unknown): T {
    const result = schema.safeParse(params);
    if (!result.success) {
        throw ApiError.badRequest(
            'Path parameters are invalid',
            toDetails(result.error),
        );
    }
    return result.data;
}
