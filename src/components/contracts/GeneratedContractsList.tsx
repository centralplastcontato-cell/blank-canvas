import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Loader2, FileText, Eye, Ban, History, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContractGenerator } from "./ContractGenerator";
import { ContractDocumentViewer } from "./ContractDocumentViewer";
import { toast } from "@/hooks/use-toast";
import { logContractAction, sendContractViaWhatsApp } from "./contractAuditHelpers";

interface GeneratedContract {
  id: string;
  nome_documento: string;
  tipo_evento: string | null;
  status: string;
  conteudo_renderizado: string;
  dados_utilizados: any;
  created_at: string;
  lead_id: string | null;
  event_id: string | null;
  template_id: string | null;
  created_by: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  gerado: "bg-blue-500/15 text-blue-700 border-blue-300",
  enviado: "bg-amber-500/15 text-amber-700 border-amber-300",
  assinado: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  cancelado: "bg-red-500/15 text-red-700 border-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho", gerado: "Gerado", enviado: "Enviado", assinado: "Assinado", cancelado: "Cancelado",
};

interface Props { userId: string; }

export function GeneratedContractsList({ userId }: Props) {
  const { currentCompany } = useCompany();
  const [contracts, setContracts] = useState<GeneratedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [viewContract, setViewContract] = useState<GeneratedContract | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAudit, setShowAudit] = useState<string | null>(null);

  const fetchContracts = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("generated_contracts")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("created_at", { ascending: false });
    setContracts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchContracts(); }, [currentCompany?.id]);

  const handleCancel = async (contract: GeneratedContract) => {
    if (!currentCompany?.id) return;
    const { error } = await (supabase as any)
      .from("generated_contracts")
      .update({ status: "cancelado" })
      .eq("id", contract.id);
    if (error) {
      toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contrato cancelado" });
      await logContractAction(currentCompany.id, contract.id, contract.template_id, "contract_cancelled", userId);
      fetchContracts();
    }
  };

  const handleShowAudit = async (contractId: string) => {
    if (!currentCompany?.id) return;
    setShowAudit(contractId);
    const { data } = await (supabase as any)
      .from("contract_audit_logs")
      .select("*")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false });
    setAuditLogs(data || []);
  };

  const [sendingWA, setSendingWA] = useState<string | null>(null);

  const handleSendWhatsApp = async (contract: GeneratedContract) => {
    if (!currentCompany?.id) return;
    // Resolve lead_id: direct or via event
    let leadId = contract.lead_id;
    if (!leadId && contract.event_id) {
      const { data: ev } = await supabase.from("company_events").select("lead_id").eq("id", contract.event_id).single();
      leadId = ev?.lead_id || null;
    }
    if (!leadId) {
      toast({ title: "Lead não vinculado", description: "Este contrato não possui um lead associado para envio.", variant: "destructive" });
      return;
    }
    setSendingWA(contract.id);
    const result = await sendContractViaWhatsApp(currentCompany.id, leadId, contract.conteudo_renderizado, contract.nome_documento);
    if (result.success) {
      toast({ title: "Contrato enviado via WhatsApp ✅" });
      await logContractAction(currentCompany.id, contract.id, contract.template_id, "contract_sent_whatsapp", userId, { lead_id: leadId });
    } else {
      toast({ title: "Erro ao enviar", description: result.error, variant: "destructive" });
    }
    setSendingWA(null);
  };

  const ACTION_LABELS: Record<string, string> = {
    contract_generated: "Contrato gerado",
    contract_cancelled: "Contrato cancelado",
    contract_downloaded: "Contrato baixado",
    generation_failed: "Falha na geração",
    contract_sent_whatsapp: "Enviado via WhatsApp",
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground hidden md:block">Contratos gerados a partir dos modelos</p>
          <Button onClick={() => setGeneratorOpen(true)} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Gerar Contrato</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : contracts.length === 0 ? (
          <Card><CardContent className="p-8 text-center space-y-3">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nenhum contrato gerado ainda.</p>
            <Button onClick={() => setGeneratorOpen(true)}><Plus className="h-4 w-4 mr-2" /> Gerar Primeiro Contrato</Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {contracts.map(c => {
              const leadName = c.dados_utilizados?.lead?.name || "—";
              const isCancelled = c.status === "cancelado";
              return (
                <Card key={c.id} className={`border-border/40 ${isCancelled ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold truncate">{c.nome_documento}</h3>
                          <Badge className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>{STATUS_LABELS[c.status] || c.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Contratante: {leadName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Gerado em {format(new Date(c.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t border-border/40 pt-3 mt-3 flex-wrap">
                      <Button variant="outline" size="sm" className="h-8 text-xs rounded-full px-3.5 gap-1.5" onClick={() => setViewContract(c)}>
                        <Eye className="h-3.5 w-3.5" /> Visualizar
                      </Button>
                      {!isCancelled && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs rounded-full px-3.5 gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => handleSendWhatsApp(c)}
                          disabled={sendingWA === c.id}
                        >
                          {sendingWA === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                          WhatsApp
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-8 text-xs rounded-full px-3.5 gap-1.5" onClick={() => handleShowAudit(c.id)}>
                        <History className="h-3.5 w-3.5" /> Histórico
                      </Button>
                      {!isCancelled && (
                        <Button variant="outline" size="sm" className="h-8 text-xs rounded-full px-3.5 gap-1.5 text-destructive hover:text-destructive" onClick={() => handleCancel(c)}>
                          <Ban className="h-3.5 w-3.5" /> Cancelar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Generator Dialog */}
      <Dialog open={generatorOpen} onOpenChange={setGeneratorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <ContractGenerator
            userId={userId}
            onClose={() => { setGeneratorOpen(false); fetchContracts(); }}
          />
        </DialogContent>
      </Dialog>

      {/* View Contract - Full Document Viewer */}
      {viewContract && (
        <ContractDocumentViewer
          open={!!viewContract}
          onOpenChange={() => setViewContract(null)}
          content={viewContract.conteudo_renderizado}
          companyName={currentCompany?.name || ""}
          companyLogo={currentCompany?.logo_url || undefined}
          mode="generated"
          meta={{
            modelName: viewContract.nome_documento,
            status: viewContract.status,
            generatedAt: viewContract.created_at,
            leadName: viewContract.dados_utilizados?.lead?.name,
            eventDate: viewContract.dados_utilizados?.event?.date,
            eventType: viewContract.tipo_evento || undefined,
          }}
          contractId={viewContract.id}
          leadId={viewContract.lead_id || undefined}
          companyId={currentCompany?.id}
          userId={userId}
        />
      )}

      {/* Audit Log Sheet */}
      {showAudit && (
        <Sheet open={!!showAudit} onOpenChange={() => setShowAudit(null)}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader className="pb-4 border-b border-border/40">
              <SheetTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Histórico do Contrato</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro de atividade encontrado.</p>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-lg border border-border/40 bg-card">
                    <p className="text-sm font-medium">{ACTION_LABELS[log.action] || log.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {log.details?.error && (
                      <p className="text-xs text-destructive mt-1">{log.details.error}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
