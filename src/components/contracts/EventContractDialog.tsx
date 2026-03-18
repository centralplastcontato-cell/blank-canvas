/**
 * EventContractDialog — Full-screen preview + generation flow.
 * Opens directly as a ContractDocumentViewer in "preview" mode.
 * On confirm, freezes contract as immutable snapshot.
 */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import { resolveSystemVariables, findUnresolvedVariables, type VariableContext } from "@/lib/template-resolver";
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

  const [model, setModel] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [clientData, setClientData] = useState<Record<string, string>>({});
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    if (!open || !currentCompany?.id) return;
    setLoading(true);

    const fetchAll = async () => {
      const [modelRes, eventRes] = await Promise.all([
        (supabase as any).from("contract_models").select("*").eq("id", modelId).single(),
        supabase.from("company_events").select("*").eq("id", eventId).single(),
      ]);

      const modelData = modelRes.data;
      const evData = eventRes.data;
      setModel(modelData);
      setEventData(evData);
      setPaymentDetails(evData?.payment_details);

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

  // Determine required fields that are missing for blocking generation
  const missingRequired = useMemo(() => {
    const missing: string[] = [];
    if (!clientData.nome && !leadData?.name) missing.push("Nome do contratante");
    if (!clientData.cpf) missing.push("CPF");
    if (!eventData?.event_date) missing.push("Data da festa");
    if (!eventData?.total_value) missing.push("Valor total");
    if (!eventData?.package_name) missing.push("Pacote");
    return missing;
  }, [clientData, leadData, eventData]);

  const canGenerate = missingRequired.length === 0;

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

      toast({ title: "Contrato gerado com sucesso! ✅", description: "O contrato foi congelado e está disponível para visualização e impressão." });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao gerar contrato", description: err.message, variant: "destructive" });
      await logContractAction(currentCompany.id, null, model?.id, "generation_failed", userId, { error: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  if (loading) {
    return (
      <ContractDocumentViewer
        open={open}
        onOpenChange={onOpenChange}
        content=""
        companyName={currentCompany?.name || ""}
        mode="preview"
        meta={{ modelName: "Carregando..." }}
        generating={false}
        canGenerate={false}
      />
    );
  }

  return (
    <ContractDocumentViewer
      open={open}
      onOpenChange={onOpenChange}
      content={renderedContent}
      companyName={currentCompany?.name || ""}
      companyLogo={currentCompany?.logo_url || undefined}
      mode="preview"
      meta={{
        modelName: model?.nome_modelo,
        templateVersion: model?.versao,
        leadName: clientData.nome || leadData?.name,
        eventDate: eventData?.event_date ? format(new Date(eventData.event_date + "T12:00:00"), "dd/MM/yyyy") : undefined,
        eventType: eventData?.event_type,
      }}
      unresolvedVars={unresolvedVars}
      missingRequired={missingRequired}
      onGenerate={handleGenerate}
      generating={saving}
      canGenerate={canGenerate}
    />
  );
}
