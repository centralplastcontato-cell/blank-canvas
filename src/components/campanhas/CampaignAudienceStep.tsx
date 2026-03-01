import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Users } from "lucide-react";
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
      // Preserve previous selections
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

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 text-sm">
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
            <SelectTrigger className="h-9 text-sm">
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou WhatsApp..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          {draft.selectedLeadIds.length} selecionado(s) de {filtered.length} lead(s)
        </Label>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAll}>
          {filtered.length > 0 && filtered.every((l) => selectedSet.has(l.id)) ? "Desmarcar todos" : "Selecionar todos"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <Users className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum lead encontrado</p>
        </div>
      ) : (
        <ScrollArea className="h-56 border rounded-md">
          <div className="p-1 space-y-0.5">
            {filtered.map((lead) => (
              <label
                key={lead.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${selectedSet.has(lead.id) ? "bg-primary/5" : ""}`}
              >
                <Checkbox checked={selectedSet.has(lead.id)} onCheckedChange={() => toggleLead(lead.id)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.whatsapp}{lead.month ? ` · ${lead.month}` : ""}{lead.unit ? ` · ${lead.unit}` : ""}</p>
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
