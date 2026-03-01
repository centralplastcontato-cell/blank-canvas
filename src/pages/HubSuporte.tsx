import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Headset, Bug, Lightbulb, HelpCircle, AlertTriangle, Clock, CheckCircle2, XCircle, Inbox } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Ticket {
  id: string;
  company_id: string | null;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  subject: string;
  description: string;
  category: string;
  page_url: string | null;
  console_errors: Json;
  context_data: Json;
  status: string;
  priority: string;
  ai_classification: string | null;
  conversation_history: Json;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "novo", label: "Novo" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "resolvido", label: "Resolvido" },
  { value: "fechado", label: "Fechado" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "bug", label: "Bug" },
  { value: "sugestao", label: "Sugestão" },
  { value: "duvida", label: "Dúvida" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { icon: React.ElementType; className: string; label: string }> = {
    bug: { icon: Bug, className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", label: "Bug" },
    sugestao: { icon: Lightbulb, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", label: "Sugestão" },
    duvida: { icon: HelpCircle, className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300", label: "Dúvida" },
  };
  const info = map[category] || { icon: HelpCircle, className: "bg-muted text-muted-foreground", label: category };
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${info.className}`}>
      <Icon className="h-3 w-3" />
      {info.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; className: string; label: string }> = {
    novo: { icon: Inbox, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", label: "Novo" },
    em_andamento: { icon: Clock, className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", label: "Em andamento" },
    resolvido: { icon: CheckCircle2, className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", label: "Resolvido" },
    fechado: { icon: XCircle, className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", label: "Fechado" },
  };
  const info = map[status] || { icon: Inbox, className: "bg-muted text-muted-foreground", label: status };
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${info.className}`}>
      <Icon className="h-3 w-3" />
      {info.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    alta: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    media: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    baixa: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[priority] || "bg-muted text-muted-foreground"}`}>
      {priority === "alta" ? "🔴 Alta" : priority === "media" ? "🟡 Média" : "⚪ Baixa"}
    </span>
  );
}

export default function HubSuporte() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("support-tickets-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_tickets" }, (payload) => {
        setTickets((prev) => [payload.new as Ticket, ...prev]);
        toast.info("Novo ticket de suporte recebido!");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_tickets" }, (payload) => {
        setTickets((prev) => prev.map((t) => (t.id === (payload.new as Ticket).id ? (payload.new as Ticket) : t)));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    setLoading(true);
    const [ticketsRes, companiesRes] = await Promise.all([
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(200) as any,
      supabase.from("companies").select("id, name").eq("is_active", true).order("name"),
    ]);
    setTickets(ticketsRes.data || []);
    setCompanies(companiesRes.data || []);
    setLoading(false);
  }

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (companyFilter !== "all" && t.company_id !== companyFilter) return false;
    return true;
  });

  const counts = {
    total: tickets.length,
    novo: tickets.filter((t) => t.status === "novo").length,
    em_andamento: tickets.filter((t) => t.status === "em_andamento").length,
    resolvido: tickets.filter((t) => t.status === "resolvido").length,
  };

  async function updateStatus(ticketId: string, newStatus: string) {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "resolvido") updates.resolved_at = new Date().toISOString();

    const { error } = await supabase.from("support_tickets").update(updates).eq("id", ticketId) as any;
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(`Status alterado para "${newStatus}"`);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus, ...(newStatus === "resolvido" ? { resolved_at: new Date().toISOString() } : {}) } : t)));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    }
  }

  const companyMap = new Map(companies.map((c) => [c.id, c.name]));

  function formatDate(iso: string) {
    return format(new Date(iso), "dd/MM/yy HH:mm", { locale: ptBR });
  }

  return (
    <HubLayout currentPage="suporte" header={<h2 className="font-semibold text-lg">Suporte</h2>}>
      {() => (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Headset className="h-6 w-6 text-primary" />
              Tickets de Suporte
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie os tickets abertos pelo chatbot de suporte</p>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total", value: counts.total, icon: Headset, color: "text-primary" },
              { label: "Novos", value: counts.novo, icon: Inbox, color: "text-blue-500" },
              { label: "Em andamento", value: counts.em_andamento, icon: Clock, color: "text-orange-500" },
              { label: "Resolvidos", value: counts.resolvido, icon: CheckCircle2, color: "text-green-500" },
            ].map((m) => (
              <Card key={m.label}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <m.icon className={`h-5 w-5 ${m.color}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      {loading ? <Skeleton className="h-7 w-12" /> : <p className="text-2xl font-bold">{m.value}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>{CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>{PRIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas empresas</SelectItem>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">Nenhum ticket encontrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((t) => (
                        <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedTicket(t)}>
                          <TableCell className="font-medium max-w-[200px] truncate">{t.subject}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{t.company_id ? companyMap.get(t.company_id) || "—" : "—"}</TableCell>
                          <TableCell className="text-sm">{t.user_name || t.user_email || "—"}</TableCell>
                          <TableCell><CategoryBadge category={t.category} /></TableCell>
                          <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                          <TableCell><StatusBadge status={t.status} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(t.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detail Sheet */}
          <Sheet open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              {selectedTicket && (
                <>
                  <SheetHeader>
                    <SheetTitle className="text-left pr-8">{selectedTicket.subject}</SheetTitle>
                  </SheetHeader>

                  <div className="mt-4 space-y-4">
                    {/* Meta */}
                    <div className="flex flex-wrap gap-2">
                      <CategoryBadge category={selectedTicket.category} />
                      <PriorityBadge priority={selectedTicket.priority} />
                      <StatusBadge status={selectedTicket.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Usuário:</span> {selectedTicket.user_name || "—"}</div>
                      <div><span className="text-muted-foreground">Email:</span> {selectedTicket.user_email || "—"}</div>
                      <div><span className="text-muted-foreground">Empresa:</span> {selectedTicket.company_id ? companyMap.get(selectedTicket.company_id) || "—" : "—"}</div>
                      <div><span className="text-muted-foreground">Criado:</span> {formatDate(selectedTicket.created_at)}</div>
                      {selectedTicket.page_url && (
                        <div className="col-span-2"><span className="text-muted-foreground">Página:</span> <span className="text-xs break-all">{selectedTicket.page_url}</span></div>
                      )}
                    </div>

                    <Separator />

                    {/* Description */}
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Descrição</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>

                    {/* AI Classification */}
                    {selectedTicket.ai_classification && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Classificação IA</h4>
                          <p className="text-sm text-muted-foreground">{selectedTicket.ai_classification}</p>
                        </div>
                      </>
                    )}

                    {/* Conversation History */}
                    {Array.isArray(selectedTicket.conversation_history) && (selectedTicket.conversation_history as unknown[]).length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Histórico da conversa com IA</h4>
                          <ScrollArea className="max-h-60">
                            <div className="space-y-2">
                              {(selectedTicket.conversation_history as Array<{ role: string; content: string }>).map((msg, i) => (
                                <div key={i} className={`text-xs p-2 rounded-lg ${msg.role === "user" ? "bg-primary/10 ml-4" : "bg-muted mr-4"}`}>
                                  <span className="font-semibold">{msg.role === "user" ? "Usuário" : "IA"}:</span>{" "}
                                  <span className="whitespace-pre-wrap">{msg.content}</span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </>
                    )}

                    {/* Console Errors */}
                    {Array.isArray(selectedTicket.console_errors) && (selectedTicket.console_errors as unknown[]).length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-semibold mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                            Erros do console ({(selectedTicket.console_errors as unknown[]).length})
                          </h4>
                          <ScrollArea className="max-h-40">
                            <div className="space-y-1">
                              {(selectedTicket.console_errors as string[]).map((err, i) => (
                                <p key={i} className="text-[11px] font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-1.5 rounded break-all">{String(err)}</p>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {selectedTicket.status === "novo" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(selectedTicket.id, "em_andamento")}>
                          <Clock className="h-4 w-4 mr-1" /> Em andamento
                        </Button>
                      )}
                      {(selectedTicket.status === "novo" || selectedTicket.status === "em_andamento") && (
                        <Button size="sm" variant="default" onClick={() => updateStatus(selectedTicket.id, "resolvido")}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Resolver
                        </Button>
                      )}
                      {selectedTicket.status !== "fechado" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(selectedTicket.id, "fechado")}>
                          <XCircle className="h-4 w-4 mr-1" /> Fechar
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
      )}
    </HubLayout>
  );
}
