function readJpegOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const view = new DataView(buffer);
      if (view.getUint16(0, false) !== 0xffd8) return resolve(1);

      let offset = 2;
      while (offset < view.byteLength) {
        if (view.getUint8(offset) !== 0xff) return resolve(1);
        const marker = view.getUint8(offset + 1);
        const size = view.getUint16(offset + 2, false);

        if (marker === 0xe1 && view.getUint32(offset + 4, false) === 0x45786966) {
          const tiff = offset + 10;
          const little = view.getUint16(tiff, false) === 0x4949;
          const ifd = tiff + view.getUint32(tiff + 4, little);
          const tags = view.getUint16(ifd, little);

          for (let i = 0; i < tags; i++) {
            const entry = ifd + 2 + i * 12;
            if (view.getUint16(entry, little) === 0x0112) {
              return resolve(view.getUint16(entry + 8, little));
            }
          }
        }

        offset += 2 + size;
      }
      resolve(1);
    };
    reader.onerror = () => resolve(1);
    reader.readAsArrayBuffer(file.slice(0, 64 * 1024));
  });
}

/** Normaliza somente JPEGs que realmente têm EXIF de rotação. */
export async function normalizeImageOrientation(file: File): Promise<File> {
  if (!/^image\/jpe?g$/i.test(file.type)) return file;

  try {
    const orientation = await readJpegOrientation(file);
    if (orientation < 2 || orientation > 8) return file;

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

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return file;

    return new File([blob], file.name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[normalizeImageOrientation] falhou, usando arquivo original:", err);
    return file;
  }
}
