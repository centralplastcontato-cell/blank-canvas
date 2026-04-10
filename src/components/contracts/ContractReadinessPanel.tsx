import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileSignature, CheckCircle2, AlertTriangle, Loader2, ChevronRight,
  User, CalendarDays, CreditCard, Package, FileText, XCircle, Eye, Printer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContractDocumentViewer } from "./ContractDocumentViewer";

interface ContractReadinessPanelProps {
  eventId: string;
  eventData: {
    title: string;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    event_type: string | null;
    guest_count: number | null;
    unit: string | null;
    package_name: string | null;
    total_value: number | null;
    lead_id?: string | null;
    payment_method?: string | null;
  };
  onGenerateContract: (modelId: string) => void;
}

interface ReadinessCheck {
  key: string;
  label: string;
  category: "festa" | "pagamento" | "contratante" | "modelo";
  ok: boolean;
  detail?: string;
}

interface ContractModel {
  id: string;
  nome_modelo: string;
  versao: number;
  tipo_evento: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  festa: CalendarDays,
  pagamento: CreditCard,
  contratante: User,
  modelo: FileText,
};

const CATEGORY_LABELS: Record<string, string> = {
  festa: "Dados da Festa",
  pagamento: "Pagamento",
  contratante: "Dados do Contratante",
  modelo: "Modelo de Contrato",
};

type ReadinessStatus = "ready" | "missing_data" | "missing_model" | "loading";

export function ContractReadinessPanel({ eventId, eventData, onGenerateContract }: ContractReadinessPanelProps) {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<Record<string, string> | null>(null);
  const [clientStatus, setClientStatus] = useState<string>("pending");
  const [allModels, setAllModels] = useState<ContractModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [existingContracts, setExistingContracts] = useState<any[]>([]);
  const [viewContract, setViewContract] = useState<any>(null);

  useEffect(() => {
    if (!currentCompany?.id || !eventId) return;
    setLoading(true);

    const fetchAll = async () => {
      const [clientReqRes, modelsRes, paymentRes, contractsRes] = await Promise.all([
        supabase
          .from("client_data_requests")
          .select("status, client_data")
          .eq("event_id", eventId)
          .order("created_at", { ascending: false })
          .limit(1),
        // Fetch ALL active models for this company
        (supabase as any)
          .from("contract_models")
          .select("id, nome_modelo, versao, tipo_evento")
          .eq("company_id", currentCompany.id)
          .eq("is_active", true)
          .order("tipo_evento")
          .order("versao", { ascending: false }),
        supabase
          .from("company_events")
          .select("payment_details, payment_method")
          .eq("id", eventId)
          .single(),
        (supabase as any)
          .from("generated_contracts")
          .select("id, nome_documento, status, created_at, conteudo_renderizado, dados_utilizados, tipo_evento")
          .eq("event_id", eventId)
          .neq("status", "cancelado"),
      ]);

      // Client data
      const cReq = clientReqRes.data?.[0];
      if (cReq) {
        setClientStatus(cReq.status);
        setClientData(cReq.client_data as Record<string, string> | null);
      } else {
        setClientStatus("pending");
        setClientData(null);
      }

      // All models
      const models: ContractModel[] = modelsRes.data || [];
      setAllModels(models);

      // Auto-select matching model by event_type, or first available
      const autoMatch = eventData.event_type
        ? models.find((m) => m.tipo_evento === eventData.event_type)
        : null;
      setSelectedModelId(autoMatch?.id || (models.length > 0 ? models[0].id : null));

      // Payment
      setPaymentDetails(paymentRes.data?.payment_details);

      // Existing contracts
      setExistingContracts(contractsRes.data || []);

      setLoading(false);
    };

    fetchAll();
  }, [currentCompany?.id, eventId, eventData.event_type]);

  const selectedModel = useMemo(() => {
    return allModels.find((m) => m.id === selectedModelId) || null;
  }, [allModels, selectedModelId]);

  const checks: ReadinessCheck[] = useMemo(() => {
    const result: ReadinessCheck[] = [];

    // Festa checks
    result.push({ key: "event_date", label: "Data da festa", category: "festa", ok: !!eventData.event_date });
    result.push({ key: "start_time", label: "Horário inicial", category: "festa", ok: !!eventData.start_time });
    result.push({ key: "end_time", label: "Horário final", category: "festa", ok: !!eventData.end_time });
    result.push({ key: "event_type", label: "Tipo de festa", category: "festa", ok: !!eventData.event_type });
    result.push({ key: "package_name", label: "Pacote", category: "festa", ok: !!eventData.package_name });
    result.push({ key: "guest_count", label: "Convidados", category: "festa", ok: !!eventData.guest_count });
    result.push({ key: "total_value", label: "Valor total", category: "festa", ok: eventData.total_value != null && eventData.total_value > 0 });

    // Pagamento checks
    result.push({ key: "payment_method", label: "Forma de pagamento", category: "pagamento", ok: !!eventData.payment_method });
    const pd = paymentDetails as any;
    const hasPaymentCondition = pd && (pd.entrada_valor || pd.saldo_valor || pd.observacoes_pagamento);
    result.push({ key: "payment_condition", label: "Condição de pagamento", category: "pagamento", ok: !!hasPaymentCondition });

    // Contratante checks
    const hasName = !!clientData?.nome;
    const hasCpf = !!clientData?.cpf;
    const hasEmail = !!clientData?.email;
    const hasAddress = !!(clientData?.endereco && clientData?.cidade);
    result.push({ key: "client_nome", label: "Nome completo", category: "contratante", ok: hasName, detail: clientStatus === "pending" ? "Formulário não enviado" : clientStatus === "sent" ? "Aguardando cliente" : undefined });
    result.push({ key: "client_cpf", label: "CPF", category: "contratante", ok: hasCpf });
    result.push({ key: "client_email", label: "E-mail", category: "contratante", ok: hasEmail });
    result.push({ key: "client_address", label: "Endereço completo", category: "contratante", ok: hasAddress });

    // Modelo check
    result.push({
      key: "contract_model",
      label: "Modelo de contrato",
      category: "modelo",
      ok: !!selectedModel,
      detail: selectedModel
        ? `${selectedModel.nome_modelo} (v${selectedModel.versao})`
        : allModels.length === 0
          ? "Nenhum modelo cadastrado"
          : "Selecione um modelo",
    });

    return result;
  }, [eventData, clientData, clientStatus, selectedModel, allModels, paymentDetails]);

  const allOk = checks.every((c) => c.ok);
  const missingCount = checks.filter((c) => !c.ok).length;

  const status: ReadinessStatus = loading ? "loading" : allOk ? "ready" : !selectedModel ? "missing_model" : "missing_data";

  const statusConfig: Record<ReadinessStatus, { label: string; icon: React.ElementType; className: string }> = {
    loading: { label: "Verificando...", icon: Loader2, className: "text-muted-foreground" },
    ready: { label: "Pronto para gerar contrato", icon: CheckCircle2, className: "text-green-600" },
    missing_data: { label: `${missingCount} ${missingCount === 1 ? "pendência" : "pendências"}`, icon: AlertTriangle, className: "text-amber-600" },
    missing_model: { label: "Selecione um modelo", icon: XCircle, className: "text-destructive" },
  };

  const StatusIcon = statusConfig[status].icon;

  const categories = ["festa", "pagamento", "contratante", "modelo"] as const;

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center gap-2">
          <FileSignature className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Contrato</p>
        </div>
        <div className="p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando prontidão...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSignature className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Contrato</p>
        </div>
        <div className={cn("flex items-center gap-1.5 text-xs font-medium", statusConfig[status].className)}>
          <StatusIcon className={cn("h-3.5 w-3.5", status === "loading" && "animate-spin")} />
          {statusConfig[status].label}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Existing contracts info */}
        {existingContracts.length > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/15 text-xs">
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-foreground/70">
              {existingContracts.length} contrato(s) já gerado(s) para esta festa
            </span>
          </div>
        )}

        {/* Model selector dropdown */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Package className="h-3 w-3" />
            Modelo de Contrato
          </div>
          {allModels.length > 0 ? (
            <Select
              value={selectedModelId || ""}
              onValueChange={(val) => setSelectedModelId(val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione o modelo de contrato" />
              </SelectTrigger>
              <SelectContent>
                {allModels.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.nome_modelo} — {m.tipo_evento} (v{m.versao})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-destructive">Nenhum modelo de contrato cadastrado</p>
          )}
        </div>

        {/* Pendencies grouped by category (excluding modelo since we have the selector) */}
        {!allOk && (
          <div className="space-y-2">
            {categories.map((cat) => {
              if (cat === "modelo") return null; // handled by selector above
              const catChecks = checks.filter((c) => c.category === cat);
              const catMissing = catChecks.filter((c) => !c.ok);
              if (catMissing.length === 0) return null;

              const CatIcon = CATEGORY_ICONS[cat];
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <CatIcon className="h-3 w-3" />
                    {CATEGORY_LABELS[cat]}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {catMissing.map((c) => (
                      <Badge
                        key={c.key}
                        variant="outline"
                        className="text-[10px] border-amber-300/50 text-amber-700 bg-amber-500/5 gap-1"
                      >
                        <XCircle className="h-2.5 w-2.5" />
                        {c.label}
                        {c.detail && <span className="text-amber-500/70">({c.detail})</span>}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Generate button */}
        <Button
          className="w-full gap-2 mt-1"
          disabled={!allOk || !selectedModel}
          onClick={() => selectedModel && onGenerateContract(selectedModel.id)}
        >
          <FileSignature className="h-4 w-4" />
          {existingContracts.length > 0 ? "Gerar Nova Versão do Contrato" : "Gerar Contrato"}
          {allOk && <ChevronRight className="h-4 w-4" />}
        </Button>

        {!allOk && (
          <p className="text-[11px] text-center text-muted-foreground">
            Preencha todos os dados pendentes para liberar a geração
          </p>
        )}
      </div>
    </div>
  );
}