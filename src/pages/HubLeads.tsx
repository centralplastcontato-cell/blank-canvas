import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Search, X, CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, type LeadStatus } from "@/types/crm";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const PAGE_SIZE = 50;

interface HubLead {
  id: string;
  name: string;
  whatsapp: string;
  status: LeadStatus;
  unit: string | null;
  created_at: string;
  company_id: string;
  responsavel_id: string | null;
}

export default function HubLeads() {
  return (
    <HubLayout
      currentPage={"leads" as any}
      header={
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Leads</h1>
        </div>
      }
    >
      {({ user }) => <HubLeadsContent userId={user.id} />}
    </HubLayout>
  );
}

function HubLeadsContent({ userId }: { userId: string }) {
  const isMobile = useIsMobile();
  const [leads, setLeads] = useState<HubLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Companies map
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [childCompanyIds, setChildCompanyIds] = useState<string[]>([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load child companies
  useEffect(() => {
    const loadCompanies = async () => {
      // Get parent companies the user has access to
      const { data: uc } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", userId);

      if (!uc || uc.length === 0) return;

      const companyIds = uc.map((u) => u.company_id);

      // Get parent companies (no parent_id)
      const { data: parents } = await supabase
        .from("companies")
        .select("id")
        .in("id", companyIds)
        .is("parent_id", null);

      if (!parents || parents.length === 0) return;

      // Get child companies
      const { data: children } = await supabase
        .from("companies")
        .select("id, name")
        .in("parent_id", parents.map((p) => p.id))
        .eq("is_active", true)
        .order("name");

      if (!children) return;

      const ids = children.map((c) => c.id);
      const map: Record<string, string> = {};
      children.forEach((c) => { map[c.id] = c.name; });

      setChildCompanyIds(ids);
      setCompanies(children);
      setCompaniesMap(map);
    };
    loadCompanies();
  }, [userId]);

  // Load profiles for responsavel names
  useEffect(() => {
    if (leads.length === 0) return;
    const responsavelIds = [...new Set(leads.map((l) => l.responsavel_id).filter(Boolean))] as string[];
    if (responsavelIds.length === 0) return;

    supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", responsavelIds)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        data.forEach((p) => { map[p.user_id] = p.full_name; });
        setProfilesMap((prev) => ({ ...prev, ...map }));
      });
  }, [leads]);

  // Load leads
  const loadLeads = useCallback(async () => {
    if (childCompanyIds.length === 0) {
      setLeads([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const targetIds = companyFilter !== "all" ? [companyFilter] : childCompanyIds;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("campaign_leads")
      .select("id, name, whatsapp, status, unit, created_at, company_id, responsavel_id", { count: "exact" })
      .in("company_id", targetIds)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter as LeadStatus);
    }

    if (debouncedSearch) {
      query = query.or(`name.ilike.%${debouncedSearch}%,whatsapp.ilike.%${debouncedSearch}%`);
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom.toISOString());
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("created_at", endOfDay.toISOString());
    }

    const { data, count, error } = await query;

    if (!error && data) {
      setLeads(data as HubLead[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [childCompanyIds, companyFilter, statusFilter, debouncedSearch, dateFrom, dateTo, page]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const showingFrom = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min((page + 1) * PAGE_SIZE, totalCount);

  const hasActiveFilters = companyFilter !== "all" || statusFilter !== "all" || debouncedSearch || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch("");
    setCompanyFilter("all");
    setStatusFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(0);
  };

  const statusBadge = (status: LeadStatus) => (
    <Badge className={cn(LEAD_STATUS_COLORS[status], "text-white text-xs font-medium border-0")}>
      {LEAD_STATUS_LABELS[status] || status}
    </Badge>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todas empresas</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Todos status</SelectItem>
            {(Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">{LEAD_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateFrom && dateTo
                ? `${format(dateFrom, "dd/MM", { locale: ptBR })} - ${format(dateTo, "dd/MM", { locale: ptBR })}`
                : "Período"
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined}
              onSelect={(range: any) => {
                setDateFrom(range?.from);
                setDateTo(range?.to);
                if (range?.from && range?.to) {
                  setPage(0);
                  setCalendarOpen(false);
                }
              }}
              locale={ptBR}
              numberOfMonths={isMobile ? 1 : 2}
            />
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum lead encontrado</p>
        </div>
      ) : isMobile ? (
        /* Mobile cards */
        <div className="space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.whatsapp}</p>
                </div>
                {statusBadge(lead.status)}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{companiesMap[lead.company_id] || "—"}</span>
                {lead.unit && <span>• {lead.unit}</span>}
                <span>• {format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
              </div>
              {lead.responsavel_id && profilesMap[lead.responsavel_id] && (
                <p className="text-xs text-muted-foreground">
                  Responsável: {profilesMap[lead.responsavel_id]}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Desktop table */
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.whatsapp}</TableCell>
                  <TableCell className="text-muted-foreground">{companiesMap[lead.company_id] || "—"}</TableCell>
                  <TableCell>{statusBadge(lead.status)}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.unit || "—"}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.responsavel_id && profilesMap[lead.responsavel_id]
                      ? profilesMap[lead.responsavel_id]
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Mostrando {showingFrom}–{showingTo} de {totalCount} leads
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(0)}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {page + 1} / {totalPages}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
