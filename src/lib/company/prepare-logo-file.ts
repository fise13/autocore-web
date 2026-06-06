const MAX_EDGE = 512;
const SMALL_FILE_BYTES = 180_000;

export async function prepareLogoFile(file: File): Promise<File> {
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
    return file;
  }

  if (file.size <= SMALL_FILE_BYTES && file.type === "image/webp") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    try {
      const longestEdge = Math.max(bitmap.width, bitmap.height);
      if (longestEdge <= MAX_EDGE && file.size <= SMALL_FILE_BYTES) {
        return file;
      }

      const scale = Math.min(1, MAX_EDGE / longestEdge);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        return file;
      }

      context.drawImage(bitmap, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/webp", 0.86);
      });

      if (!blob) {
        return file;
      }

      return new File([blob], "logo.webp", { type: "image/webp" });
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}
