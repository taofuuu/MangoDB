import multer from 'multer';
import { ApiError } from '../lib/ApiError';

const storage = multer.memoryStorage();

export const uploadImage = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(ApiError.badRequest('Only image files are allowed'));
        }
    },
});