import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseCredentials } from '../env';
import { ApiError } from './api-error';

const BUCKETS = {
    CERTIFICATE: 'certificate',
    PORTFOLIO: 'portfolio',
    PROFILE: 'profile',
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

type UploadedImage = {
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

export async function uploadToStorage(
    file: Express.Multer.File,
    bucket: Bucket,
    folder: string,
): Promise<UploadedImage> {
    const extension = IMAGE_EXTENSIONS[file.mimetype] ?? 'bin';
    const random = Math.random().toString(36).substring(2);

    const path = `${folder}/${Date.now()}-${random}.${extension}`;

    const { error } = await getSupabase()
        .storage.from(bucket)
        .upload(path, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });

    if (error) {
        throw ApiError.badRequest(`Failed to upload image: ${error.message}`);
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

export async function removeFromStorageByUrl(
    url: string,
    bucket: Bucket,
): Promise<void> {
    const marker = `/object/public/${bucket}/`;
    const markerIdx = url.indexOf(marker);

    if (markerIdx === -1) {
        console.error(`URL is not a recognized ${bucket} storage URL:`, url);
        return;
    }

    const path = url.slice(markerIdx + marker.length);

    await removeFromStorage(path, bucket);
}

export { BUCKETS };
