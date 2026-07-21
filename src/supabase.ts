import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://qzyvslnpnxfzytrmzzrv.supabase.co';
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_KHy9ignZkZOOq3yMcPLqZw_W8ntoXxF';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const supabaseStorageService = {
  /**
   * Uploads an image to the 'Album' bucket in Supabase.
   * Path format: user_{userId}/{contexto}/{filename}
   */
  async uploadImage(
    file: File | Blob,
    userId: string,
    contexto: 'profile' | 'scrapbook' | 'posts'
  ): Promise<string> {
    const fileExtension = (file instanceof File ? file.name.split('.').pop() : 'jpg') || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
    const filePath = `user_${userId}/${contexto}/${fileName}`;

    console.log(`[SUPABASE UPLOAD] Starting upload for user_${userId} inside context: ${contexto}`);
    console.log(`[SUPABASE UPLOAD PATH] Target path: ${filePath}`);
    console.log(`[SUPABASE UPLOAD SIZE] Blob size: ${file.size} bytes`);

    const { data, error } = await supabase.storage
      .from('Album')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('[SUPABASE UPLOAD ERROR]', error);
      throw error;
    }

    console.log('[SUPABASE UPLOAD SUCCESS] Returned metadata:', JSON.stringify(data));

    const { data: urlData } = supabase.storage
      .from('Album')
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Falha ao obter URL pública do Supabase Storage.');
    }

    console.log('[SUPABASE URL RESULT] Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  }
};
