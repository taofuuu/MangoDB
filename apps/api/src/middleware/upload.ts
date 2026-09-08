import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { ApiError } from '../lib/ApiError';

const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        // Allowlist, not image/*: image/svg+xml is a document the browser
        // will execute scripts from when the public URL is opened directly.
        const allowed = ['image/png', 'image/jpeg', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                ApiError.badRequest(
                    'Only PNG, JPEG or WebP images are allowed',
                ),
            );
        }
    },
});

// Multer rejects with its own MulterError, which errorHandler does not know
// about — it lands in the 500 branch. Translating here keeps multer's error
// vocabulary next to the config that produces it.
export function uploadImage(field: string) {
    const middleware = upload.single(field);

    return (req: Request, res: Response, next: NextFunction): void => {
        middleware(req, res, (err: unknown) => {
            if (err instanceof MulterError) {
                next(
                    err.code === 'LIMIT_FILE_SIZE'
                        ? ApiError.badRequest('Image must be 5MB or smaller')
                        : ApiError.badRequest(`Unexpected field: ${err.field}`),
                );
                return;
            }
            next(err);
        });
    };
}