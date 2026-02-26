 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Input } from "@/components/ui/input";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { Textarea } from "@/components/ui/textarea";
 import { Label } from "@/components/ui/label";
import { 
  Search, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Eye, 
  Trash2,
  RefreshCw,
  PartyPopper,
  MessageSquare
} from "lucide-react";
 import { toast } from "sonner";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
interface B2BLead {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  monthly_parties: number | null;
  current_tools: string | null;
  main_challenges: string | null;
  how_found_us: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  instagram: string | null;
  monthly_leads: string | null;
  lead_cost: string | null;
  has_lead_clarity: boolean | null;
  lead_organization: string | null;
  source: string | null;
}
 
 const statusOptions = [
   { value: "novo", label: "Novo", color: "bg-blue-500" },
   { value: "contatado", label: "Contatado", color: "bg-yellow-500" },
   { value: "demo_agendada", label: "Demo Agendada", color: "bg-purple-500" },
   { value: "proposta_enviada", label: "Proposta Enviada", color: "bg-orange-500" },
   { value: "fechado", label: "Fechado", color: "bg-green-500" },
   { value: "perdido", label: "Perdido", color: "bg-red-500" },
 ];
 
 const howFoundUsLabels: Record<string, string> = {
   google: "Google",
   instagram: "Instagram",
   indicacao: "Indicação",
   evento: "Evento do setor",
   outro: "Outro",
 };
 
 export function B2BLeadsManager() {
   const [leads, setLeads] = useState<B2BLead[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState("");
   const [statusFilter, setStatusFilter] = useState<string>("all");
   const [selectedLead, setSelectedLead] = useState<B2BLead | null>(null);
   const [isDetailOpen, setIsDetailOpen] = useState(false);
   const [notes, setNotes] = useState("");
   const [isSaving, setIsSaving] = useState(false);
 
   const fetchLeads = async () => {
     setIsLoading(true);
     try {
       const { data, error } = await supabase
         .from("b2b_leads")
         .select("*")
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       setLeads(data || []);
     } catch (error) {
       console.error("Error fetching B2B leads:", error);
       toast.error("Erro ao carregar leads B2B");
     } finally {
       setIsLoading(false);
     }
   };
 
   useEffect(() => {
     fetchLeads();
   }, []);
 
   const updateLeadStatus = async (leadId: string, newStatus: string) => {
     try {
       const { error } = await supabase
         .from("b2b_leads")
         .update({ status: newStatus })
         .eq("id", leadId);
 
       if (error) throw error;
 
       setLeads(prev => prev.map(lead => 
         lead.id === leadId ? { ...lead, status: newStatus } : lead
       ));
       toast.success("Status atualizado!");
     } catch (error) {
       console.error("Error updating status:", error);
       toast.error("Erro ao atualizar status");
     }
   };
 
   const saveNotes = async () => {
     if (!selectedLead) return;
     
     setIsSaving(true);
     try {
       const { error } = await supabase
         .from("b2b_leads")
         .update({ notes })
         .eq("id", selectedLead.id);
 
       if (error) throw error;
 
       setLeads(prev => prev.map(lead => 
         lead.id === selectedLead.id ? { ...lead, notes } : lead
       ));
       setSelectedLead(prev => prev ? { ...prev, notes } : null);
       toast.success("Anotações salvas!");
     } catch (error) {
       console.error("Error saving notes:", error);
       toast.error("Erro ao salvar anotações");
     } finally {
       setIsSaving(false);
     }
   };
 
   const deleteLead = async (leadId: string) => {
     if (!confirm("Tem certeza que deseja excluir este lead?")) return;
 
     try {
       const { error } = await supabase
         .from("b2b_leads")
         .delete()
         .eq("id", leadId);
 
       if (error) throw error;
 
       setLeads(prev => prev.filter(lead => lead.id !== leadId));
       setIsDetailOpen(false);
       toast.success("Lead excluído!");
     } catch (error) {
       console.error("Error deleting lead:", error);
       toast.error("Erro ao excluir lead");
     }
   };
 
   const openDetail = (lead: B2BLead) => {
     setSelectedLead(lead);
     setNotes(lead.notes || "");
     setIsDetailOpen(true);
   };
 
   const filteredLeads = leads.filter(lead => {
     const matchesSearch = 
       lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       lead.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       lead.email.toLowerCase().includes(searchQuery.toLowerCase());
     
     const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
     
     return matchesSearch && matchesStatus;
   });
 
   const getStatusBadge = (status: string) => {
     const statusInfo = statusOptions.find(s => s.value === status) || statusOptions[0];
     return (
       <Badge variant="outline" className="gap-1.5">
         <span className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
         {statusInfo.label}
       </Badge>
     );
   };
 
   const stats = {
     total: leads.length,
     novos: leads.filter(l => l.status === "novo").length,
     fechados: leads.filter(l => l.status === "fechado").length,
     perdidos: leads.filter(l => l.status === "perdido").length,
   };
 
   return (
     <div className="space-y-6">
       {/* Stats */}
       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <Card>
           <CardContent className="pt-6">
             <div className="text-2xl font-bold">{stats.total}</div>
             <p className="text-sm text-muted-foreground">Total de Leads</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-6">
             <div className="text-2xl font-bold text-blue-600">{stats.novos}</div>
             <p className="text-sm text-muted-foreground">Novos</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-6">
             <div className="text-2xl font-bold text-green-600">{stats.fechados}</div>
             <p className="text-sm text-muted-foreground">Fechados</p>
           </CardContent>
         </Card>
         <Card>
           <CardContent className="pt-6">
             <div className="text-2xl font-bold text-red-600">{stats.perdidos}</div>
             <p className="text-sm text-muted-foreground">Perdidos</p>
           </CardContent>
         </Card>
       </div>
 
       {/* Filters */}
       <Card>
         <CardHeader className="pb-4">
           <div className="flex flex-col sm:flex-row gap-4 justify-between">
             <div className="flex items-center gap-2">
               <CardTitle className="text-lg">Leads B2B</CardTitle>
               <Button variant="ghost" size="icon" onClick={fetchLeads} disabled={isLoading}>
                 <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
               </Button>
             </div>
             <div className="flex gap-3">
               <div className="relative flex-1 sm:w-64">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   placeholder="Buscar empresa, contato ou email..."
                   className="pl-10"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
               </div>
               <Select value={statusFilter} onValueChange={setStatusFilter}>
                 <SelectTrigger className="w-40">
                   <SelectValue placeholder="Status" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Todos</SelectItem>
                   {statusOptions.map(status => (
                     <SelectItem key={status.value} value={status.value}>
                       {status.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>
         </CardHeader>
         <CardContent>
           {isLoading ? (
             <div className="flex items-center justify-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
             </div>
           ) : filteredLeads.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">
               <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
               <p>Nenhum lead B2B encontrado</p>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Empresa</TableHead>
                     <TableHead>Contato</TableHead>
                     <TableHead>Localização</TableHead>
                     <TableHead>Festas/mês</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Data</TableHead>
                     <TableHead className="text-right">Ações</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredLeads.map(lead => (
                     <TableRow key={lead.id}>
                       <TableCell>
                         <div className="font-medium">{lead.company_name}</div>
                       </TableCell>
                       <TableCell>
                         <div className="text-sm">{lead.contact_name}</div>
                         <div className="text-xs text-muted-foreground">{lead.email}</div>
                       </TableCell>
                       <TableCell>
                         {lead.city && lead.state ? (
                           <span className="text-sm">{lead.city}, {lead.state}</span>
                         ) : (
                           <span className="text-muted-foreground text-sm">-</span>
                         )}
                       </TableCell>
                       <TableCell>
                         {lead.monthly_parties ? (
                           <span className="text-sm">{lead.monthly_parties}</span>
                         ) : (
                           <span className="text-muted-foreground text-sm">-</span>
                         )}
                       </TableCell>
                       <TableCell>
                         <Select
                           value={lead.status}
                           onValueChange={(value) => updateLeadStatus(lead.id, value)}
                         >
                           <SelectTrigger className="w-36 h-8">
                             <SelectValue>{getStatusBadge(lead.status)}</SelectValue>
                           </SelectTrigger>
                           <SelectContent>
                             {statusOptions.map(status => (
                               <SelectItem key={status.value} value={status.value}>
                                 <div className="flex items-center gap-2">
                                   <span className={`w-2 h-2 rounded-full ${status.color}`} />
                                   {status.label}
                                 </div>
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </TableCell>
                       <TableCell>
                         <span className="text-sm text-muted-foreground">
                           {format(new Date(lead.created_at), "dd/MM/yy", { locale: ptBR })}
                         </span>
                       </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDetail(lead)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
           )}
         </CardContent>
       </Card>
 
        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
            {selectedLead && (
              <>
                {/* Header com gradiente */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-bold">
                          {selectedLead.company_name}
                        </DialogTitle>
                        <DialogDescription className="mt-0.5">
                          Capturado em {format(new Date(selectedLead.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                        </DialogDescription>
                      </div>
                    </div>
                    <Select
                      value={selectedLead.status}
                      onValueChange={(value) => {
                        updateLeadStatus(selectedLead.id, value);
                        setSelectedLead(prev => prev ? { ...prev, status: value } : null);
                      }}
                    >
                      <SelectTrigger className="w-40 h-9">
                        <SelectValue>{getStatusBadge(selectedLead.status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${status.color}`} />
                              {status.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogHeader className="sr-only">
                  <DialogTitle>{selectedLead.company_name}</DialogTitle>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-5">
                  {/* Contato - cards compactos */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Responsável</p>
                        <p className="font-medium text-sm truncate">{selectedLead.contact_name}</p>
                        <a href={`mailto:${selectedLead.email}`} className="text-xs text-primary hover:underline truncate block">
                          {selectedLead.email}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        {selectedLead.phone ? (
                          <a href={`tel:${selectedLead.phone}`} className="font-medium text-sm text-primary hover:underline">
                            {selectedLead.phone}
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>
                    </div>
                    {(selectedLead.city || selectedLead.state) && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Localização</p>
                          <p className="font-medium text-sm">{[selectedLead.city, selectedLead.state].filter(Boolean).join(", ")}</p>
                        </div>
                      </div>
                    )}
                    {selectedLead.instagram && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Instagram</p>
                          <a href={`https://instagram.com/${selectedLead.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-primary hover:underline">
                            {selectedLead.instagram}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dados do Negócio */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Perfil do Negócio</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedLead.monthly_leads && (
                        <div className="p-3 rounded-xl border bg-card text-center">
                          <p className="text-lg font-bold text-foreground">{selectedLead.monthly_leads}</p>
                          <p className="text-xs text-muted-foreground">Leads/mês</p>
                        </div>
                      )}
                      {selectedLead.monthly_parties && (
                        <div className="p-3 rounded-xl border bg-card text-center">
                          <p className="text-lg font-bold text-foreground flex items-center justify-center gap-1">
                            <PartyPopper className="h-4 w-4 text-primary" />
                            {selectedLead.monthly_parties}
                          </p>
                          <p className="text-xs text-muted-foreground">Festas/mês</p>
                        </div>
                      )}
                      {selectedLead.lead_cost && (
                        <div className="p-3 rounded-xl border bg-card text-center">
                          <p className="text-lg font-bold text-foreground">{selectedLead.lead_cost}</p>
                          <p className="text-xs text-muted-foreground">Custo/lead</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info detalhada em lista */}
                  {(selectedLead.has_lead_clarity !== null || selectedLead.lead_organization || selectedLead.how_found_us || selectedLead.source) && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Detalhes</h4>
                      <div className="space-y-2">
                        {selectedLead.has_lead_clarity !== null && (
                          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                            <span className="text-sm text-muted-foreground">Clareza dos leads</span>
                            <Badge variant={selectedLead.has_lead_clarity ? "default" : "secondary"} className="text-xs">
                              {selectedLead.has_lead_clarity ? "Sim, tem controle" : "Sem clareza"}
                            </Badge>
                          </div>
                        )}
                        {selectedLead.lead_organization && (
                          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                            <span className="text-sm text-muted-foreground">Organização</span>
                            <span className="text-sm font-medium">{selectedLead.lead_organization}</span>
                          </div>
                        )}
                        {selectedLead.how_found_us && (
                          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                            <span className="text-sm text-muted-foreground">Como nos encontrou</span>
                            <span className="text-sm font-medium">{howFoundUsLabels[selectedLead.how_found_us] || selectedLead.how_found_us}</span>
                          </div>
                        )}
                        {selectedLead.source && (
                          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                            <span className="text-sm text-muted-foreground">Origem</span>
                            <Badge variant="outline" className="text-xs">{selectedLead.source}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Desafios */}
                  {selectedLead.main_challenges && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Principal Desafio</h4>
                      <div className="p-4 rounded-xl bg-accent/50 border border-accent">
                        <p className="text-sm flex items-start gap-2.5">
                          <MessageSquare className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                          {selectedLead.main_challenges}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Anotações */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Anotações Internas</h4>
                    <Textarea
                      placeholder="Adicione observações sobre este lead..."
                      className="min-h-[100px] resize-none"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <Button 
                      className="mt-2" 
                      size="sm"
                      onClick={saveNotes}
                      disabled={isSaving}
                    >
                      {isSaving ? "Salvando..." : "Salvar Anotações"}
                    </Button>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between pt-3 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteLead(selectedLead.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Lead
                    </Button>
                    <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
     </div>
   );
 }