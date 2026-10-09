import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Users, Filter, UserCheck, UserX, X, Database, ShieldCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { phoneTail, prepareAudience, RECENT_CAMPAIGN_DAYS } from "@/lib/campaignAudience";
import type { CampaignDraft } from "./CampaignWizard";
import { OptoutListDialog } from "./OptoutListDialog";

interface Props {
  draft: CampaignDraft;
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
  companyId: string;
  /** Ao editar destinatários: quem já recebeu esta campanha não aparece de novo */
  editingCampaignId?: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "novo", label: "Novo" },
  { value: "em_contato", label: "Em contato" },
  { value: "aguardando_resposta", label: "Aguardando resposta" },
  { value: "orcamento_enviado", label: "Orçamento enviado" },
  { value: "fechado", label: "Fechado" },
  { value: "perdido", label: "Perdido" },
  { value: "transferido", label: "Transferido" },
  { value: "trabalhe_conosco", label: "Trabalhe conosco" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "cliente_retorno", label: "Cliente retorno" },
  { value: "outros", label: "Outros" },
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

const SOURCE_OPTIONS = [
  { value: "all", label: "Todas origens" },
  { value: "crm", label: "CRM" },
  { value: "base", label: "Base" },
];

const PARTY_TYPE_OPTIONS = [
  { value: "all", label: "Todos os tipos" },
  { value: "aniversario", label: "🎂 Aniversário" },
  { value: "formatura", label: "🎓 Formatura" },
  { value: "escolar", label: "🏫 Escolar" },
  { value: "confraternizacao", label: "🏢 Confraternização" },
  { value: "outro", label: "📌 Outro" },
];

const fmt = (n: number) => n.toLocaleString("pt-BR");
const say = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  month: string | null;
  status: string;
  unit: string | null;
  source: "crm" | "base";
  partyType: string | null;
}

export function CampaignAudienceStep({ draft, setDraft, companyId, editingCampaignId }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [optoutTails, setOptoutTails] = useState<Set<string>>(new Set());
  const [recentTails, setRecentTails] = useState<Set<string>>(new Set());
  const [includeClosed, setIncludeClosed] = useState(false);
  const [includeRecent, setIncludeRecent] = useState(false);
  const [optoutsOpen, setOptoutsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterMonth, setFilterMonth] = useState("all");
  const [units, setUnits] = useState<{ name: string }[]>([]);
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterPartyType, setFilterPartyType] = useState("all");

  useEffect(() => {
    loadAllLeads();
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

  const loadAllLeads = async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - RECENT_CAMPAIGN_DAYS * 24 * 60 * 60 * 1000).toISOString();

      // Todos os leads (o banco entrega no máximo 1000 por vez, então busca em páginas)
      const [crmRows, baseRows, campaignRows, optoutRows] = await Promise.all([
        fetchAllPages<{ id: string; name: string; whatsapp: string; month: string | null; status: string; unit: string | null }>((a, b) =>
          supabase
            .from("campaign_leads")
            .select("id, name, whatsapp, month, status, unit")
            .eq("company_id", companyId)
            .order("name")
            .order("id")
            .range(a, b),
        ),
        fetchAllPages<{ id: string; name: string; phone: string; month_interest: string | null; is_former_client: boolean | null; party_type: string | null }>((a, b) =>
          supabase
            .from("base_leads")
            .select("id, name, phone, month_interest, is_former_client, party_type")
            .eq("company_id", companyId)
            .order("name")
            .order("id")
            .range(a, b),
        ),
        supabase.from("campaigns").select("id").eq("company_id", companyId),
        // Lista de quem pediu para sair (se ainda não existir no banco, segue sem ela)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from("campaign_optouts").select("phone_tail").eq("company_id", companyId).limit(5000),
      ]);

      // Quem recebeu alguma campanha nos últimos dias (e, ao editar, quem já recebeu esta)
      const campaignIds = (campaignRows.data || []).map((c) => c.id);
      const recentRows = campaignIds.length
        ? await fetchAllPages<{ phone: string; campaign_id: string; sent_at: string | null }>((a, b) =>
            supabase
              .from("campaign_recipients")
              .select("phone, campaign_id, sent_at")
              .in("campaign_id", campaignIds)
              .eq("status", "sent")
              .order("id")
              .range(a, b),
          )
        : [];
      const recent = new Set<string>();
      for (const r of recentRows) {
        if (r.campaign_id === editingCampaignId || (r.sent_at && r.sent_at >= since)) {
          const tail = phoneTail(r.phone);
          if (tail) recent.add(tail);
        }
      }
      setRecentTails(recent);
      setOptoutTails(
        new Set(((optoutRows?.data || []) as { phone_tail: string }[]).map((o) => o.phone_tail)),
      );

      const crmLeads: Lead[] = crmRows.map((l) => ({
        id: l.id,
        name: l.name,
        whatsapp: l.whatsapp,
        month: l.month,
        status: l.status,
        unit: l.unit,
        source: "crm" as const,
        partyType: null,
      }));

      const baseLeads: Lead[] = baseRows.map((l) => ({
        id: `base_${l.id}`,
        name: l.name,
        whatsapp: l.phone,
        month: l.month_interest,
        status: l.is_former_client ? "cliente_retorno" : "novo",
        unit: null,
        source: "base" as const,
        partyType: l.party_type || null,
      }));

      const allLeads = [...crmLeads, ...baseLeads];
      setLeads(allLeads);
      setDraft((prev) => ({
        ...prev,
        leads: allLeads.map((l) => ({ id: l.id, name: l.name, whatsapp: l.whatsapp })),
      }));
    } catch (err) {
      console.error("Erro ao carregar leads da campanha:", err);
      toast.error("Não foi possível carregar a lista de leads. Tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  // Quem pode receber: tira repetidos, quem pediu para sair, fechados e quem recebeu há pouco.
  // Se a pessoa escolher um status no filtro (ex.: Fechado), ele aparece mesmo assim.
  const pool = useMemo(
    () =>
      prepareAudience(leads, {
        optoutTails,
        recentTails,
        includeClosed: includeClosed || filterStatuses.length > 0,
        includeRecent,
      }),
    [leads, optoutTails, recentTails, includeClosed, includeRecent, filterStatuses],
  );

  // Ao editar destinatários: marca de novo quem já estava na lista (pelo telefone)
  useEffect(() => {
    if (loading || !draft.preselectTails) return;
    const tails = new Set(draft.preselectTails);
    setDraft((prev) => ({
      ...prev,
      preselectTails: undefined,
      selectedLeadIds: pool.available.filter((l) => tails.has(phoneTail(l.whatsapp))).map((l) => l.id),
    }));
  }, [loading, draft.preselectTails, pool, setDraft]);

  // Quem saiu da lista (ex.: desligou "mostrar fechados") deixa de estar marcado
  useEffect(() => {
    if (loading) return;
    const allowed = new Set(pool.available.map((l) => l.id));
    setDraft((prev) => {
      const kept = prev.selectedLeadIds.filter((id) => allowed.has(id));
      return kept.length === prev.selectedLeadIds.length ? prev : { ...prev, selectedLeadIds: kept };
    });
  }, [loading, pool, setDraft]);

  const filtered = useMemo(() => {
    return pool.available.filter((l) => {
      if (filterSource !== "all" && l.source !== filterSource) return false;
      if (filterStatuses.length > 0 && !filterStatuses.includes(l.status)) return false;
      if (filterMonth !== "all" && l.month !== filterMonth) return false;
      if (filterUnit !== "all" && l.unit !== filterUnit) return false;
      if (filterPartyType !== "all" && l.partyType !== filterPartyType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!l.name.toLowerCase().includes(q) && !l.whatsapp.includes(q)) return false;
      }
      return true;
    });
  }, [pool, filterStatuses, filterMonth, filterUnit, filterSource, filterPartyType, search]);

  // Persist active filter snapshot in the draft so the detail sheet can show it later.
  useEffect(() => {
    setDraft((prev) => ({
      ...prev,
      audienceFilters: {
        statuses: filterStatuses,
        month: filterMonth,
        unit: filterUnit,
        source: filterSource,
        partyType: filterPartyType,
        search: search.trim(),
      },
    }));
  }, [filterStatuses, filterMonth, filterUnit, filterSource, filterPartyType, search, setDraft]);

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
  const hiddenTotal =
    pool.hidden.closed + pool.hidden.recent + pool.hidden.optout + pool.hidden.duplicate + pool.hidden.invalid;
  const hasActiveFilters = filterStatuses.length > 0 || filterMonth !== "all" || filterUnit !== "all" || filterSource !== "all" || filterPartyType !== "all" || search.trim() !== "";

  const toggleStatus = (value: string) => {
    setFilterStatuses((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const statusLabel = filterStatuses.length === 0
    ? "Todos os status"
    : filterStatuses.length === 1
      ? STATUS_OPTIONS.find((o) => o.value === filterStatuses[0])?.label || filterStatuses[0]
      : `${filterStatuses.length} status`;

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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* Source filter */}
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="h-9 text-xs rounded-lg border-border/60 bg-background shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`h-9 px-3 text-xs rounded-lg border bg-background shadow-sm flex items-center justify-between gap-1.5 w-full transition-colors ${
                  filterStatuses.length > 0
                    ? "border-primary/30 text-primary"
                    : "border-border/60 text-foreground"
                }`}
              >
                <span className="truncate">{statusLabel}</span>
                {filterStatuses.length > 0 ? (
                  <X
                    className="w-3.5 h-3.5 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); setFilterStatuses([]); }}
                  />
                ) : (
                  <Filter className="w-3 h-3 shrink-0 text-muted-foreground" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-1.5" align="start">
              {STATUS_OPTIONS.filter((o) => o.value !== "all").map((o) => (
                <label
                  key={o.value}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer transition-colors text-sm ${
                    filterStatuses.includes(o.value)
                      ? "bg-primary/5 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <Checkbox
                    checked={filterStatuses.includes(o.value)}
                    onCheckedChange={() => toggleStatus(o.value)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  {o.label}
                </label>
              ))}
            </PopoverContent>
          </Popover>
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
          {/* Party type filter */}
          <Select value={filterPartyType} onValueChange={setFilterPartyType}>
            <SelectTrigger className="h-9 text-xs rounded-lg border-border/60 bg-background shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PARTY_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Quem ficou de fora sozinho, e como trazer de volta */}
      {!loading && hiddenTotal > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2.5">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed min-w-0">
              <p className="font-semibold text-foreground">
                {say(hiddenTotal, "ficou", "ficaram")} de fora para proteger seu número
              </p>
              <ul className="mt-0.5 text-muted-foreground">
                {pool.hidden.closed > 0 && <li>{say(pool.hidden.closed, "já fechou, perdeu ou não é cliente", "já fecharam, perderam ou não são clientes")}</li>}
                {pool.hidden.recent > 0 && <li>{say(pool.hidden.recent, "recebeu", "receberam")} campanha nos últimos {RECENT_CAMPAIGN_DAYS} dias</li>}
                {pool.hidden.optout > 0 && (
                  <li>
                    {say(pool.hidden.optout, "pediu", "pediram")} para não receber mais ·{" "}
                    <button type="button" className="underline font-medium" onClick={() => setOptoutsOpen(true)}>
                      ver lista
                    </button>
                  </li>
                )}
                {pool.hidden.duplicate > 0 && <li>{say(pool.hidden.duplicate, "telefone repetido", "telefones repetidos")} (cada número recebe uma vez só)</li>}
                {pool.hidden.invalid > 0 && <li>{say(pool.hidden.invalid, "sem telefone válido", "sem telefone válido")}</li>}
              </ul>
            </div>
          </div>
          {(pool.hidden.closed > 0 || includeClosed || pool.hidden.recent > 0 || includeRecent) && (
            <div className="space-y-2 pl-6">
              {(pool.hidden.closed > 0 || includeClosed) && filterStatuses.length === 0 && (
                <label className="flex items-center justify-between gap-3 text-xs cursor-pointer">
                  <span>Mostrar fechados, perdidos e não clientes</span>
                  <Switch checked={includeClosed} onCheckedChange={setIncludeClosed} />
                </label>
              )}
              {(pool.hidden.recent > 0 || includeRecent) && (
                <label className="flex items-center justify-between gap-3 text-xs cursor-pointer">
                  <span>Incluir quem recebeu campanha há pouco</span>
                  <Switch checked={includeRecent} onCheckedChange={setIncludeRecent} />
                </label>
              )}
            </div>
          )}
        </div>
      )}

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
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate text-foreground">{lead.name}</p>
                    {lead.source === "base" && (
                      <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                        <Database className="w-2.5 h-2.5 mr-0.5" />
                        Base
                      </Badge>
                    )}
                  </div>
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
      <OptoutListDialog open={optoutsOpen} onOpenChange={setOptoutsOpen} companyId={companyId} onChanged={loadAllLeads} />
    </div>
  );
}
