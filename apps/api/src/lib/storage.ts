import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseCredentials } from '../env';
import { ApiError } from './api-error';

const BUCKETS = {
    CERTIFICATE: 'certificate',
    PORTFOLIO: 'portfolio',
    PROFILE: 'profile',
    QUOTATION: 'quotation',
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

let client: SupabaseClient | undefined;

function getSupabase(): SupabaseClient {
    // Still lazy, but only to avoid opening a client the process may never
    // use — env.ts already guaranteed both variables are set.
    if (!client) {
        const { url, key } = supabaseCredentials();
        client = createClient(url, key);
    }
    return client;
}

type UploadedFile = {
    path: string;
    url: string;
};

// The image types an upload may be, each with the extension its stored file
// gets. An allowlist, not image/*: image/svg+xml is a document the browser
// will run scripts from when its public URL is opened directly.
export const IMAGE_EXTENSIONS: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
};

export const PDF_MIME_TYPE = 'application/pdf';

const FILE_EXTENSIONS: Record<string, string> = {
    ...IMAGE_EXTENSIONS,
    [PDF_MIME_TYPE]: 'pdf',
};

export async function uploadToStorage(
    file: Express.Multer.File,
    bucket: Bucket,
    folder: string,
): Promise<UploadedFile> {
    const extension = FILE_EXTENSIONS[file.mimetype] ?? 'bin';
    // randomUUID, not Math.random: a private file's name must not be guessable.
    const path = `${folder}/${Date.now()}-${randomUUID()}.${extension}`;

    const { error } = await getSupabase()
        .storage.from(bucket)
        .upload(path, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });

    if (error) {
        // Our side failed, not the request, so 500 (conventions §4). The
        // cause goes to the log; the caller only needs to know to retry.
        console.error('Upload failed:', error.message);
        throw new ApiError(
            500,
            'INTERNAL',
            'The file could not be stored. Try again.',
        );
    }

    const { data } = getSupabase().storage.from(bucket).getPublicUrl(path);

    return {
        path,
        url: data.publicUrl,
    };
}

export async function removeFromStorage(
    path: string,
    bucket: Bucket,
): Promise<void> {
    try {
        const { error } = await getSupabase()
            .storage.from(bucket)
            .remove([path]);

        if (error) {
            console.error('Orphaned upload left behind:', path, error.message);
        }
    } catch (err) {
        console.error('Orphaned upload left behind:', path, err);
    }
}

// For the seed only: puts a file at a fixed path, replacing what is there, so
// a rerun does not pile up copies. Returns the URL a row stores, the same kind
// uploadToStorage gives.
export async function putStorageFile(
    bucket: Bucket,
    path: string,
    body: Buffer,
    contentType: string,
): Promise<string> {
    const storage = getSupabase().storage.from(bucket);
    const { error } = await storage.upload(path, body, {
        contentType,
        upsert: true,
    });
    if (error) {
        throw new Error(`Could not upload ${path}: ${error.message}`);
    }
    return storage.getPublicUrl(path).data.publicUrl;
}

// The file's path inside its bucket, from the URL getPublicUrl gave it. Null
// for a URL that is not one of ours (seed data, a hand-edited row).
function storagePath(url: string, bucket: Bucket): string | null {
    const marker = `/object/public/${bucket}/`;
    const markerIdx = url.indexOf(marker);
    return markerIdx === -1 ? null : url.slice(markerIdx + marker.length);
}

export async function removeFromStorageByUrl(
    url: string,
    bucket: Bucket,
): Promise<void> {
    const path = storagePath(url, bucket);

    if (path === null) {
        console.error(`URL is not a recognized ${bucket} storage URL:`, url);
        return;
    }

    await removeFromStorage(path, bucket);
}

// For a private bucket (quotation): the stored public URL does not open, so
// each one is swapped for a link that works for `expiresInSeconds` only. A URL
// that is not ours comes back as it was. Same order as the input.
//
// Best-effort, like removeFromStorage: a caller may have saved its row already,
// and a 500 would report that write as failed. On failure the stored URLs come
// back, so a link may not open until the next load, and the page still works.
export async function signStorageUrls(
    urls: string[],
    bucket: Bucket,
    expiresInSeconds: number,
): Promise<string[]> {
    const paths = urls.map((url) => storagePath(url, bucket));
    const ours = paths.filter((path) => path !== null);
    if (ours.length === 0) return urls;

    try {
        const { data, error } = await getSupabase()
            .storage.from(bucket)
            .createSignedUrls(ours, expiresInSeconds);

        if (error) {
            console.error('Signing failed:', error.message);
            return urls;
        }

        const signed = new Map(
            data.map((entry) => [entry.path, entry.signedUrl]),
        );
        return urls.map((url, i) => {
            const path = paths[i];
            return (path && signed.get(path)) || url;
        });
    } catch (err) {
        console.error('Signing failed:', err);
        return urls;
    }
}

export { BUCKETS };
