import multer from 'multer';
import { ApiError } from '../lib/ApiError';

const storage = multer.memoryStorage();

export const uploadImage = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (_req, file, cb) => {
        // Allowlist, not image/*: image/svg+xml is a document the browser
        // will execute scripts from when the public URL is opened directly.
        const allowed = ['image/png', 'image/jpeg', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(ApiError.badRequest('Only PNG, JPEG or WebP images are allowed'));
        }
    },
});