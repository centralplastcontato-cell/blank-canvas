import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, GraduationCap, Loader2 } from "lucide-react";

const DAYS = 30;
const OUTROS = "Outras informações";

interface Handoff { id: string; created_at: string; lead_id: string | null; reason: string; name: string | null }

// Respostas ensinadas: só lembrete visual neste navegador (o que vale é o texto da IA)
const taughtKey = (companyId: string) => `ai_taught_${companyId}`;
const readTaught = (companyId: string): string[] => {
  try { return JSON.parse(localStorage.getItem(taughtKey(companyId)) || "[]"); } catch { return []; }
};
const writeTaught = (companyId: string, ids: string[]) => {
  try { localStorage.setItem(taughtKey(companyId), JSON.stringify(ids.slice(-200))); } catch { /* sem armazenamento */ }
};

/** Junta a resposta ensinada no fim das informações do buffet (o texto que a IA lê) */
export function appendTaughtAnswer(info: string | null, reason: string, answer: string): string {
  const line = `Sobre "${reason}": ${answer.trim()}`;
  const base = (info || "").trim();
  return base ? `${base}\n${line}` : `${OUTROS}: ${line}`;
}

/**
 * Por que a IA passou clientes para a equipe (últimos 30 dias), lido do
 * histórico do lead que a IA já grava ("Transferido para a equipe"). Quando
 * era uma dúvida que a IA não sabia, o dono escreve a resposta e ela entra nas
 * informações do buffet — da próxima vez a IA já responde.
 */
export function AiHandoffReasons({ companyId }: { companyId: string }) {
  const [items, setItems] = useState<Handoff[] | null>(null);
  const [taught, setTaught] = useState<string[]>(() => readTaught(companyId));
  const [openId, setOpenId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - DAYS * 86400000).toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data } = await sb.from("lead_history").select("id, created_at, lead_id, new_value")
      .eq("company_id", companyId).eq("user_name", "IA (beta)").eq("action", "Transferido para a equipe")
      .gte("created_at", since).order("created_at", { ascending: false }).limit(50);
    const rows = (data || []) as Array<{ id: string; created_at: string; lead_id: string | null; new_value: string | null }>;
    const ids = [...new Set(rows.map((r) => r.lead_id).filter(Boolean))] as string[];
    const names: Record<string, string> = {};
    if (ids.length) {
      const { data: leads } = await sb.from("campaign_leads").select("id, name").in("id", ids);
      for (const l of (leads || []) as Array<{ id: string; name: string | null }>) if (l.name) names[l.id] = l.name;
    }
    setItems(rows.map((r) => ({
      id: r.id, created_at: r.created_at, lead_id: r.lead_id,
      reason: (r.new_value || "").replace(/^Motivo:\s*/i, "").trim() || "sem motivo informado",
      name: r.lead_id ? names[r.lead_id] || null : null,
    })));
  }, [companyId]);
  useEffect(() => { load(); }, [load]);

  const teach = async (item: Handoff) => {
    if (answer.trim().length < 3) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data } = await sb.from("ai_agent_settings").select("extra_instructions").eq("company_id", companyId).maybeSingle();
    const { error } = data
      ? await sb.from("ai_agent_settings").update({ extra_instructions: appendTaughtAnswer(data.extra_instructions, item.reason, answer) }).eq("company_id", companyId)
      : { error: { message: "Responda as perguntas da IA primeiro." } };
    setSaving(false);
    if (error) {
      toast({ title: "Não consegui salvar", description: error.message, variant: "destructive" });
      return;
    }
    const next = [...taught, item.id];
    setTaught(next);
    writeTaught(companyId, next);
    setOpenId(null);
    setAnswer("");
    toast({ title: "Pronto! A IA já sabe responder isso" });
  };

  if (!items) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Toda vez que a IA passa um cliente para a equipe, ela anota o motivo. Se foi uma dúvida que ela não sabia,
        escreva a resposta: ela passa a fazer parte das informações da IA e da próxima vez ela mesma responde.
      </p>
      {items.length === 0 ? (
        <p className="rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">Nos últimos {DAYS} dias a IA não passou nenhum cliente para a equipe.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const done = taught.includes(it.id);
            return (
              <li key={it.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm">{it.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(it.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      {it.name ? ` · ${it.name}` : ""}
                    </p>
                  </div>
                  {done ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Ensinado</span>
                  ) : openId !== it.id && (
                    <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => { setOpenId(it.id); setAnswer(""); }}>
                      <GraduationCap className="mr-1.5 h-3.5 w-3.5" /> Ensinar
                    </Button>
                  )}
                </div>
                {openId === it.id && (
                  <div className="space-y-2">
                    <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} className="text-base" maxLength={500}
                      aria-label="Resposta para a IA" placeholder="Escreva a resposta como você explicaria para a cliente. Ex.: Sim, pode levar o pet, desde que fique na coleira." />
                    <p className="text-[11px] text-muted-foreground">Não escreva valores aqui: valores ficam só na tabela de Valores.</p>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" disabled={saving || answer.trim().length < 3} onClick={() => teach(it)}>
                        {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Salvar resposta
                      </Button>
                      <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => setOpenId(null)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
