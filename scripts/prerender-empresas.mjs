// Gera dist/empresas.html: o mesmo app, mas com título, descrição e prévia de
// link (Open Graph) da página de confraternização de empresas do Castelo já no
// HTML que o servidor entrega. WhatsApp e Facebook não rodam JavaScript, então
// liam a descrição do buffet infantil do index.html. A Vercel serve este arquivo
// em /empresas nos domínios do Castelo (vercel.json).
import { readFileSync, writeFileSync } from "node:fs";

const DIST = new URL("../dist/", import.meta.url);
const SITE = "https://www.castelodadiversao.com.br";
const TITLE = "Confraternização de Empresas em Sorocaba | Castelo da Diversão";
const DESC = "Confraternização de fim de ano para empresas em Sorocaba. Comida, refrigerante e água, equipe, espaço climatizado e estacionamento próprio para até 120 pessoas.";
const URL_ = `${SITE}/empresas`;
const IMG = `${SITE}/empresas/salao.jpg`;

const esc = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
let html = readFileSync(new URL("index.html", DIST), "utf8");

const setMeta = (attr, key, value) => {
  const re = new RegExp(`(<meta ${attr}="${key.replace(/[:]/g, "\\:")}" content=")[^"]*(")`);
  if (!re.test(html)) throw new Error(`meta ${attr}=${key} não encontrada no index.html`);
  html = html.replace(re, `$1${esc(value)}$2`);
};

html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(TITLE)}</title>`);
html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${URL_}$2`);
setMeta("name", "description", DESC);
setMeta("property", "og:url", URL_);
setMeta("property", "og:title", TITLE);
setMeta("property", "og:description", DESC);
setMeta("property", "og:image", IMG);
setMeta("property", "og:image:secure_url", IMG);
setMeta("property", "og:image:width", "1280");
setMeta("property", "og:image:height", "720");
setMeta("property", "og:image:alt", "Salão do Castelo da Diversão com as mesas montadas");
setMeta("name", "twitter:title", TITLE);
setMeta("name", "twitter:description", DESC);
setMeta("name", "twitter:image", IMG);

// O script de marca do index.html reescreve título e prévia pelo domínio (buffet
// infantil); nesta página ele não deve rodar.
const marker = "(function() {";
if (!html.includes(marker)) throw new Error("script de marca não encontrado no index.html");
html = html.replace(marker, `${marker}\n        if (/^\\/empresas\\/?$/.test(window.location.pathname)) return;`);

writeFileSync(new URL("empresas.html", DIST), html);
console.log("dist/empresas.html gerado");
