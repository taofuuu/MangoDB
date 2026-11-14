/*
 * A stand-in for Supabase Storage. lib/storage asks createClient for a client
 * once and keeps it, so the client here is one object whose bucket methods are
 * reset between tests. By default an upload works, a remove works and signing
 * fails soft (no data), so a test only changes what it is about.
 */
import { jest } from '@jest/globals';
import type { MockFn } from './prisma-mock';

export const bucket = {
    upload: jest.fn() as MockFn,
    remove: jest.fn() as MockFn,
    getPublicUrl: jest.fn() as MockFn,
    createSignedUrls: jest.fn() as MockFn,
};

export const storageFrom = jest.fn(() => bucket) as MockFn;

export const supabaseClient = { storage: { from: storageFrom } };

export function publicUrl(name: string, path: string): string {
    return `https://jest.supabase.test/storage/v1/object/public/${name}/${path}`;
}

export function resetStorage(): void {
    storageFrom.mockClear();
    bucket.upload.mockReset().mockResolvedValue({ error: null });
    bucket.remove.mockReset().mockResolvedValue({ error: null });
    bucket.getPublicUrl.mockReset().mockImplementation((path: string) => ({
        data: { publicUrl: publicUrl('bucket', path) },
    }));
    bucket.createSignedUrls
        .mockReset()
        .mockResolvedValue({ data: [], error: null });
}
