import type { NextFunction, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { ApiError } from '../lib/api-error';
import { IMAGE_EXTENSIONS, PDF_MIME_TYPE } from '../lib/storage';

const MAX_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPE_MESSAGE = 'Only PNG, JPEG or WebP images are allowed';
const PDF_TYPE_MESSAGE = 'Only PDF files are allowed';

// file.mimetype is whatever the client claimed, so the bytes must agree: each
// allowed type starts with a fixed signature. A PDF may have a little junk
// before its header, which readers accept, so it is searched for, not matched.
function startsLikeItsType(file: Express.Multer.File): boolean {
    const bytes = file.buffer;
    switch (file.mimetype) {
        case 'image/png':
            return bytes
                .subarray(0, 8)
                .equals(Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'));
        case 'image/jpeg':
            return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
        case 'image/webp':
            return (
                bytes.toString('latin1', 0, 4) === 'RIFF' &&
                bytes.toString('latin1', 8, 12) === 'WEBP'
            );
        case PDF_MIME_TYPE:
            return bytes.subarray(0, 1024).includes('%PDF-');
        default:
            return false;
    }
}

const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        if (Object.hasOwn(IMAGE_EXTENSIONS, file.mimetype)) {
            cb(null, true);
        } else {
            cb(ApiError.badRequest(IMAGE_TYPE_MESSAGE));
        }
    },
});

// ADR 0017. A quotation is one PDF, up to 5 MB, sent through the same
// saveWithUpload path as images.
const pdfUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === PDF_MIME_TYPE) {
            cb(null, true);
        } else {
            cb(ApiError.badRequest(PDF_TYPE_MESSAGE));
        }
    },
});

// Multer rejects with its own MulterError, which errorHandler does not know
// about — it lands in the 500 branch. Translating here keeps multer's error
// vocabulary next to the config that produces it.
function singleUpload(
    uploader: multer.Multer,
    field: string,
    sizeMessage: string,
    typeMessage: string,
) {
    const middleware = uploader.single(field);

    return (req: Request, res: Response, next: NextFunction): void => {
        middleware(req, res, (err: unknown) => {
            if (err instanceof MulterError) {
                next(
                    err.code === 'LIMIT_FILE_SIZE'
                        ? ApiError.badRequest(sizeMessage)
                        : ApiError.badRequest(`Unexpected field: ${err.field}`),
                );
                return;
            }
            // Here, not in fileFilter: the bytes only exist once multer has
            // read the whole file.
            if (!err && req.file && !startsLikeItsType(req.file)) {
                next(ApiError.badRequest(typeMessage));
                return;
            }
            next(err);
        });
    };
}

export function uploadImage(field: string) {
    return singleUpload(
        imageUpload,
        field,
        'Image must be 5MB or smaller',
        IMAGE_TYPE_MESSAGE,
    );
}

export function uploadPdf(field: string) {
    return singleUpload(
        pdfUpload,
        field,
        'PDF must be 5MB or smaller',
        PDF_TYPE_MESSAGE,
    );
}

// A route whose file upload is required. Called after parseBody, so a bad field
// is reported the same way, under the name the form gives the file input.
export function requireFile(
    file: Express.Multer.File | undefined,
    field: string,
    message = 'Choose an image first',
): Express.Multer.File {
    if (!file) {
        throw ApiError.validationFailed([{ field, message }]);
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
