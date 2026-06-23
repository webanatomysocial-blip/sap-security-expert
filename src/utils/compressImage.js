const QUALITY = 0.82;

/**
 * Compress and resize an image File client-side before upload.
 * Uses the Canvas API — no extra dependencies.
 *
 * Returns the original File unchanged if:
 *   - the file is already small (≤ 300 KB)
 *   - compression produces a larger result
 *   - any error occurs during processing
 *
 * @param {File} file
 * @param {{ maxWidth?: number, maxHeight?: number, quality?: number }} [opts]
 * @returns {Promise<File>}
 */
export async function compressImage(file, opts = {}) {
  const { maxWidth = 1920, maxHeight = 1920, quality = QUALITY } = opts;

  if (file.size <= 300 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      const scale = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      const testWebP = canvas.toDataURL('image/webp');
      const useWebP = testWebP.startsWith('data:image/webp');
      const mime = useWebP ? 'image/webp' : 'image/jpeg';
      const ext = useWebP ? 'webp' : 'jpg';

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
          resolve(new File([blob], name, { type: mime }));
        },
        mime,
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}
