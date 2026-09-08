import { createClient } from '@supabase/supabase-js';
import { ApiError } from './ApiError';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export type UploadedImage = { path: string; url: string };

export async function uploadToStorage(
    file: Express.Multer.File,
    folder: string = 'items',
): Promise<UploadedImage> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

    // อัปโหลดเข้า Bucket ชื่อ "portfolio"
    const { error } = await supabase.storage
        .from('portfolio')
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });

    if (error) {
        // แก้จาก new ApiError เป็น Static Method
        throw ApiError.badRequest(`Failed to upload image: ${error.message}`);
    }

    // ใช้ fileName ตรงๆ แทน data.path
    const { data: publicUrlData } = supabase.storage
        .from('portfolio')
        .getPublicUrl(fileName);

    return { path: fileName, url: publicUrlData.publicUrl };
}

// The upload lands before the insert, so a failed insert leaves a file
// nothing points at. Best effort — a failed cleanup must not mask the
// error that caused it.
export async function removeFromStorage(path: string): Promise<void> {
    const { error } = await supabase.storage.from('portfolio').remove([path]);
    if (error) {
        console.error('Orphaned upload left behind:', path, error.message);
    }
}