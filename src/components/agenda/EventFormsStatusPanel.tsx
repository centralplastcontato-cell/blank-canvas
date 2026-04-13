import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, ClipboardList, UtensilsCrossed, Star, CheckCircle2, Clock, Eye, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface FormStatus {
  type: string;
  label: string;
  icon: React.ElementType;
  sent: boolean;
  hasResponse: boolean;
  responseCount: number;
  responses: Array<{ id: string; answers: any; respondent_name: string | null; created_at: string }>;
}

interface EventFormsStatusPanelProps {
  eventId: string;
  companyId: string;
  leadId?: string | null;
}

const FORM_TYPES = [
  { type: "prefesta", label: "Pré-Festa", icon: ClipboardList, responseTable: "prefesta_responses" },
  { type: "cardapio", label: "Cardápio", icon: UtensilsCrossed, responseTable: "cardapio_responses" },
  { type: "contrato", label: "Dados Complementares", icon: FileText, responseTable: "contrato_responses" },
  { type: "avaliacao", label: "Avaliação", icon: Star, responseTable: "evaluation_responses" },
];

export function EventFormsStatusPanel({ eventId, companyId, leadId }: EventFormsStatusPanelProps) {
  const [formStatuses, setFormStatuses] = useState<FormStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingResponses, setViewingResponses] = useState<FormStatus | null>(null);

  const fetchStatuses = useCallback(async () => {
    if (!eventId || !companyId) return;
    setLoading(true);

    try {
      // 1. Check sent status from lead_history
      const { data: historyData } = await supabase
        .from("lead_history")
        .select("details")
        .eq("action", "form_sent_whatsapp")
        .contains("details", JSON.stringify({ event_id: eventId }));

      const sentTypes = new Set<string>();
      (historyData || []).forEach((row: any) => {
        const d = typeof row.details === "string" ? JSON.parse(row.details) : row.details;
        if (d?.form_type) sentTypes.add(d.form_type);
      });

      // 2. Check responses for each form type
      const statuses: FormStatus[] = [];

      for (const ft of FORM_TYPES) {
        let responses: any[] = [];

        if (ft.responseTable === "prefesta_responses" || ft.responseTable === "evaluation_responses") {
          const { data } = await (supabase as any)
            .from(ft.responseTable)
            .select("id, answers, respondent_name, created_at")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });
          responses = data || [];
        } else if (ft.responseTable === "cardapio_responses") {
          const { data } = await supabase
            .from("cardapio_responses")
            .select("id, answers, respondent_name, created_at")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });
          responses = data || [];
        } else if (ft.responseTable === "contrato_responses") {
          // Client data requests
          const { data } = await (supabase as any)
            .from("client_data_requests")
            .select("id, client_data, completed_at, created_at, status")
            .eq("event_id", eventId)
            .eq("status", "completed")
            .order("created_at", { ascending: false });
          responses = (data || []).map((d: any) => ({
            id: d.id,
            answers: d.client_data,
            respondent_name: null,
            created_at: d.completed_at || d.created_at,
          }));
        }

        statuses.push({
          type: ft.type,
          label: ft.label,
          icon: ft.icon,
          sent: sentTypes.has(ft.type),
          hasResponse: responses.length > 0,
          responseCount: responses.length,
          responses,
        });
      }

      setFormStatuses(statuses);
    } finally {
      setLoading(false);
    }
  }, [eventId, companyId]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Formulários</p>
        </div>
        <div className="p-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Formulários</p>
        </div>
        <div className="p-3 space-y-1.5">
          {formStatuses.map((fs) => {
            const Icon = fs.icon;
            return (
              <div key={fs.type} className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  fs.hasResponse ? "bg-emerald-500/15" : fs.sent ? "bg-amber-500/15" : "bg-muted"
                )}>
                  <Icon className={cn(
                    "h-3.5 w-3.5",
                    fs.hasResponse ? "text-emerald-600" : fs.sent ? "text-amber-600" : "text-muted-foreground"
                  )} />
                </div>
                <span className="text-xs font-medium flex-1 text-foreground">{fs.label}</span>
                
                {fs.hasResponse ? (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-700 border-emerald-300 gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Respondido
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-primary hover:text-primary/80"
                      onClick={() => setViewingResponses(fs)}
                      title="Ver respostas"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : fs.sent ? (
                  <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-700 border-amber-300 gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    Enviado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] text-muted-foreground gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    Pendente
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Response Viewer Dialog */}
      <Dialog open={!!viewingResponses} onOpenChange={(o) => !o && setViewingResponses(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {viewingResponses && <viewingResponses.icon className="h-4 w-4 text-primary" />}
              Respostas — {viewingResponses?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewingResponses?.responses.map((resp) => (
              <div key={resp.id} className="rounded-lg border border-border/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  {resp.respondent_name && (
                    <span className="text-xs font-medium text-foreground">{resp.respondent_name}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(resp.created_at), "dd/MM/yyyy 'às' HH:mm")}
                  </span>
                </div>
                <div className="text-xs space-y-1.5">
                  {resp.answers && typeof resp.answers === "object" && !Array.isArray(resp.answers) ? (
                    Object.entries(resp.answers).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-muted-foreground font-medium min-w-[100px]">{key}:</span>
                        <span className="text-foreground">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                      </div>
                    ))
                  ) : Array.isArray(resp.answers) ? (
                    resp.answers.map((item: any, idx: number) => (
                      <div key={idx} className="rounded bg-muted/30 p-2">
                        {typeof item === "object" ? (
                          Object.entries(item).map(([k, v]) => (
                            <div key={k} className="flex gap-2">
                              <span className="text-muted-foreground font-medium">{k}:</span>
                              <span className="text-foreground">{String(v)}</span>
                            </div>
                          ))
                        ) : (
                          <span>{String(item)}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground italic">Sem dados</span>
                  )}
                </div>
              </div>
            ))}
            {viewingResponses?.responses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma resposta encontrada.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
