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
   Calendar, 
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
         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
           {selectedLead && (
             <>
               <DialogHeader>
                 <DialogTitle className="flex items-center gap-2">
                   <Building2 className="h-5 w-5" />
                   {selectedLead.company_name}
                 </DialogTitle>
                 <DialogDescription>
                   Lead capturado em {format(new Date(selectedLead.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                 </DialogDescription>
               </DialogHeader>
 
               <div className="space-y-6">
                 {/* Contact Info */}
                 <div className="grid sm:grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <Label className="text-muted-foreground">Responsável</Label>
                     <p className="font-medium">{selectedLead.contact_name}</p>
                   </div>
                   <div className="space-y-1">
                     <Label className="text-muted-foreground">Email</Label>
                     <p className="font-medium flex items-center gap-2">
                       <Mail className="h-4 w-4" />
                       <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">
                         {selectedLead.email}
                       </a>
                     </p>
                   </div>
                   {selectedLead.phone && (
                     <div className="space-y-1">
                       <Label className="text-muted-foreground">Telefone</Label>
                       <p className="font-medium flex items-center gap-2">
                         <Phone className="h-4 w-4" />
                         <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">
                           {selectedLead.phone}
                         </a>
                       </p>
                     </div>
                   )}
                   {(selectedLead.city || selectedLead.state) && (
                     <div className="space-y-1">
                       <Label className="text-muted-foreground">Localização</Label>
                       <p className="font-medium flex items-center gap-2">
                         <MapPin className="h-4 w-4" />
                         {[selectedLead.city, selectedLead.state].filter(Boolean).join(", ")}
                       </p>
                     </div>
                   )}
                 </div>
 
                 {/* Business Info */}
                 <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                   {selectedLead.instagram && (
                     <div className="space-y-1">
                       <Label className="text-muted-foreground">Instagram</Label>
                       <p className="font-medium">
                         <a href={`https://instagram.com/${selectedLead.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                           {selectedLead.instagram}
                         </a>
                       </p>
                     </div>
                   )}
                   {selectedLead.monthly_parties && (
                     <div className="space-y-1">
                       <Label className="text-muted-foreground">Festas por mês</Label>
                       <p className="font-medium flex items-center gap-2">
                         <PartyPopper className="h-4 w-4" />
                         {selectedLead.monthly_parties}
                       </p>
                     </div>
                   )}
                   {selectedLead.monthly_leads && (
                     <div className="space-y-1">
                       <Label className="text-muted-foreground">Leads por mês</Label>
                       <p className="font-medium">{selectedLead.monthly_leads}</p>
                     </div>
                   )}
                   {selectedLead.lead_cost && (
                     <div className="space-y-1">
                       <Label className="text-muted-foreground">Custo por lead</Label>
                       <p className="font-medium">{selectedLead.lead_cost}</p>
                     </div>
                   )}
                   {selectedLead.has_lead_clarity !== null && (
                     <div className="space-y-1">
                       <Label className="text-muted-foreground">Clareza dos leads</Label>
                       <p className="font-medium">{selectedLead.has_lead_clarity ? "Sim, tem controle" : "Não tem clareza"}</p>
                     </div>
                   )}
                   {selectedLead.lead_organization && (
                     <div className="space-y-1">
                       <Label className="text-muted-foreground">Organização atual</Label>
                       <p className="font-medium">{selectedLead.lead_organization}</p>
                     </div>
                   )}
                   {selectedLead.current_tools && (
                     <div className="space-y-1">
                       <Label className="text-muted-foreground">Ferramentas atuais</Label>
                       <p className="font-medium">{selectedLead.current_tools}</p>
                     </div>
                   )}
                   {selectedLead.how_found_us && (
                     <div className="space-y-1">
                       <Label className="text-muted-foreground">Como nos encontrou</Label>
                       <p className="font-medium">
                         {howFoundUsLabels[selectedLead.how_found_us] || selectedLead.how_found_us}
                       </p>
                     </div>
                   )}
                   {selectedLead.source && (
                     <div className="space-y-1">
                       <Label className="text-muted-foreground">Origem</Label>
                       <Badge variant="outline">{selectedLead.source}</Badge>
                     </div>
                   )}
                 </div>
 
                 {/* Challenges */}
                 {selectedLead.main_challenges && (
                   <div className="pt-4 border-t">
                     <Label className="text-muted-foreground">Principal desafio</Label>
                     <div className="mt-2 p-3 bg-muted rounded-lg">
                       <p className="text-sm flex items-start gap-2">
                         <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                         {selectedLead.main_challenges}
                       </p>
                     </div>
                   </div>
                 )}
 
                 {/* Status */}
                 <div className="pt-4 border-t">
                   <Label className="text-muted-foreground">Status</Label>
                   <Select
                     value={selectedLead.status}
                     onValueChange={(value) => {
                       updateLeadStatus(selectedLead.id, value);
                       setSelectedLead(prev => prev ? { ...prev, status: value } : null);
                     }}
                   >
                     <SelectTrigger className="w-48 mt-2">
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
 
                 {/* Notes */}
                 <div className="pt-4 border-t">
                   <Label htmlFor="notes">Anotações internas</Label>
                   <Textarea
                     id="notes"
                     placeholder="Adicione observações sobre este lead..."
                     className="mt-2"
                     rows={4}
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
 
                 {/* Actions */}
                 <div className="flex justify-between pt-4 border-t">
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