/**
 * Checks whether an image File's aspect ratio matches a target ratio,
 * within a small tolerance (source photos are rarely exact-pixel 16:9).
 *
 * @param {File} file
 * @param {number} targetRatio - e.g. 16/9
 * @param {number} [tolerance=0.02] - fractional tolerance (2% default)
 * @returns {Promise<boolean>}
 */
export function validateAspectRatio(file, targetRatio, tolerance = 0.02) {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = img.width / img.height;
      resolve(Math.abs(ratio - targetRatio) / targetRatio <= tolerance);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(false);
    };
    img.src = objectUrl;
  });
}
