// No iPhone o arquivo escolhido às vezes não pode ser lido na hora do envio
// (está no iCloud sem baixar, ou o Safari ainda convertia) e o upload chegava
// vazio ("No content provided"). Lê tudo antes e envia uma cópia em memória.
export async function fileForUpload(file: File): Promise<Blob | null> {
  const bytes = await file.arrayBuffer().catch(() => new ArrayBuffer(0));
  if (bytes.byteLength === 0) return null;
  return new Blob([bytes], { type: file.type });
}

export const EMPTY_IMAGE_MESSAGE =
  "Não consegui ler a imagem (chegou vazia). No iPhone, abra a imagem no app Fotos, espere carregar por completo e escolha de novo. Se veio do ChatGPT, salve na Fototeca antes.";
