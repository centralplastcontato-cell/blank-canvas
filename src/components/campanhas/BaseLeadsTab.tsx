import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2, Users, Pencil, Trash2, Phone, Upload } from "lucide-react";
import { BaseLeadFormDialog } from "./BaseLeadFormDialog";
import { BaseLeadImportDialog } from "./BaseLeadImportDialog";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BaseLead {
  id: string;
  name: string;
  phone: string;
  is_former_client: boolean;
  former_party_info: string | null;
  month_interest: string | null;
  notes: string | null;
}

interface Props {
  companyId: string;
}

function formatPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

export function BaseLeadsTab({ companyId }: Props) {
  const [leads, setLeads] = useState<BaseLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<BaseLead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("base_leads")
      .select("id, name, phone, is_former_client, former_party_info, month_interest, notes")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading base leads:", error);
      toast.error("Erro ao carregar contatos");
    }
    setLeads((data as BaseLead[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (companyId) loadLeads();
  }, [companyId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) => l.name.toLowerCase().includes(q) || l.phone.includes(q)
    );
  }, [leads, search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("base_leads").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir contato");
    } else {
      toast.success("Contato excluído");
      loadLeads();
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-1.5" />
            Importar
          </Button>
          <Button size="sm" onClick={() => { setEditLead(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Adicionar Contato</span>
            <span className="sm:hidden">Adicionar</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium">
            {leads.length === 0 ? "Nenhum contato cadastrado" : "Nenhum contato encontrado"}
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {leads.length === 0
              ? 'Clique em "Adicionar Contato" para começar'
              : "Ajuste sua busca"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">
            {filtered.length} contato{filtered.length !== 1 ? "s" : ""}
          </p>
          {filtered.map((lead) => (
            <Card key={lead.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm truncate">{lead.name}</p>
                    <Badge
                      variant={lead.is_former_client ? "default" : "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {lead.is_former_client ? "Ex-cliente" : "Base"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span>{formatPhoneDisplay(lead.phone)}</span>
                    {lead.is_former_client && lead.former_party_info && (
                      <span className="text-muted-foreground/60"> · {lead.former_party_info}</span>
                    )}
                    {!lead.is_former_client && lead.month_interest && (
                      <span className="text-muted-foreground/60"> · {lead.month_interest}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setEditLead(lead); setFormOpen(true); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(lead.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BaseLeadImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        companyId={companyId}
        onImported={loadLeads}
      />

      <BaseLeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        companyId={companyId}
        editLead={editLead}
        onSaved={loadLeads}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O contato será removido da sua lista de base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
