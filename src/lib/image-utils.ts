import { supabase } from '@/lib/supabase';

/**
 * Compress an image file using an off-screen canvas.
 * Returns a new File with the compressed image (JPEG).
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<File> {
  return new Promise<File>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Scale down if wider than maxWidth, preserving aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas 2D context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob returned null'));
            return;
          }

          // Build a filename: keep original stem, change extension to .jpg
          const stem = file.name.replace(/\.[^.]+$/, '');
          const compressed = new File([blob], `${stem}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}

/**
 * Convert a File to a data URL string (useful for image previews).
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader result is not a string'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a business card image to Supabase Storage and return its public URL.
 *
 * Bucket: card-images
 * Path:   {userId}/{timestamp}-{random}.jpg
 */
export async function uploadCardImage(file: File, userId: string): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${userId}/${timestamp}-${random}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('card-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from('card-images').getPublicUrl(filePath);

  return data.publicUrl;
}
