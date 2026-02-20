import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Company } from "@/types/company";
import { HubLayout } from "@/components/hub/HubLayout";
import { CompanyFormDialog } from "@/components/admin/CompanyFormDialog";
import { CompanyMembersSheet } from "@/components/admin/CompanyMembersSheet";
import { CreateCompanyAdminDialog } from "@/components/hub/CreateCompanyAdminDialog";
import { CompanyModulesDialog } from "@/components/hub/CompanyModulesDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, Plus, Pencil, Users, Loader2, UserPlus, Link2, Copy, ClipboardList, MessageSquare, BarChart3, Clock, CheckCircle2, AlertCircle, Globe, AlertTriangle, ExternalLink, Settings2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [membersCompany, setMembersCompany] = useState<Company | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [conversationCounts, setConversationCounts] = useState<Record<string, number>>({});
  const [onboardingStatus, setOnboardingStatus] = useState<Record<string, { status: string; updated_at: string }>>({});
  const [adminDialogCompany, setAdminDialogCompany] = useState<Company | null>(null);
  const [modulesCompany, setModulesCompany] = useState<Company | null>(null);
  const [deleteCompany, setDeleteCompany] = useState<Company | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("companies").select("*").order("name");
    if (error) { console.error(error); }
    else {
      setCompanies((data || []) as Company[]);
      
      // Fetch all stats in parallel
      const [ucRes, leadsRes, convsRes, onbRes] = await Promise.all([
        supabase.from("user_companies").select("company_id"),
        supabase.from("campaign_leads").select("company_id"),
        supabase.from("wapi_conversations").select("company_id"),
        supabase.from("company_onboarding").select("company_id, status, updated_at").order("created_at", { ascending: false }),
      ]);

      if (ucRes.data) {
        const counts: Record<string, number> = {};
        ucRes.data.forEach((uc) => { counts[uc.company_id] = (counts[uc.company_id] || 0) + 1; });
        setMemberCounts(counts);
      }
      if (leadsRes.data) {
        const counts: Record<string, number> = {};
        leadsRes.data.forEach((l) => { counts[l.company_id] = (counts[l.company_id] || 0) + 1; });
        setLeadCounts(counts);
      }
      if (convsRes.data) {
        const counts: Record<string, number> = {};
        convsRes.data.forEach((c) => { counts[c.company_id] = (counts[c.company_id] || 0) + 1; });
        setConversationCounts(counts);
      }
      if (onbRes.data) {
        const map: Record<string, { status: string; updated_at: string }> = {};
        onbRes.data.forEach((o) => {
          if (!map[o.company_id]) map[o.company_id] = { status: o.status, updated_at: o.updated_at };
        });
        setOnboardingStatus(map);
      }
    }
    setIsLoading(false);
  };

  const normalizeDomain = (domain: string) => {
    if (!domain) return null;
    return domain.replace(/^https?:\/\//, '').replace(/\/+$/, '') || null;
  };

  const handleCreate = async (data: { name: string; slug: string; is_active: boolean; logo_url: string; custom_domain: string }) => {
    const hubCompany = companies.find(c => !c.parent_id);
    const { error } = await supabase.from("companies").insert({
      name: data.name, slug: data.slug, is_active: data.is_active, logo_url: data.logo_url || null,
      custom_domain: normalizeDomain(data.custom_domain),
      parent_id: hubCompany?.id || null,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); throw error; }
    toast({ title: "Empresa criada" }); fetchCompanies();
  };

  const handleUpdate = async (data: { name: string; slug: string; is_active: boolean; logo_url: string; custom_domain: string }) => {
    if (!editingCompany) return;
    const { error } = await supabase.from("companies").update({
      name: data.name, slug: data.slug, is_active: data.is_active, logo_url: data.logo_url || null,
      custom_domain: normalizeDomain(data.custom_domain),
    }).eq("id", editingCompany.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); throw error; }
    toast({ title: "Empresa atualizada" }); setEditingCompany(null); fetchCompanies();
  };

  const handleDelete = async () => {
    if (!deleteCompany) return;
    setIsDeleting(true);
    const { error } = await supabase.from("companies").delete().eq("id", deleteCompany.id);
    setIsDeleting(false);
    setDeleteCompany(null);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Empresa excluída" });
      fetchCompanies();
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      <AlertDialog open={!!deleteCompany} onOpenChange={(open) => !open && setDeleteCompany(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteCompany?.name}</strong>? Esta ação não pode ser desfeita e removerá todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir empresa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CompanyFormDialog open={formOpen} onOpenChange={setFormOpen} company={editingCompany} onSubmit={editingCompany ? handleUpdate : handleCreate} />
      <CompanyMembersSheet open={membersOpen} onOpenChange={setMembersOpen} company={membersCompany} />
      {adminDialogCompany && (
        <CreateCompanyAdminDialog
          open={!!adminDialogCompany}
          onOpenChange={(open) => !open && setAdminDialogCompany(null)}
          companyId={adminDialogCompany.id}
          companyName={adminDialogCompany.name}
          onSuccess={fetchCompanies}
        />
      )}
      <CompanyModulesDialog
        open={!!modulesCompany}
        onOpenChange={(open) => !open && setModulesCompany(null)}
        company={modulesCompany}
        onSuccess={fetchCompanies}
      />

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
        <div className="grid gap-5 md:grid-cols-2">
          {companies.filter(c => c.parent_id !== null).map((child) => {
            const members = memberCounts[child.id] || 0;
            const rawDomain = child.custom_domain || '';
            const domainUrl = rawDomain
              ? (rawDomain.startsWith('http') ? rawDomain : `https://${rawDomain}`)
              : window.location.origin;
            // domainUrl is used for copy; window.location.origin for opening
            const copyLink = (path: string, label: string) => {
              const url = `${domainUrl}${path}`;
              navigator.clipboard.writeText(url);
              toast({ title: `${label} copiado!`, description: url });
            };

            return (
              <div key={child.id} className="rounded-xl border bg-card p-6 space-y-4 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {child.logo_url ? (
                      <img src={child.logo_url} alt={child.name} className="h-12 w-12 rounded-xl object-contain bg-muted shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate text-base">{child.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">/{child.slug}</p>
                    </div>
                  </div>
                  <Badge variant={child.is_active ? "default" : "secondary"}>{child.is_active ? "Ativa" : "Inativa"}</Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40">
                    <Users className="h-4 w-4 text-primary mb-1" />
                    <span className="text-lg font-bold text-foreground">{members}</span>
                    <span className="text-[10px] text-muted-foreground">Membros</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40">
                    <BarChart3 className="h-4 w-4 text-accent mb-1" />
                    <span className="text-lg font-bold text-foreground">{leadCounts[child.id] || 0}</span>
                    <span className="text-[10px] text-muted-foreground">Leads</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-lg bg-muted/40">
                    <MessageSquare className="h-4 w-4 text-secondary mb-1" />
                    <span className="text-lg font-bold text-foreground">{conversationCounts[child.id] || 0}</span>
                    <span className="text-[10px] text-muted-foreground">Conversas</span>
                  </div>
                </div>

                {/* Onboarding Status */}
                {onboardingStatus[child.id] ? (
                  <div className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg text-sm",
                    onboardingStatus[child.id].status === 'completo' ? "bg-accent/10 text-accent" :
                    onboardingStatus[child.id].status === 'em_andamento' ? "bg-secondary/10 text-secondary" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {onboardingStatus[child.id].status === 'completo' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> :
                     onboardingStatus[child.id].status === 'em_andamento' ? <Clock className="h-4 w-4 shrink-0" /> :
                     <AlertCircle className="h-4 w-4 shrink-0" />}
                    <span className="text-xs font-medium">
                      Onboarding {onboardingStatus[child.id].status === 'completo' ? 'completo' :
                                  onboardingStatus[child.id].status === 'em_andamento' ? 'em andamento' : 'pendente'}
                    </span>
                    <span className="text-[10px] ml-auto opacity-70">
                      {new Date(onboardingStatus[child.id].updated_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 text-muted-foreground text-xs">
                    <ClipboardList className="h-4 w-4 shrink-0" />
                    <span>Onboarding não iniciado</span>
                  </div>
                )}

                <Separator />

                {/* Domain + Links Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Links</p>
                    {child.custom_domain ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                        <Globe className="h-3 w-3" /> {child.custom_domain}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        <AlertTriangle className="h-3 w-3" /> Sem domínio
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30 text-left group">
                      <Link2 className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">Login</p>
                        <p className="text-[10px] text-muted-foreground truncate">/auth/{child.slug}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => window.open(`${window.location.origin}/auth/${child.slug}`, '_blank')}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Abrir link"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-primary" />
                        </button>
                        <button
                          onClick={() => copyLink(`/auth/${child.slug}`, "Link de login")}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Copiar link"
                        >
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30 text-left group">
                      <ClipboardList className="h-4 w-4 text-accent shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">Onboarding</p>
                        <p className="text-[10px] text-muted-foreground truncate">/onboarding/{child.slug}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => window.open(`${window.location.origin}/onboarding/${child.slug}`, '_blank')}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Abrir link"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-primary" />
                        </button>
                        <button
                          onClick={() => copyLink(`/onboarding/${child.slug}`, "Link de onboarding")}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Copiar link"
                        >
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {child.custom_domain && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30 text-left group mt-2">
                      <Globe className="h-4 w-4 text-secondary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">Landing Page</p>
                        <p className="text-[10px] text-muted-foreground truncate">{child.custom_domain}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => window.open(`https://${child.custom_domain}`, '_blank')}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Abrir LP"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-primary" />
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`https://${child.custom_domain}`);
                            toast({ title: "Link da LP copiado!", description: `https://${child.custom_domain}` });
                          }}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          title="Copiar link"
                        >
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingCompany(child); setFormOpen(true); }}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMembersCompany(child); setMembersOpen(true); }}>
                    <Users className="mr-1.5 h-3.5 w-3.5" /> Membros
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setModulesCompany(child)} title="Módulos">
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteCompany(child)} title="Excluir empresa" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {members === 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => setAdminDialogCompany(child)}
                  >
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Criar Primeiro Admin
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
