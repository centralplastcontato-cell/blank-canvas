/**
 * Normaliza a orientação de uma imagem antes do upload.
 * O navegador aplica EXIF orientation ao renderizar, mas APIs como WhatsApp
 * exibem os pixels brutos — fotos verticais aparecem deitadas.
 *
 * Esta função decodifica a imagem aplicando a orientação correta ("from-image")
 * e regrava os pixels já rotacionados, eliminando a tag EXIF.
 *
 * - Imagens não suportadas (PDF/vídeo) ou já corretas retornam o arquivo original.
 * - Mantém o nome e tipo MIME originais.
 */
export async function normalizeImageOrientation(file: File): Promise<File> {
  // Apenas imagens raster comuns
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    // Mantém JPEG como JPEG; PNG/WebP -> JPEG (menor e sem EXIF)
    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const quality = outType === "image/jpeg" ? 0.92 : undefined;

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, outType, quality)
    );
    if (!blob) return file;

    return new File([blob], file.name, {
      type: outType,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[normalizeImageOrientation] falhou, usando arquivo original:", err);
    return file;
  }
}
