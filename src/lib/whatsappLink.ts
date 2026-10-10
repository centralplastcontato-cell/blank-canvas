// Link para abrir uma conversa no WhatsApp com texto pronto.
//
// Usa api.whatsapp.com/send em vez de wa.me: o redirecionamento do wa.me (em
// alguns celulares e nos navegadores do Instagram/Facebook) estragava os emojis
// do texto, que chegavam como "�" (caso Dra Bruna, VENDAS 2, 09/10).
export function whatsappLink(phoneDigits: string, text?: string | null): string {
  const phone = String(phoneDigits || "").replace(/\D/g, "");
  const base = `https://api.whatsapp.com/send?phone=${phone}`;
  return text ? `${base}&text=${encodeURIComponent(text)}` : base;
}
