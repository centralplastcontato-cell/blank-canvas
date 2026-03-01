import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Users, Filter, UserCheck, UserX } from "lucide-react";
import type { CampaignDraft } from "./CampaignWizard";

interface Props {
  draft: CampaignDraft;
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
  companyId: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "novo", label: "Novo" },
  { value: "em_contato", label: "Em contato" },
  { value: "aguardando_resposta", label: "Aguardando resposta" },
  { value: "orcamento_enviado", label: "Orçamento enviado" },
  { value: "fechado", label: "Fechado" },
  { value: "perdido", label: "Perdido" },
];

const MONTH_OPTIONS = [
  { value: "all", label: "Todos os meses" },
  { value: "Janeiro", label: "Janeiro" },
  { value: "Fevereiro", label: "Fevereiro" },
  { value: "Março", label: "Março" },
  { value: "Abril", label: "Abril" },
  { value: "Maio", label: "Maio" },
  { value: "Junho", label: "Junho" },
  { value: "Julho", label: "Julho" },
  { value: "Agosto", label: "Agosto" },
  { value: "Setembro", label: "Setembro" },
  { value: "Outubro", label: "Outubro" },
  { value: "Novembro", label: "Novembro" },
  { value: "Dezembro", label: "Dezembro" },
];

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  month: string | null;
  status: string;
  unit: string | null;
}

export function CampaignAudienceStep({ draft, setDraft, companyId }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [units, setUnits] = useState<{ name: string }[]>([]);
  const [filterUnit, setFilterUnit] = useState("all");

  useEffect(() => {
    loadLeads();
    loadUnits();
  }, [companyId]);

  const loadUnits = async () => {
    const { data } = await supabase
      .from("company_units")
      .select("name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("sort_order");
    setUnits(data || []);
  };

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaign_leads")
      .select("id, name, whatsapp, month, status, unit")
      .eq("company_id", companyId)
      .order("name");

    if (!error && data) {
      setLeads(data);
      setDraft((prev) => ({
        ...prev,
        leads: data.map((l) => ({ id: l.id, name: l.name, whatsapp: l.whatsapp })),
      }));
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (filterMonth !== "all" && l.month !== filterMonth) return false;
      if (filterUnit !== "all" && l.unit !== filterUnit) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!l.name.toLowerCase().includes(q) && !l.whatsapp.includes(q)) return false;
      }
      return true;
    });
  }, [leads, filterStatus, filterMonth, filterUnit, search]);

  const selectedSet = new Set(draft.selectedLeadIds);

  const toggleLead = (id: string) => {
    setDraft((prev) => {
      const s = new Set(prev.selectedLeadIds);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return { ...prev, selectedLeadIds: Array.from(s) };
    });
  };

  const toggleAll = () => {
    const allFilteredIds = filtered.map((l) => l.id);
    const allSelected = allFilteredIds.every((id) => selectedSet.has(id));
    setDraft((prev) => {
      const s = new Set(prev.selectedLeadIds);
      if (allSelected) {
        allFilteredIds.forEach((id) => s.delete(id));
      } else {
        allFilteredIds.forEach((id) => s.add(id));
      }
      return { ...prev, selectedLeadIds: Array.from(s) };
    });
  };

  const allSelected = filtered.length > 0 && filtered.every((l) => selectedSet.has(l.id));
  const hasActiveFilters = filterStatus !== "all" || filterMonth !== "all" || filterUnit !== "all" || search.trim() !== "";

  return (
    <div className="space-y-4">
      {/* Filtros header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filtros
          </span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              Ativo
            </Badge>
          )}
          <div className="flex-1 h-px bg-border/50" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-9 text-xs rounded-lg border-border/60 bg-background shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 text-xs rounded-lg border-border/60 bg-background shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {units.length > 0 && (
            <Select value={filterUnit} onValueChange={setFilterUnit}>
              <SelectTrigger className="h-9 text-xs rounded-lg border-border/60 bg-background shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas unidades</SelectItem>
                {units.map((u) => (
                  <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm rounded-lg border-border/60 shadow-sm"
        />
      </div>

      {/* Contador + selecionar todos */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">
              {draft.selectedLeadIds.length}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            de {filtered.length} lead(s)
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={toggleAll}
        >
          {allSelected ? (
            <>
              <UserX className="w-3 h-3" />
              Desmarcar todos
            </>
          ) : (
            <>
              <UserCheck className="w-3 h-3" />
              Selecionar todos
            </>
          )}
        </Button>
      </div>

      {/* Lista de leads */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
            <span className="text-xs text-muted-foreground">Carregando leads...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Nenhum lead encontrado</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Ajuste os filtros ou busca</p>
        </div>
      ) : (
        <ScrollArea className="h-56 rounded-xl border border-border/60 bg-muted/10 shadow-sm">
          <div className="p-1.5 space-y-0.5">
            {filtered.map((lead) => (
              <label
                key={lead.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  selectedSet.has(lead.id)
                    ? "bg-primary/5 border border-primary/15 shadow-sm"
                    : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                <Checkbox
                  checked={selectedSet.has(lead.id)}
                  onCheckedChange={() => toggleLead(lead.id)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-foreground">{lead.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {lead.whatsapp}
                    {lead.unit && (
                      <span className="text-muted-foreground/60"> · {lead.unit}</span>
                    )}
                    {lead.month && (
                      <span className="text-muted-foreground/60"> · {lead.month}</span>
                    )}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
