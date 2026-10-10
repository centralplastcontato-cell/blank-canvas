// Confere o WhatsApp digitado no formulário do site. Celular no Brasil tem
// 11 dígitos com o DDD (DDD + 9 + 8 dígitos). Sem conferir, um dígito a menos
// fazia a boas-vindas automática ir para um número que não existe.
export type BrWhatsappCheck =
  | { ok: true; digits: string }
  | { ok: false; reason: "short" | "long" | "not_mobile" };

export function checkBrWhatsapp(raw: string): BrWhatsappCheck {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length >= 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length < 11) return { ok: false, reason: "short" };
  if (d.length > 11) return { ok: false, reason: "long" };
  if (d[2] !== "9") return { ok: false, reason: "not_mobile" };
  return { ok: true, digits: d };
}
