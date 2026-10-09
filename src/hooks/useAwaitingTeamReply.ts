import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { openAiHandoff, teamRepliedSince, type OutgoingMessage } from "@/lib/aiConversation";

interface ConvLike {
  id: string;
  bot_step?: string | null;
  bot_enabled?: boolean | null;
  bot_data?: unknown;
  last_message_at?: string | null;
}

/**
 * Conversas que a IA passou para a equipe e em que ninguém da equipe escreveu
 * ainda (etiqueta "Responder" na lista). Valor: true = o alerta de "sem
 * resposta" já disparou (etiqueta vermelha).
 */
export function useAwaitingTeamReply(conversations: ConvLike[]): Map<string, boolean> {
  const candidates = useMemo(
    () => conversations
      .map((c) => ({ id: c.id, last: c.last_message_at || "", handoff: openAiHandoff(c) }))
      .filter((x): x is { id: string; last: string; handoff: { at: string; late: boolean } } => x.handoff !== null)
      .slice(0, 200),
    [conversations],
  );
  // Recalcula quando muda a lista de passagens ou chega mensagem nelas
  const key = candidates.map((x) => `${x.id}:${x.last}:${x.handoff.late}`).join("|");
  const [awaiting, setAwaiting] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (candidates.length === 0) {
      setAwaiting((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const minAt = candidates.map((x) => x.handoff.at).sort()[0];
      const { data, error } = await supabase
        .from("wapi_messages")
        .select("conversation_id, from_me, timestamp, metadata")
        .in("conversation_id", candidates.map((x) => x.id))
        .eq("from_me", true)
        .gt("timestamp", minAt)
        .limit(1000);
      if (cancelled) return;
      const byConv = new Map<string, OutgoingMessage[]>();
      for (const row of (data || []) as Array<OutgoingMessage & { conversation_id: string }>) {
        const list = byConv.get(row.conversation_id) || [];
        list.push(row);
        byConv.set(row.conversation_id, list);
      }
      const next = new Map<string, boolean>();
      for (const x of candidates) {
        // Sem conseguir ler as mensagens, vale a passagem em aberto
        if (error || !teamRepliedSince(byConv.get(x.id) || [], x.handoff.at)) next.set(x.id, x.handoff.late);
      }
      setAwaiting(next);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return awaiting;
}
