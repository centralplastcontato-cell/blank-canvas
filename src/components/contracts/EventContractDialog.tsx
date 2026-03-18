/**
 * EventContractDialog — Generates a contract for a specific event
 * using the pre-matched contract model. Pulls data from:
 * - company_events (festa + payment)
 * - client_data_requests (contratante)
 * - campaign_leads (lead info)
 * - contract_models (template)
 */
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, AlertTriangle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import { resolveSystemVariables, findUnresolvedVariables, type VariableContext } from "@/lib/template-resolver";
import { ContractPreviewPrint } from "./ContractPreviewPrint";
import { ContractDocumentViewer } from "./ContractDocumentViewer";
import { logContractAction } from "./contractAuditHelpers";
import { format } from "date-fns";

interface EventContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  modelId: string;
  userId: string;
}

export function EventContractDialog({ open, onOpenChange, eventId, modelId, userId }: EventContractDialogProps) {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);

  const [model, setModel] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [clientData, setClientData] = useState<Record<string, string>>({});
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    if (!open || !currentCompany?.id) return;
    setLoading(true);

    const fetchAll = async () => {
      // Fetch model, event, client data in parallel
      const [modelRes, eventRes] = await Promise.all([
        (supabase as any).from("contract_models").select("*").eq("id", modelId).single(),
        supabase.from("company_events").select("*").eq("id", eventId).single(),
      ]);

      const modelData = modelRes.data;
      const evData = eventRes.data;
      setModel(modelData);
      setEventData(evData);
      setPaymentDetails(evData?.payment_details);

      // Fetch lead + client data
      const [leadRes, clientReqRes] = await Promise.all([
        evData?.lead_id
          ? supabase.from("campaign_leads").select("id, name, whatsapp, month, guests, unit").eq("id", evData.lead_id).single()
          : Promise.resolve({ data: null }),
        supabase
          .from("client_data_requests")
          .select("client_data")
          .eq("event_id", eventId)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      setLeadData(leadRes.data);
      const cd = clientReqRes.data?.[0]?.client_data as Record<string, string> | null;
      setClientData(cd || {});
      setLoading(false);
    };

    fetchAll();
  }, [open, eventId, modelId, currentCompany?.id]);

  // Build variable context merging all sources
  const variableContext: VariableContext = useMemo(() => {
    const pd = paymentDetails as any;
    const paymentDesc = pd
      ? [
          pd.entrada_valor ? `Entrada: R$ ${Number(pd.entrada_valor).toLocaleString("pt-BR")}${pd.entrada_forma ? ` (${pd.entrada_forma})` : ""}` : "",
          pd.saldo_valor ? `Saldo: R$ ${Number(pd.saldo_valor).toLocaleString("pt-BR")}${pd.saldo_forma ? ` (${pd.saldo_forma})` : ""}` : "",
          pd.parcelas ? `${pd.parcelas}x` : "",
          pd.observacoes_pagamento || "",
        ].filter(Boolean).join(" | ")
      : "";

    return {
      lead: leadData ? {
        name: leadData.name, whatsapp: leadData.whatsapp, guests: leadData.guests,
        unit: leadData.unit, month: leadData.month,
      } : undefined,
      company: { name: currentCompany?.name },
      event: eventData ? {
        date: eventData.event_date ? format(new Date(eventData.event_date + "T12:00:00"), "dd/MM/yyyy") : "",
        time: eventData.start_time || "", end_time: eventData.end_time || "",
        package_name: eventData.package_name || "", value: eventData.total_value,
        guest_count: eventData.guest_count, unit: eventData.unit || "",
        event_type: eventData.event_type || "",
      } : undefined,
      contract: {
        responsible_name: clientData.nome || leadData?.name || "",
        cpf: clientData.cpf || "", rg: clientData.rg || "", email: clientData.email || "",
        address: clientData.endereco || "", numero: clientData.numero || "",
        complemento: clientData.complemento || "", bairro: clientData.bairro || "",
        cidade: clientData.cidade || "", cep: clientData.cep || "",
        nome_aniversariante: clientData.nome_aniversariante || "",
        idade_aniversariante: clientData.idade_aniversariante || "",
        data_nascimento: clientData.nascimento || "",
        nomes_pais: clientData.nomes_pais || "",
        value: eventData?.total_value ? `R$ ${Number(eventData.total_value).toLocaleString("pt-BR")}` : "",
        valor_sinal: pd?.entrada_valor ? `R$ ${Number(pd.entrada_valor).toLocaleString("pt-BR")}` : "",
        valor_restante: pd?.saldo_valor ? `R$ ${Number(pd.saldo_valor).toLocaleString("pt-BR")}` : "",
        forma_pagamento: paymentDesc || eventData?.payment_method || "",
        date: new Date().toLocaleDateString("pt-BR"),
      },
    };
  }, [leadData, eventData, clientData, paymentDetails, currentCompany?.name]);

  const renderedContent = useMemo(() => {
    if (!model) return "";
    return resolveSystemVariables(model.conteudo_template, variableContext);
  }, [model, variableContext]);

  const unresolvedVars = useMemo(() => {
    if (!model) return [];
    return findUnresolvedVariables(model.conteudo_template, variableContext);
  }, [model, variableContext]);

  const handleGenerate = async () => {
    if (!currentCompany?.id || !model) return;
    setSaving(true);

    try {
      // Save version snapshot
      const { data: versionData } = await (supabase as any).from("contract_model_versions").insert({
        model_id: model.id, company_id: currentCompany.id,
        versao: model.versao, conteudo_template: model.conteudo_template,
        tipo_evento: model.tipo_evento, nome_modelo: model.nome_modelo,
        changed_by: userId,
      }).select("id").single();

      // Create frozen contract
      const docName = `Contrato — ${clientData.nome || leadData?.name || eventData?.title || "Lead"} — ${eventData?.event_date ? format(new Date(eventData.event_date + "T12:00:00"), "dd/MM/yyyy") : ""}`;

      const { data: contractResult, error } = await (supabase as any).from("generated_contracts").insert({
        company_id: currentCompany.id,
        lead_id: leadData?.id || null,
        event_id: eventId,
        template_id: model.id,
        template_version_id: versionData?.id || null,
        nome_documento: docName,
        tipo_evento: model.tipo_evento,
        conteudo_renderizado: renderedContent,
        dados_utilizados: {
          lead: leadData,
          event: eventData,
          client: clientData,
          payment: paymentDetails,
          company: { name: currentCompany.name },
        },
        status: "gerado",
        created_by: userId,
      }).select("id").single();

      if (error) throw error;

      await logContractAction(currentCompany.id, contractResult?.id, model.id, "contract_generated", userId, {
        event_id: eventId,
        lead_name: leadData?.name,
        template_version: model.versao,
        source: "event_detail",
      });

      toast({ title: "Contrato gerado com sucesso! ✅" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao gerar contrato", description: err.message, variant: "destructive" });
      await logContractAction(currentCompany.id, null, model?.id, "generation_failed", userId, { error: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-muted/30">
          <DialogTitle className="text-lg font-bold">Gerar Contrato</DialogTitle>
          {model && (
            <p className="text-[13px] text-muted-foreground mt-1">
              Modelo: <span className="font-medium text-foreground/70">{model.nome_modelo}</span> — v{model.versao}
            </p>
          )}
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5 space-y-4" style={{ maxHeight: "calc(90vh - 200px)" }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Unresolved variables warning */}
              {unresolvedVars.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-300/30">
                  <div className="flex items-center gap-2 text-amber-700 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-semibold">Variáveis não resolvidas</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {unresolvedVars.map((v) => (
                      <Badge key={v} variant="outline" className="text-xs border-amber-400 text-amber-700 font-mono">{`{{${v}}}`}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    O contrato será gerado com placeholders visíveis.
                  </p>
                </div>
              )}

              {/* Preview */}
              <ContractPreviewPrint
                content={renderedContent}
                companyName={currentCompany?.name || ""}
                companyLogo={currentCompany?.logo_url || undefined}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-border/40 bg-muted/20">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setFullPreviewOpen(true)} disabled={loading} className="gap-2">
              <Eye className="h-4 w-4" /> Visualizar
            </Button>
            <Button onClick={handleGenerate} disabled={saving || loading} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Gerar Contrato
            </Button>
          </div>
        </div>

        {!loading && (
          <ContractDocumentViewer
            open={fullPreviewOpen}
            onOpenChange={setFullPreviewOpen}
            content={renderedContent}
            companyName={currentCompany?.name || ""}
            companyLogo={currentCompany?.logo_url || undefined}
            mode="preview"
            unresolvedVars={unresolvedVars}
            missingRequired={[]}
            onGenerate={handleGenerate}
            generating={saving}
            canGenerate={true}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
