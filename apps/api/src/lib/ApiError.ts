import type { ApiErrorCode, ApiErrorDetail } from '@mangodb/shared';

export type { ApiErrorCode, ApiErrorDetail };

// Throw one anywhere; errorHandler formats it. `code` is the frontend's
// contract — renaming one is a breaking change.
export class ApiError extends Error {
    readonly status: number;
    readonly code: ApiErrorCode;
    readonly details?: ApiErrorDetail[];

    constructor(
        status: number,
        code: ApiErrorCode,
        message: string,
        details?: ApiErrorDetail[],
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        // exactOptionalPropertyTypes: an explicit undefined is not absent.
        if (details) {
            this.details = details;
        }
    }

    static badRequest(message: string, details?: ApiErrorDetail[]): ApiError {
        return new ApiError(400, 'BAD_REQUEST', message, details);
    }

    static validationFailed(details: ApiErrorDetail[]): ApiError {
        return new ApiError(
            400,
            'VALIDATION_FAILED',
            'Request body is invalid',
            details,
        );
    }

    static unauthorized(message = 'Authentication required'): ApiError {
        return new ApiError(401, 'UNAUTHORIZED', message);
    }

    static forbidden(message = 'Insufficient permissions'): ApiError {
        return new ApiError(403, 'FORBIDDEN', message);
    }

    static notFound(message = 'Resource not found'): ApiError {
        return new ApiError(404, 'NOT_FOUND', message);
    }

    static conflict(message: string, details?: ApiErrorDetail[]): ApiError {
        return new ApiError(409, 'CONFLICT', message, details);
    }
}
