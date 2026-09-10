import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from './ApiError';

const BUCKET = 'portfolio';

// Read lazily, like getSecret() in src/auth/jwt.ts: imports are evaluated
// before dotenv.config() runs, and a missing key should fail the upload with
// a clear message rather than take the whole server down at boot.
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

export type UploadedImage = { path: string; url: string };

// Extension from the mimetype, not the filename: fileFilter has already
// narrowed it to these three, and originalname has nothing to slice off when
// the client sends a name without a dot.
const EXTENSIONS: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
};

export async function uploadToStorage(
    file: Express.Multer.File,
    folder = 'portfolios',
): Promise<UploadedImage> {
    const extension = EXTENSIONS[file.mimetype] ?? 'bin';
    const random = Math.random().toString(36).substring(2);
    const path = `${folder}/${Date.now()}-${random}.${extension}`;

    const { error } = await getSupabase()
        .storage.from(BUCKET)
        .upload(path, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });

    if (error) {
        throw ApiError.badRequest(`Failed to upload image: ${error.message}`);
    }

    const { data } = getSupabase().storage.from(BUCKET).getPublicUrl(path);

    return { path, url: data.publicUrl };
}

// The upload lands before the insert, so a failed insert leaves a file
// nothing points at. Best effort — a failed cleanup must not mask the
// error that caused it.
export async function removeFromStorage(path: string): Promise<void> {
    try {
        const { error } = await getSupabase()
            .storage.from(BUCKET)
            .remove([path]);
        if (error) {
            console.error('Orphaned upload left behind:', path, error.message);
        }
    } catch (err) {
        console.error('Orphaned upload left behind:', path, err);
    }
}

// On delete only the stored public URL is available, not the original
// upload path. getPublicUrl() produces `.../object/public/<bucket>/<path>`,
// so slice the path back out and remove it. Anything that isn't one of our
// bucket URLs (e.g. the migration placeholder) is left alone.
export async function removeFromStorageByUrl(url: string): Promise<void> {
    const marker = `/object/public/${BUCKET}/`;
    const markerIdx = url.indexOf(marker);
    if (markerIdx === -1) {
        return;
    }
    const path = url.slice(markerIdx + marker.length);
    await removeFromStorage(path);
}
