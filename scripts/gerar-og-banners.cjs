/**
 * Gera os banners de preview (Open Graph) em 1200x630.
 *
 * O WhatsApp descarta a miniatura de imagens muito pesadas, por isso a
 * qualidade do JPEG cai em degraus até o arquivo entrar no limite.
 *
 *   node scripts/gerar-og-banners.cjs
 */
const { Jimp, JimpMime } = require("jimp");
const path = require("path");
const fs = require("fs");

const RAIZ = path.join(__dirname, "..");
const L = 1200;
const A = 630;
const LIMITE_KB = 600;

/** Salva em JPEG baixando a qualidade até caber em LIMITE_KB. */
async function salvarJpeg(img, destino) {
  for (const qualidade of [90, 85, 80, 75, 70, 65, 60, 55]) {
    const buf = await img.getBuffer(JimpMime.jpeg, { quality: qualidade });
    if (buf.length <= LIMITE_KB * 1024 || qualidade === 55) {
      fs.writeFileSync(destino, buf);
      return { qualidade, kb: Math.round(buf.length / 1024) };
    }
  }
}

/** Castelo: a arte já existe e está bem enquadrada — só reenquadra e comprime. */
async function castelo() {
  const origem = path.join(RAIZ, "src/assets/og-castelo-source.jpg");
  const destino = path.join(RAIZ, "public/og-image.jpg");

  // Preserva a arte original na primeira execução: o destino é sobrescrito.
  if (!fs.existsSync(origem)) fs.copyFileSync(destino, origem);

  const img = await Jimp.read(origem);
  img.cover({ w: L, h: A });
  const r = await salvarJpeg(img, destino);
  console.log(`  public/og-image.jpg     ${L}x${A}  ${r.kb}KB  (qualidade ${r.qualidade})`);
}

/**
 * Recorta a moldura vazia em volta do desenho.
 * O autocrop do jimp não serve aqui: a moldura do PNG tem ruído de alpha e ele
 * desiste, devolvendo a imagem inteira — o desenho sairia minúsculo no banner.
 */
function recortarNoDesenho(img, alphaMin = 10) {
  const { width: w, height: h, data } = img.bitmap;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > alphaMin) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return img; // imagem toda transparente: não há o que recortar
  return img.crop({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
}

/** Planeta: só existe o logo solto — monta o banner sobre a cor da marca. */
async function planeta() {
  const FUNDO = 0x120a24ff; // DARK_BG da landing page do Planeta
  const destino = path.join(RAIZ, "public/og-planeta.jpg");

  const logo = await Jimp.read(path.join(RAIZ, "src/assets/thumb-planeta-logo-transparent.png"));
  recortarNoDesenho(logo);
  logo.scaleToFit({ w: Math.round(L * 0.82), h: Math.round(A * 0.72) });

  const banner = new Jimp({ width: L, height: A, color: FUNDO });
  banner.composite(logo, Math.round((L - logo.bitmap.width) / 2), Math.round((A - logo.bitmap.height) / 2));

  const r = await salvarJpeg(banner, destino);
  console.log(`  public/og-planeta.jpg   ${L}x${A}  ${r.kb}KB  (qualidade ${r.qualidade})`);
}

(async () => {
  console.log("Gerando banners de preview 1200x630:");
  await castelo();
  await planeta();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
