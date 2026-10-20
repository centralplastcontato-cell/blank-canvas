// Resposta de menu com emoji de número: o cliente copia o "1️⃣2️⃣" da lista
// (Mega Magic, 17/10: "1️⃣2️⃣" virou Janeiro, porque a leitura pegava só o
// primeiro "1"). Troca os emojis de número pelos dígitos antes de ler.

/** "1️⃣2️⃣" → "12", "🔟" → "10", "3️⃣ - Sábado" → "3 - Sábado" */
export function keycapsToDigits(text: string): string {
  return text.replace(/🔟/g, "10").replace(/(\d)️?⃣/g, "$1");
}
