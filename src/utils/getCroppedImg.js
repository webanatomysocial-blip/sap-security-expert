/**
 * Renders the cropped region of an image (as selected via react-easy-crop's
 * onCropComplete pixel coordinates) onto a canvas and returns it as a File.
 *
 * @param {string} imageSrc - object URL or data URL of the source image
 * @param {{ x: number, y: number, width: number, height: number }} cropPixels
 * @param {string} [fileName]
 * @returns {Promise<File>}
 */
export function getCroppedImg(imageSrc, cropPixels, fileName = "profile.jpg") {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = cropPixels.width;
      canvas.height = cropPixels.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        img,
        cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
        0, 0, cropPixels.width, cropPixels.height
      );

      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Crop failed")); return; }
        resolve(new File([blob], fileName, { type: "image/jpeg" }));
      }, "image/jpeg", 0.9);
    };
    img.onerror = () => reject(new Error("Failed to load image for cropping"));
    img.src = imageSrc;
  });
}
