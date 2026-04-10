import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Loader2, FileText, Eye, Ban, History, MessageCircle, FileSignature } from "lucide-react";
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
  aguardando_assinatura: "bg-purple-500/15 text-purple-700 border-purple-300",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho", gerado: "Gerado", enviado: "Enviado", assinado: "Assinado ✅", cancelado: "Cancelado",
  aguardando_assinatura: "Aguardando Assinatura",
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
  const [sendingSign, setSendingSign] = useState<string | null>(null);

  const handleSendWhatsApp = async (contract: GeneratedContract) => {
    if (!currentCompany?.id) return;
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

  const handleSendForSignature = async (contract: GeneratedContract) => {
    if (!currentCompany?.id) return;
    let leadId = contract.lead_id;
    if (!leadId && contract.event_id) {
      const { data: ev } = await supabase.from("company_events").select("lead_id").eq("id", contract.event_id).single();
      leadId = ev?.lead_id || null;
    }
    if (!leadId) {
      toast({ title: "Lead não vinculado", description: "Este contrato não possui um lead associado.", variant: "destructive" });
      return;
    }
    // Get lead info
    const { data: lead } = await supabase.from("campaign_leads").select("name, whatsapp").eq("id", leadId).single();
    if (!lead?.whatsapp) {
      toast({ title: "Lead sem WhatsApp cadastrado", variant: "destructive" });
      return;
    }
    setSendingSign(contract.id);
    try {
      const token = crypto.randomUUID();
      // Create signature record
      const { error: sigErr } = await (supabase as any).from("contract_signatures").insert({
        contract_id: contract.id,
        company_id: currentCompany.id,
        signer_name: lead.name,
        signer_phone: lead.whatsapp,
        token,
      });
      if (sigErr) {
        toast({ title: "Erro ao criar assinatura", description: sigErr.message, variant: "destructive" });
        return;
      }

      // Build sign URL
      const baseUrl = window.location.origin;
      const signUrl = `${baseUrl}/assinar-contrato/${token}`;

      // Send link via WhatsApp
      const { data: instances } = await (supabase as any)
        .from("wapi_instances")
        .select("instance_id, instance_token")
        .eq("company_id", currentCompany.id)
        .eq("status", "connected")
        .limit(1);
      const instance = instances?.[0];
      let signatureSent = false;
      if (instance) {
        const phone = lead.whatsapp.replace(/\D/g, "");
        const msg = `📄 *${contract.nome_documento}*\n\nOlá ${lead.name}! Seu contrato está pronto para assinatura digital.\n\nAcesse o link abaixo para ler e assinar:\n${signUrl}\n\n_${currentCompany.name}_`;
        const { data: sendResult, error: sendErr } = await supabase.functions.invoke("wapi-send", {
          body: { action: "send-text", instanceId: instance.instance_id, instanceToken: instance.instance_token, phone, message: msg },
        });
        const sendPayload = sendResult as { success?: boolean; error?: string } | null;
        if (sendErr || sendPayload?.success === false) {
          toast({
            title: "Erro ao enviar link",
            description: sendErr?.message || sendPayload?.error || "Falha no envio pelo WhatsApp.",
            variant: "destructive",
          });
          // Rollback: remove signature record since send failed
          await (supabase as any).from("contract_signatures").delete().eq("token", token);
        } else {
          signatureSent = true;
          // Only update status AFTER confirmed send success
          await (supabase as any).from("generated_contracts").update({ status: "aguardando_assinatura", signature_token: token }).eq("id", contract.id);
          toast({ title: "Link de assinatura enviado via WhatsApp ✅" });
        }
      } else {
        // No instance — update status and copy link as fallback
        await (supabase as any).from("generated_contracts").update({ status: "aguardando_assinatura", signature_token: token }).eq("id", contract.id);
        await navigator.clipboard.writeText(signUrl);
        toast({ title: "Link copiado!", description: "Nenhuma instância WhatsApp conectada. O link foi copiado para a área de transferência." });
        signatureSent = true;
      }
      if (signatureSent) {
        await logContractAction(currentCompany.id, contract.id, contract.template_id, "contract_sent_for_signature", userId, { lead_id: leadId });
      }
      fetchContracts();
    } finally {
      setSendingSign(null);
    }
  };

  const ACTION_LABELS: Record<string, string> = {
    contract_generated: "Contrato gerado",
    contract_cancelled: "Contrato cancelado",
    contract_downloaded: "Contrato baixado",
    generation_failed: "Falha na geração",
    contract_sent_whatsapp: "Enviado via WhatsApp",
    contract_sent_for_signature: "Enviado para assinatura",
    contract_signed: "Assinado digitalmente",
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
                      {!isCancelled && c.status !== "assinado" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs rounded-full px-3.5 gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50"
                          onClick={() => handleSendForSignature(c)}
                          disabled={sendingSign === c.id}
                        >
                          {sendingSign === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5" />}
                          Enviar p/ Assinatura
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
        <ContractDocumentViewerWithSignature
          contract={viewContract}
          companyName={currentCompany?.name || ""}
          companyLogo={getCompanyLogoOverride(currentCompany?.slug, currentCompany?.logo_url) || undefined}
          companyId={currentCompany?.id}
          userId={userId}
          onClose={() => setViewContract(null)}
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

/** Wrapper that fetches signature data before rendering the viewer */
function ContractDocumentViewerWithSignature({
  contract, companyName, companyLogo, companyId, userId, onClose,
}: {
  contract: GeneratedContract;
  companyName: string;
  companyLogo?: string;
  companyId?: string;
  userId: string;
  onClose: () => void;
}) {
  const [sigInfo, setSigInfo] = useState<any>(null);

  useEffect(() => {
    if (contract.status === "assinado" && companyId) {
      (supabase as any)
        .from("contract_signatures")
        .select("signature_image_url, signed_at, document_hash, ip_address, signer_name")
        .eq("contract_id", contract.id)
        .eq("status", "signed")
        .limit(1)
        .then(({ data }: any) => {
          if (data?.[0]) setSigInfo(data[0]);
        });
    }
  }, [contract.id, contract.status, companyId]);

  return (
    <ContractDocumentViewer
      open={true}
      onOpenChange={() => onClose()}
      content={contract.conteudo_renderizado}
      companyName={companyName}
      companyLogo={companyLogo}
      mode="generated"
      meta={{
        modelName: contract.nome_documento,
        status: contract.status,
        generatedAt: contract.created_at,
        leadName: contract.dados_utilizados?.lead?.name,
        eventDate: contract.dados_utilizados?.event?.date,
        eventType: contract.tipo_evento || undefined,
      }}
      contractId={contract.id}
      leadId={contract.lead_id || contract.dados_utilizados?.lead?.id || undefined}
      companyId={companyId}
      userId={userId}
      signatureInfo={sigInfo ? {
        signatureImageUrl: sigInfo.signature_image_url,
        signedAt: sigInfo.signed_at,
        documentHash: sigInfo.document_hash,
        ipAddress: sigInfo.ip_address,
        signerName: sigInfo.signer_name,
      } : undefined}
    />
  );
}
