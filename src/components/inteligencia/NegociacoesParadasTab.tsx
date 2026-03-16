import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNegociacoesParadas, type NegociacaoParada } from "@/hooks/useNegociacoesParadas";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Clock, AlertTriangle, User, Calendar, Radar, Search, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScoreBadge } from "./ScoreBadge";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

interface NegociacoesParadasTabProps {
  selectedUnit?: string;
}

const STALLED_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "10", label: "10 dias" },
  { value: "14", label: "14 dias" },
  { value: "21", label: "21 dias" },
  { value: "30", label: "30 dias" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos os estágios" },
  { value: "em_contato", label: "Visita" },
  { value: "orcamento_enviado", label: "Orçamento enviado" },
  { value: "aguardando_resposta", label: "Negociando" },
];

const SCORE_FILTER_OPTIONS = [
  { value: "all", label: "Todos os scores" },
  { value: "alta", label: "🔥 Alta chance" },
  { value: "media", label: "🟡 Chance média" },
  { value: "baixa", label: "⚪ Baixa chance" },
];

const PAGE_SIZE = 10;

export function NegociacoesParadasTab({ selectedUnit }: NegociacoesParadasTabProps) {
  const navigate = useNavigate();
  const { currentCompanyId } = useCompany();
  const [stalledDays, setStalledDays] = useState("10");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [reactivationMap, setReactivationMap] = useState<Record<string, { stage: string; sent_at: string }>>({});
  const { data, isLoading } = useNegociacoesParadas(Number(stalledDays), selectedUnit);

  // Fetch reactivation history for visible leads
  useEffect(() => {
    if (!currentCompanyId || !data?.length) return;
    const leadIds = data.map(d => d.leadId);
    supabase
      .from('lead_reactivation_history')
      .select('lead_id, reactivation_stage, sent_at')
      .eq('company_id', currentCompanyId)
      .eq('status', 'sent')
      .in('lead_id', leadIds)
      .order('sent_at', { ascending: false })
      .then(({ data: history }) => {
        const map: Record<string, { stage: string; sent_at: string }> = {};
        for (const h of (history || [])) {
          if (!map[h.lead_id]) {
            map[h.lead_id] = { stage: h.reactivation_stage, sent_at: h.sent_at };
          }
        }
        setReactivationMap(map);
      });
  }, [currentCompanyId, data]);

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const filteredLeads = useMemo(() => {
    let leads = data || [];

    if (statusFilter !== "all") {
      leads = leads.filter(l => l.status === statusFilter);
    }

    if (scoreFilter !== "all") {
      leads = leads.filter(l => l.classificacao === scoreFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      leads = leads.filter(l =>
        l.leadName.toLowerCase().includes(q) ||
        l.whatsapp.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      );
    }

    return leads;
  }, [data, statusFilter, scoreFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleOpenConversation = (lead: NegociacaoParada) => {
    if (lead.conversationId) {
      navigate(`/atendimento?conversation=${lead.conversationId}`);
    } else {
      navigate(`/atendimento?search=${encodeURIComponent(lead.whatsapp)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Negociações Paradas</h2>
          <Badge variant="secondary" className="text-xs">
            {filteredLeads.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Paradas há mais de:</span>
          <Select value={stalledDays} onValueChange={handleFilterChange(setStalledDays)}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STALLED_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={scoreFilter} onValueChange={handleFilterChange(setScoreFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCORE_FILTER_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {filteredLeads.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-primary/10 mb-3">
              <Radar className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Nenhuma negociação parada!</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {searchQuery || statusFilter !== "all" || scoreFilter !== "all"
                ? "Nenhum resultado encontrado com os filtros aplicados."
                : `Não existem leads parados há mais de ${stalledDays} dias nos estágios monitorados.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lead list */}
      {paginatedLeads.length > 0 && (
        <div className="grid gap-3">
          {paginatedLeads.map((lead) => (
            <Card key={lead.leadId} className="border-l-4 border-l-orange-500/70 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold truncate">{lead.leadName}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {lead.statusLabel}
                      </Badge>
                      {lead.unit && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {lead.unit}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {lead.diasParado} dias parado
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Última msg: {format(new Date(lead.lastMessageAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-sm">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        <span className="text-orange-600 dark:text-orange-400 font-medium">{lead.motivo}</span>
                      </div>
                      <ScoreBadge score={lead.scoreFechamento} classificacao={lead.classificacao} />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-2"
                    onClick={() => handleOpenConversation(lead)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Abrir conversa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredLeads.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredLeads.length)} de {filteredLeads.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2 font-medium">{currentPage} / {totalPages}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
