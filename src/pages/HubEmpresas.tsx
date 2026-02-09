import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Company } from "@/types/company";
import { HubLayout } from "@/components/hub/HubLayout";
import { CompanyFormDialog } from "@/components/admin/CompanyFormDialog";
import { CompanyMembersSheet } from "@/components/admin/CompanyMembersSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Pencil, Users, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function HubEmpresas() {
  return (
    <HubLayout
      currentPage="empresas"
      header={
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Empresas
          </h1>
          <p className="text-xs text-muted-foreground">Gerencie as empresas e seus membros</p>
        </div>
      }
    >
      {() => <HubEmpresasContent />}
    </HubLayout>
  );
}

function HubEmpresasContent() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [membersCompany, setMembersCompany] = useState<Company | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("companies").select("*").order("name");
    if (error) { console.error(error); }
    else {
      setCompanies((data || []) as Company[]);
      const { data: ucData } = await supabase.from("user_companies").select("company_id");
      if (ucData) {
        const counts: Record<string, number> = {};
        ucData.forEach((uc) => { counts[uc.company_id] = (counts[uc.company_id] || 0) + 1; });
        setMemberCounts(counts);
      }
    }
    setIsLoading(false);
  };

  const handleCreate = async (data: { name: string; slug: string; is_active: boolean; logo_url: string }) => {
    const { error } = await supabase.from("companies").insert({ name: data.name, slug: data.slug, is_active: data.is_active, logo_url: data.logo_url || null });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); throw error; }
    toast({ title: "Empresa criada" }); fetchCompanies();
  };

  const handleUpdate = async (data: { name: string; slug: string; is_active: boolean; logo_url: string }) => {
    if (!editingCompany) return;
    const { error } = await supabase.from("companies").update({ name: data.name, slug: data.slug, is_active: data.is_active, logo_url: data.logo_url || null }).eq("id", editingCompany.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); throw error; }
    toast({ title: "Empresa atualizada" }); setEditingCompany(null); fetchCompanies();
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <CompanyFormDialog open={formOpen} onOpenChange={setFormOpen} company={editingCompany} onSubmit={editingCompany ? handleUpdate : handleCreate} />
      <CompanyMembersSheet open={membersOpen} onOpenChange={setMembersOpen} company={membersCompany} />

      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingCompany(null); setFormOpen(true); }} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      {companies.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Nenhuma empresa cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {companies.filter(c => !c.parent_id).map((parent) => {
            const children = companies.filter(c => c.parent_id === parent.id);
            return (
              <div key={parent.id} className="space-y-3">
                <div className="rounded-xl border-2 border-primary/30 bg-card p-5 space-y-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {parent.logo_url ? (
                        <img src={parent.logo_url} alt={parent.name} className="h-10 w-10 rounded-lg object-contain bg-muted shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{parent.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{parent.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary/40 text-primary text-xs">Empresa-mãe</Badge>
                      <Badge variant={parent.is_active ? "default" : "secondary"}>{parent.is_active ? "Ativa" : "Inativa"}</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {memberCounts[parent.id] || 0} membro{(memberCounts[parent.id] || 0) !== 1 ? "s" : ""}
                    {children.length > 0 && (
                      <span className="ml-3 flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" /> {children.length} empresa{children.length !== 1 ? "s" : ""} filha{children.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingCompany(parent); setFormOpen(true); }}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMembersCompany(parent); setMembersOpen(true); }}>
                      <Users className="mr-1.5 h-3.5 w-3.5" /> Membros
                    </Button>
                  </div>
                </div>

                {children.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-6 border-l-2 border-primary/20 ml-5">
                    {children.map((child) => (
                      <div key={child.id} className="rounded-xl border bg-card p-5 space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {child.logo_url ? (
                              <img src={child.logo_url} alt={child.name} className="h-10 w-10 rounded-lg object-contain bg-muted shrink-0" />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Building2 className="h-5 w-5 text-primary" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="font-semibold text-foreground truncate">{child.name}</h3>
                              <p className="text-xs text-muted-foreground truncate">{child.slug}</p>
                            </div>
                          </div>
                          <Badge variant={child.is_active ? "default" : "secondary"}>{child.is_active ? "Ativa" : "Inativa"}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {memberCounts[child.id] || 0} membro{(memberCounts[child.id] || 0) !== 1 ? "s" : ""}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingCompany(child); setFormOpen(true); }}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMembersCompany(child); setMembersOpen(true); }}>
                            <Users className="mr-1.5 h-3.5 w-3.5" /> Membros
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
