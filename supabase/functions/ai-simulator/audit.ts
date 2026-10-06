// Conferência das conversas REAIS da IA: as mesmas conferências do simulador
// (as que não dependem das consultas internas da IA), aplicadas ao que foi
// trocado no WhatsApp. Não chama IA nenhuma — custo zero.

import { type CheckOptions, deterministicChecks, type RuleCheck, type TranscriptEntry } from "./checks.ts";

export interface RealMessage {
  from_me: boolean;
  content: string | null;
  message_type: string;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

const MEDIA = new Set(["image", "video", "document"]);
// Precisam das consultas internas da IA (agenda, tabela de preços), que não
// ficam gravadas na conversa real — a trava de valores já barra R$ fora da tabela no envio
// "Uma resposta por vez" também fica de fora: reenvios e lembretes automáticos aparecem como 2ª mensagem
const SKIPPED_IN_REAL = new Set(["valores_conferidos", "datas_da_agenda", "uma_resposta_por_vez"]);

/**
 * Conversa real → formato do simulador. Texto da equipe fica de fora (não é
 * a IA), mas foto/vídeo/PDF da equipe contam como material enviado.
 */
export function realTranscript(messages: RealMessage[], handedOff: boolean): TranscriptEntry[] {
  const sorted = [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const out: TranscriptEntry[] = [];
  let turn = 0;
  let last: "cliente" | "ia" | "" = "";
  for (const m of sorted) {
    if (!m.from_me) {
      if (last !== "cliente") turn++;
      last = "cliente";
      out.push({ who: "cliente", text: m.content || `[${m.message_type}]`, turn });
      continue;
    }
    const media = MEDIA.has(m.message_type);
    if (!media && m.metadata?.source !== "ai_agent") continue;
    last = "ia";
    out.push({ who: "ia", text: media ? "" : (m.content || ""), kind: media ? m.message_type : "text", turn: Math.max(turn, 1) });
  }
  // Texto logo antes de foto/vídeo/PDF é a legenda do material
  out.forEach((e, i) => {
    const next = out[i + 1];
    if (e.who === "ia" && e.kind === "text" && next?.who === "ia" && MEDIA.has(next.kind || "") && next.turn === e.turn) e.kind = "legenda";
  });
  if (handedOff) out.push({ who: "ferramenta", text: "transferir_para_atendente({})\n→ conversa com a equipe", turn: Math.max(turn, 1) });
  return out;
}

/** Problemas da conversa real (só as conferências que valem sem as consultas internas) */
export function auditConversation(transcript: TranscriptEntry[], opts: CheckOptions): RuleCheck[] {
  return deterministicChecks({ transcript }, opts).filter((c) => !SKIPPED_IN_REAL.has(c.id) && c.ok === false);
}
