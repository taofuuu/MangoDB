import type {
    ApiErrorCode,
    ApiErrorDetail,
    ApiErrorResponse,
} from '@mangodb/shared';

// Same-origin, via the /api/* rewrite in next.config.ts. The absolute API URL
// lives there and only the Next server sees it.
const BASE_URL = '/api';

// Every non-2xx from the API arrives in the same envelope, so one error class
// covers all of them. `code` is the stable half to switch on; `details` carries
// one entry per rejected field, which is what a form shows beside its inputs.
export class ApiRequestError extends Error {
    readonly status: number;
    readonly code: ApiErrorCode;
    readonly details: ApiErrorDetail[];

    constructor(
        status: number,
        code: ApiErrorCode,
        message: string,
        details: ApiErrorDetail[] = [],
    ) {
        super(message);
        this.name = 'ApiRequestError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

// Reads the error envelope. A failure that never reached the API — a proxy, a
// crash — has no envelope, so fall back to something the user can act on.
async function toRequestError(response: Response): Promise<ApiRequestError> {
    try {
        const body = (await response.json()) as ApiErrorResponse;
        return new ApiRequestError(
            response.status,
            body.error.code,
            body.error.message,
            body.error.details ?? [],
        );
    } catch {
        return new ApiRequestError(
            response.status,
            'INTERNAL',
            `Request failed with status ${response.status}`,
        );
    }
}

// The sentinel a page stores instead of a message when the failure was "you are
// not signed in" — that case renders a sign-in prompt rather than an error. It
// was the literal string 'no-token' in seventeen places across six pages,
// which
// is a typo away from a page that never shows the prompt.
export const NOT_SIGNED_IN = 'not-signed-in';

// Six pages wrote this comparison inline as part of a longer .catch ladder.
export function isNotSignedIn(err: unknown): boolean {
    return err instanceof ApiRequestError && err.status === 401;
}

// What to show the user when a call fails.
//
// This replaces six near-identical functions — toModalMessage, describeError,
// describe, describeLoginError, messageFor, errorMessage — that differed only
// in which statuses they gave a friendlier sentence to. Pass those as
// overrides; everything else is the same everywhere.
//
//   describeError(err)
//   describeError(err, { 401: 'Please log in to view Company accounts.' })
//
// A field-level detail beats the envelope's message when there is one: "Invalid
// email address" is what the user can act on, "Request body is invalid" is not.
export type ErrorMessages = Partial<Record<number, string>> & {
    // Shown when the request never reached the API at all — no envelope to read.
    offline?: string;
};

const OFFLINE = 'Could not reach the server. Please try again.';

export function describeError(
    err: unknown,
    overrides: ErrorMessages = {},
): string {
    if (!(err instanceof ApiRequestError)) {
        return overrides.offline ?? OFFLINE;
    }

    const override = overrides[err.status];
    if (override) return override;

    const detail =
        err.details.find((entry) => entry.field !== '(body)') ?? err.details[0];

    return detail?.message ?? err.message;
}

export async function apiFetch<T>(
    path: string,
    init: RequestInit = {},
): Promise<T> {
    const isFormData = init.body instanceof FormData;

    const response = await fetch(`${BASE_URL}${path}`, {
        ...init,
        // The session is an httpOnly cookie, so there is no token to attach —
        // the browser sends it. Nothing here can forget to.
        credentials: 'include',
        headers: {
            ...(!isFormData && {
                'content-type': 'application/json',
            }),
            ...init.headers,
        },
    });

    if (!response.ok) {
        throw await toRequestError(response);
    }

    // 204 is the success shape for logout and deletes — no body to parse.
    if (response.status === 204) {
        return undefined as T;
    }

    return (await response.json()) as T;
}
