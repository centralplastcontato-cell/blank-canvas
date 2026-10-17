/**
 * Reduz uma imagem no navegador antes de enviar (lado maior até `maxSide`).
 * Lê o arquivo como dataURL e desenha num canvas: funciona com as fotos do
 * iPhone (HEIC) e evita mandar o arquivo cru, que às vezes chegava vazio
 * ("No content provided").
 */
export async function resizeImageFile(file: File, maxSide: number, type: "image/jpeg" | "image/png" = "image/jpeg"): Promise<{ base64: string; type: string }> {
  const dataUrl = await new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fail(new Error("Não consegui ler a imagem."));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((ok, fail) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => fail(new Error("Formato de imagem não suportado. Use JPG ou PNG."));
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL(type, 0.82);
  return { base64: out.split(",")[1] || "", type };
}
