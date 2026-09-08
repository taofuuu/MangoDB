import { createClient } from '@supabase/supabase-js';
import { ApiError } from './ApiError';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadToStorage(
    file: Express.Multer.File,
    folder: string = 'items',
): Promise<string> {
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

    return publicUrlData.publicUrl;
}