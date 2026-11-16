/*
 * API tests: the real Express app (createApp) on a random local port, called
 * with fetch. Every route, middleware, schema and controller runs as it does
 * in production; only the database and storage behind them are fakes.
 *
 * `as` signs a real token for a company. requireAuth then asks the database
 * whether that session still stands, so the session check is answered "yes"
 * here (the check itself has its own unit tests).
 */
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, jest } from '@jest/globals';
import type { UserRole } from '@mangodb/shared';
import { createApp } from '../../src/app';
import { signAccessToken } from '../../src/auth/jwt';
import * as deletion from '../../src/lib/company-deletion';

export type Caller = { companyId: number; role: UserRole };

export const PROVIDER: Caller = { companyId: 1, role: 'provider' };
export const RECEIVER: Caller = { companyId: 2, role: 'receiver' };
export const BOTH: Caller = { companyId: 3, role: 'both' };
export const ADMIN: Caller = { companyId: 9, role: 'admin' };

export type Reply = {
    status: number;
    // A JSON body differs per route; tests read the fields they check.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: any;
    headers: Headers;
};

type Options = {
    as?: Caller;
    body?: unknown;
    form?: FormData;
    headers?: Record<string, string>;
};

let server: Server | undefined;
let base = '';

// Call once at the top of an API test file.
export function useApi(): void {
    beforeAll(async () => {
        server = createApp().listen(0);
        await new Promise<void>((resolve) =>
            server!.once('listening', resolve),
        );
        base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });
    afterAll(async () => {
        await new Promise<void>((resolve) => server!.close(() => resolve()));
    });
    beforeEach(() => {
        jest.spyOn(deletion, 'isSessionEnded').mockResolvedValue(false);
    });
}

export function tokenFor(caller: Caller): string {
    return signAccessToken({
        sub: String(caller.companyId),
        role: caller.role,
    });
}

export async function call(
    method: string,
    path: string,
    options: Options = {},
): Promise<Reply> {
    const headers: Record<string, string> = { ...options.headers };
    let body: string | FormData | undefined;
    if (options.form) {
        body = options.form;
    } else if (options.body !== undefined) {
        headers['content-type'] = 'application/json';
        body =
            typeof options.body === 'string'
                ? options.body
                : JSON.stringify(options.body);
    }
    if (options.as) {
        headers.authorization = `Bearer ${tokenFor(options.as)}`;
    }

    const res = await fetch(base + path, {
        method,
        headers,
        ...(body !== undefined && { body }),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
        parsed = text ? JSON.parse(text) : undefined;
    } catch {
        // Not JSON (the docs page): keep the text.
    }
    return { status: res.status, body: parsed, headers: res.headers };
}

// Files for multipart routes, with the bytes each type must start with.
export const PNG = Buffer.concat([
    Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'),
    Buffer.alloc(16),
]);
export const PDF = Buffer.from('%PDF-1.4 jest');

export function formWith(
    fields: Record<string, string>,
    file?: { field: string; bytes: Buffer; type: string; name?: string },
): FormData {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    if (file) {
        form.append(
            file.field,
            new Blob([new Uint8Array(file.bytes)], { type: file.type }),
            file.name ?? 'upload.bin',
        );
    }
    return form;
}
