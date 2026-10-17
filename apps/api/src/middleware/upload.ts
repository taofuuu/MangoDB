import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { ApiError } from '../lib/api-error';
import { IMAGE_EXTENSIONS } from '../lib/storage';

const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        if (Object.hasOwn(IMAGE_EXTENSIONS, file.mimetype)) {
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

// A route whose image is required. Called after parseBody, so a bad field is
// reported the same way, under the name the form gives the file input.
export function requireFile(
    file: Express.Multer.File | undefined,
    field: string,
): Express.Multer.File {
    if (!file) {
        throw ApiError.validationFailed([
            { field, message: 'Choose an image first' },
        ]);
    }
    return file;
}

// A multipart PATCH may carry only a new image, so an empty body is fine when
// a file came. Neither is a request that changes nothing.
export function assertSomethingToUpdate(
    body: object,
    file: Express.Multer.File | undefined,
): void {
    if (Object.keys(body).length === 0 && !file) {
        throw ApiError.badRequest('Provide at least one field to update');
    }
}
