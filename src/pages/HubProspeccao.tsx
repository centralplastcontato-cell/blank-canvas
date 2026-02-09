import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Target, Users, DollarSign, BarChart3, Instagram, MapPin, Phone, Mail, Calendar, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Prospect {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  instagram: string | null;
  monthly_leads: string | null;
  lead_cost: string | null;
  has_lead_clarity: boolean | null;
  lead_organization: string | null;
  source: string | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  novo: { label: "Novo", variant: "default" },
  em_contato: { label: "Em contato", variant: "secondary" },
  proposta_enviada: { label: "Proposta enviada", variant: "outline" },
  fechado: { label: "Fechado", variant: "default" },
  perdido: { label: "Perdido", variant: "destructive" },
};

export default function HubProspeccao() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const fetchProspects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("b2b_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prospects:", error);
      toast({ title: "Erro ao carregar prospects", variant: "destructive" });
    } else {
      setProspects((data as unknown as Prospect[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProspects();
  }, []);

  const filtered = prospects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.company_name.toLowerCase().includes(q) ||
      p.contact_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.city && p.city.toLowerCase().includes(q))
    );
  });

  const openDetail = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setEditNotes(prospect.notes || "");
    setEditStatus(prospect.status);
  };

  const saveProspect = async () => {
    if (!selectedProspect) return;
    const { error } = await supabase
      .from("b2b_leads")
      .update({ status: editStatus, notes: editNotes })
      .eq("id", selectedProspect.id);

    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } else {
      toast({ title: "Prospect atualizado!" });
      setSelectedProspect(null);
      fetchProspects();
    }
  };

  const stats = {
    total: prospects.length,
    hub: prospects.filter((p) => p.source === "hub_landing").length,
    novos: prospects.filter((p) => p.status === "novo").length,
    semClareza: prospects.filter((p) => p.has_lead_clarity === false).length,
  };

  return (
    <HubLayout
      currentPage="prospeccao"
      header={
        <h1 className="text-lg font-display font-bold text-foreground">
          Prospecção
        </h1>
      }
    >
      {() => (
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Buffets interessados na plataforma
            </p>
            <Button variant="outline" size="sm" onClick={fetchProspects} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.hub}</p>
                  <p className="text-xs text-muted-foreground">Via Hub</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.novos}</p>
                  <p className="text-xs text-muted-foreground">Novos</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.semClareza}</p>
                  <p className="text-xs text-muted-foreground">Sem clareza de leads</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, empresa, email ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                Prospects ({filtered.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Buffet</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead className="hidden sm:table-cell">Cidade</TableHead>
                      <TableHead className="hidden md:table-cell">Leads/mês</TableHead>
                      <TableHead className="hidden md:table-cell">Clareza</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum prospect encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((p) => {
                        const statusInfo = STATUS_MAP[p.status] || { label: p.status, variant: "outline" as const };
                        return (
                          <TableRow
                            key={p.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openDetail(p)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground">{p.company_name}</p>
                                {p.source === "hub_landing" && (
                                  <Badge variant="outline" className="text-[10px] mt-0.5">Hub</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{p.contact_name}</p>
                              <p className="text-xs text-muted-foreground">{p.email}</p>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <span className="text-sm text-muted-foreground">
                                {p.city}{p.state ? `/${p.state}` : ""}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="text-sm">{p.monthly_leads || "—"}</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {p.has_lead_clarity === false ? (
                                <Badge variant="destructive" className="text-[10px]">Não</Badge>
                              ) : p.has_lead_clarity === true ? (
                                <Badge variant="outline" className="text-[10px]">Sim</Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusInfo.variant} className="text-[10px]">
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(p.created_at), "dd/MM", { locale: ptBR })}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Detail Sheet */}
          <Sheet open={!!selectedProspect} onOpenChange={(open) => !open && setSelectedProspect(null)}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              {selectedProspect && (
                <>
                  <SheetHeader>
                    <SheetTitle className="text-left">
                      {selectedProspect.company_name}
                    </SheetTitle>
                  </SheetHeader>

                  <div className="mt-6 space-y-5">
                    {/* Contact info */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Contato</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {selectedProspect.contact_name}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {selectedProspect.email}
                        </div>
                        {selectedProspect.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {selectedProspect.phone}
                          </div>
                        )}
                        {selectedProspect.city && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {selectedProspect.city}{selectedProspect.state ? `/${selectedProspect.state}` : ""}
                          </div>
                        )}
                        {selectedProspect.instagram && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Instagram className="h-4 w-4" />
                            {selectedProspect.instagram}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(selectedProspect.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </div>

                    {/* Lead info (qualification) */}
                    {(selectedProspect.monthly_leads || selectedProspect.lead_cost || selectedProspect.lead_organization) && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          Diagnóstico de leads
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedProspect.monthly_leads && (
                            <div className="bg-muted rounded-xl p-3">
                              <p className="text-xs text-muted-foreground">Leads/mês</p>
                              <p className="text-sm font-medium text-foreground mt-0.5">{selectedProspect.monthly_leads}</p>
                            </div>
                          )}
                          {selectedProspect.lead_cost && (
                            <div className="bg-muted rounded-xl p-3">
                              <p className="text-xs text-muted-foreground">Custo/lead</p>
                              <p className="text-sm font-medium text-foreground mt-0.5">{selectedProspect.lead_cost}</p>
                            </div>
                          )}
                          <div className="bg-muted rounded-xl p-3">
                            <p className="text-xs text-muted-foreground">Clareza dos leads</p>
                            <p className={`text-sm font-medium mt-0.5 ${selectedProspect.has_lead_clarity === false ? "text-destructive" : "text-foreground"}`}>
                              {selectedProspect.has_lead_clarity === true ? "Sim" : selectedProspect.has_lead_clarity === false ? "Não" : "—"}
                            </p>
                          </div>
                          {selectedProspect.lead_organization && (
                            <div className="bg-muted rounded-xl p-3">
                              <p className="text-xs text-muted-foreground">Organização</p>
                              <p className="text-sm font-medium text-foreground mt-0.5">{selectedProspect.lead_organization}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status + Notes */}
                    <div className="space-y-3 pt-2 border-t border-border">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Status</label>
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_MAP).map(([key, val]) => (
                              <SelectItem key={key} value={key}>{val.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Observações</label>
                        <Textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Anotações sobre o prospect..."
                          className="rounded-xl"
                          rows={4}
                        />
                      </div>
                      <Button onClick={saveProspect} className="w-full rounded-xl">
                        Salvar alterações
                      </Button>
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
