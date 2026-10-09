import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useLeadInsights } from "@/hooks/useLeadInsights";
import { INSIGHT_REASONS, type CountRow } from "@/lib/leadInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Sparkles, MessageSquare, HelpCircle, ShieldAlert, Send, Loader2, X } from "lucide-react";

const VISIBLE = 10;

interface MotivosTabProps {
  selectedUnit?: string;
  isAdmin: boolean;
}

export function MotivosTab({ selectedUnit, isAdmin }: MotivosTabProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  const { data, isLoading, isError } = useLeadInsights(selectedUnit);
  const [running, setRunning] = useState<"analyze" | "summary" | null>(null);
  const [reasonFilter, setReasonFilter] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const run = async (sendSummary: boolean) => {
    if (!currentCompany?.id) return;
    setRunning(sendSummary ? "summary" : "analyze");
    const { data: res, error } = await supabase.functions.invoke("weekly-insights", {
      body: { company_id: currentCompany.id, send_summary: sendSummary },
    });
    setRunning(null);
    if (error || res?.error) {
      toast({ title: "Não consegui analisar", description: res?.error || error?.message, variant: "destructive" });
      return;
    }
    const done = (res.analyzed || 0) + (res.quick || 0);
    const parts = [done === 0 ? "Nenhuma conversa nova para analisar." : `${done} ${done === 1 ? "conversa analisada" : "conversas analisadas"}.`];
    if (res.pending > 0) parts.push(`Faltam ${res.pending} — clique de novo para continuar.`);
    if (res.failed > 0) parts.push(`${res.failed} deram erro.`);
    if (res.summary) parts.push(res.summary.sent ? "Resumo enviado para o seu WhatsApp." : `Resumo não enviado: ${res.summary.error}`);
    toast({ title: "Análise concluída", description: parts.join(" ") });
    queryClient.invalidateQueries({ queryKey: ["lead-insights"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Erro ao carregar a análise. Tente novamente.</p>
        </CardContent>
      </Card>
    );
  }

  const rows = reasonFilter ? data.rows.filter((r) => r.motivo === reasonFilter) : data.rows;
  const visible = showAll ? rows : rows.slice(0, VISIBLE);
  const total = data.rows.length;

  return (
    <div className="space-y-4">
      {/* Cabeçalho com as ações */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">Por que os leads não fecharam</p>
              <p className="text-xs text-muted-foreground">
                A IA lê as conversas que pararam há 3 dias ou mais. Últimos 30 dias: {total} {total === 1 ? "conversa analisada" : "conversas analisadas"}.
                {data.lastRun?.summary_sent && ` Último resumo no WhatsApp: semana de ${data.lastRun.week_start.slice(8, 10)}/${data.lastRun.week_start.slice(5, 7)}.`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1.5" disabled={running !== null} onClick={() => run(false)}>
              {running === "analyze" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Analisar agora
            </Button>
            {isAdmin && (
              <Button size="sm" variant="outline" className="gap-1.5" disabled={running !== null} onClick={() => run(true)}>
                {running === "summary" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Resumo de teste no meu WhatsApp
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {total === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma conversa analisada ainda. Clique em "Analisar agora".</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Motivos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Motivos</CardTitle>
              <p className="text-xs text-muted-foreground">Toque em um motivo para ver as conversas dele.</p>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {data.reasons.map((r) => (
                <button
                  key={r.key}
                  onClick={() => { setReasonFilter(reasonFilter === r.key ? null : r.key); setShowAll(false); }}
                  className={`w-full flex items-center gap-2 sm:gap-3 p-2 rounded-lg border text-left transition-colors ${reasonFilter === r.key ? "border-primary bg-primary/5" : "bg-card/50 hover:bg-muted/50"}`}
                >
                  <span className="w-32 sm:w-56 shrink-0 text-sm font-medium truncate">{r.label}</span>
                  <span className="flex-1 h-5 rounded-full bg-muted/50 overflow-hidden">
                    <span className="block h-full rounded-full bg-violet-500/70" style={{ width: `${Math.max((r.count / total) * 100, 3)}%` }} />
                  </span>
                  <span className="w-20 text-right text-sm font-bold shrink-0">
                    {r.count} <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">({Math.round((r.count / total) * 100)}%)</span>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Perguntas e objeções */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CountCard title="O que mais perguntaram" icon={<HelpCircle className="h-4 w-4" />} rows={data.questions} total={total} empty="Nenhuma pergunta registrada." />
            <CountCard title="O que mais travou a venda" icon={<ShieldAlert className="h-4 w-4" />} rows={data.objections} total={total} empty="Nenhuma objeção registrada." />
          </div>

          {/* Conversas analisadas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Conversas analisadas
                {reasonFilter && (
                  <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setReasonFilter(null)}>
                    {INSIGHT_REASONS[reasonFilter as keyof typeof INSIGHT_REASONS] || reasonFilter}
                    <X className="h-3 w-3" />
                  </Badge>
                )}
                <Badge variant="outline" className="ml-auto">{rows.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {visible.map((r) => (
                  <div key={r.leadId} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-medium text-sm truncate">{r.name}</p>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-500/10 text-violet-700">
                          {INSIGHT_REASONS[r.motivo as keyof typeof INSIGHT_REASONS] || r.motivo}
                        </Badge>
                        {r.unit && <span className="text-[10px] text-muted-foreground">{r.unit}</span>}
                      </div>
                      {r.detalhe && <p className="text-xs text-muted-foreground">{r.detalhe}</p>}
                      {r.lastMessageAt && (
                        <p className="text-[10px] text-muted-foreground/70">
                          Última mensagem em {new Date(r.lastMessageAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="h-8 gap-1 shrink-0" onClick={() => navigate(`/atendimento?leadId=${r.leadId}`)}>
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Abrir conversa</span>
                      <span className="sm:hidden">Abrir</span>
                    </Button>
                  </div>
                ))}
              </div>
              {rows.length > VISIBLE && (
                <div className="pt-2 text-center">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Mostrar menos" : `Mostrar todas (${rows.length})`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function CountCard({ title, icon, rows, total, empty }: { title: string; icon: React.ReactNode; rows: CountRow[]; total: number; empty: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">{empty}</p>
        ) : (
          <div className="space-y-1.5">
            {rows.slice(0, 8).map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{r.label}</span>
                <span className="font-semibold shrink-0">
                  {r.count} <span className="text-xs text-muted-foreground font-normal">({Math.round((r.count / total) * 100)}% das conversas)</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
