import {
    type Bucket,
    removeFromStorage,
    removeFromStorageByUrl,
    uploadToStorage,
} from './storage';

// Uploads a file, runs the write that stores its URL, and keeps storage in
// step with the row: if the write fails the new file is removed, and once it
// succeeds the file it replaced, if any, is removed. Both removals are
// best-effort, like removeFromStorage. A write without a new file does not
// come through here.
export async function saveWithUpload<T>(
    file: Express.Multer.File,
    bucket: Bucket,
    folder: string,
    write: (url: string) => Promise<T>,
    replacesUrl?: string | null,
): Promise<T> {
    const uploaded = await uploadToStorage(file, bucket, folder);

    let result: T;
    try {
        result = await write(uploaded.url);
    } catch (err) {
        // The row never pointed at it, so the object is an orphan.
        await removeFromStorage(uploaded.path, bucket);
        throw err;
    }

    // The row points at the new file now, so the old one is unreferenced.
    if (replacesUrl) {
        await removeFromStorageByUrl(replacesUrl, bucket);
    }
    return result;
}
