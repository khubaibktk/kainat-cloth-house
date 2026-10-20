// Shrinks a phone photo (often 4-10 MB) to a web-sized JPEG before upload.
export async function compressImage(file, max = 1200, quality = 0.82) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This photo could not be read. Try a JPG or PNG.");
  }
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (bitmap.close) bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Could not process this photo.");
  return blob;
}
