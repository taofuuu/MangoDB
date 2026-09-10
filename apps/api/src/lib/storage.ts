import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from './ApiError';

const BUCKETS = {
    CERTIFICATE: 'certificate',
    PORTFOLIO: 'portfolio',
} as const;

type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

let client: SupabaseClient | undefined;

function getSupabase(): SupabaseClient {
    if (!client) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SECRET_KEY;

        if (!url || !key) {
            throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are not set');
        }

        client = createClient(url, key);
    }

    return client;
}

export type UploadedImage = {
    path: string;
    url: string;
};

const EXTENSIONS: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
};

export async function uploadToStorage(
    file: Express.Multer.File,
    bucket: Bucket,
    folder: string,
): Promise<UploadedImage> {
    const extension = EXTENSIONS[file.mimetype] ?? 'bin';
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
