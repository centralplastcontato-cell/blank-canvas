// Página do dia da festa: com mais de um cardápio ativo, abre o que combina com
// o pacote da festa ("Super Castelo" → "Cardápio Festa Super"). Palavras comuns
// e o nome do buffet não contam; sem combinação, fica o cardápio sem palavra
// própria (o "padrão") ou o primeiro.

const GENERIC = new Set(["cardapio", "festa", "pacote", "buffet", "de", "da", "do", "das", "dos", "e", "a", "o"]);

const words = (text: string | null | undefined) =>
  (text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter(Boolean);

export function pickCardapioForPackage<T extends { name: string }>(templates: T[], packageName: string | null | undefined, companyName?: string | null): T | null {
  if (templates.length <= 1) return templates[0] || null;
  const ignore = new Set([...GENERIC, ...words(companyName)]);
  const own = (t: T) => words(t.name).filter((w) => !ignore.has(w));
  const pkg = new Set(words(packageName));
  let best: T | null = null;
  let bestScore = 0;
  for (const t of templates) {
    const score = own(t).filter((w) => pkg.has(w)).length;
    if (score > bestScore) { best = t; bestScore = score; }
  }
  return best || templates.find((t) => own(t).length === 0) || templates[0];
}
