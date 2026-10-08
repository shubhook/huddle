/** Side of the square sent to the server. It stores 128px, so this leaves room to resample. */
const UPLOAD_SIZE = 256;

/**
 * Crops the picture to its centre square and shrinks it before upload, so a 10 MB phone
 * photo travels as a few KB. The server re-encodes it again, this only saves the upload.
 */
export async function shrinkForAvatar(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const size = Math.min(UPLOAD_SIZE, side);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available.");
    context.imageSmoothingQuality = "high";
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );

    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
    // Browsers that cannot write WebP hand back a PNG instead, which is much larger.
    const webp = await encode("image/webp");
    if (webp?.type === "image/webp") return webp;
    const jpeg = await encode("image/jpeg");
    if (!jpeg) throw new Error("Could not encode the image.");
    return jpeg;
  } finally {
    bitmap.close();
  }
}
