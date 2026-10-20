// Bolinha ao lado do horário das mensagens enviadas: quem mandou.
// 🟡 equipe pela plataforma · 🟣 IA · ⚪ celular do buffet (fora da plataforma).
// Sem bolinha: robô e automações (follow-up, confirmação de visita…).

type Meta = { source?: unknown; type?: unknown } | null | undefined;

export interface SenderDot {
  className: string;
  title: string;
}

export function senderDot(msg: { from_me: boolean; metadata?: unknown }): SenderDot | null {
  if (!msg.from_me) return null;
  const meta = (msg.metadata && typeof msg.metadata === "object" ? msg.metadata : null) as Meta;
  const source = meta?.source;
  if (source === "platform" && !meta?.type) return { className: "bg-yellow-400", title: "Enviado pela plataforma (equipe)" };
  if (source === "ai_agent" || source === "bia") return { className: "bg-purple-500", title: "Enviado pela IA" };
  if (source === "phone") return { className: "bg-white ring-1 ring-black/20", title: "Enviado pelo celular do buffet" };
  return null;
}
