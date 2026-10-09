import { useState, useEffect } from "react";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Plus, Loader2, Users, Menu, ImageIcon, UserX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CampaignWizard } from "@/components/campanhas/CampaignWizard";
import { CampaignSendDialog } from "@/components/campanhas/CampaignSendDialog";
import { CampaignDetailSheet } from "@/components/campanhas/CampaignDetailSheet";
import { CampaignCard } from "@/components/campanhas/CampaignCard";
import { OptoutListDialog } from "@/components/campanhas/OptoutListDialog";
import { CampaignEditDialog } from "@/components/campanhas/CampaignEditDialog";
import { BaseLeadsTab } from "@/components/campanhas/BaseLeadsTab";
import { CampaignGalleryTab } from "@/components/campanhas/CampaignGalleryTab";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { GuiaCampanhasDialog } from "@/components/guias/GuiaCampanhasDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { useCampaignSender } from "@/contexts/CampaignSenderContext";
import { campaignState, reactivatedStatus } from "@/lib/campaignState";
import { useQuery } from "@tanstack/react-query";
import { useCampaignResults } from "@/hooks/useCampaignResults";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  total_recipients: number;
  sent_count: number;
  error_count: number;
  message_variations: any;
  image_url: string | null;
  filters: any;
  delay_seconds: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  /** na fila do servidor (sai sozinha) */
  server_send?: boolean | null;
  /** por que o envio parou (ex.: WhatsApp desconectado) */
  last_error?: string | null;
}

export default function Campanhas() {
  const companyId = useCurrentCompanyId();
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user));
  }, []);

  const { isAdmin, canManageUsers } = useUserRole(user?.id);
  const sender = useCampaignSender();
  const { data: results, refetch: refetchResults } = useCampaignResults(companyId || undefined);
  // Quando sai a próxima mensagem desta empresa (ritmo do envio pelo servidor)
  const { data: nextSendAt, refetch: refetchNextSend } = useQuery({
    queryKey: ["campaign-next-send", companyId],
    queryFn: async (): Promise<Date | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("campaign_dispatch_state")
        .select("next_send_at")
        .eq("company_id", companyId)
        .maybeSingle();
      return data?.next_send_at ? new Date(data.next_send_at) : null;
    },
    enabled: !!companyId,
    refetchInterval: 60_000,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [optoutsOpen, setOptoutsOpen] = useState(false);
  const [sendCampaign, setSendCampaign] = useState<Campaign | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [editingAudienceCampaign, setEditingAudienceCampaign] = useState<Campaign | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [campaignToReset, setCampaignToReset] = useState<Campaign | null>(null);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    loadCampaigns();
  }, [companyId]);

  const loadCampaigns = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading campaigns:", error);
      toast.error("Erro ao carregar campanhas");
    }
    setCampaigns((data as Campaign[]) || []);
    setLoading(false);
    refetchResults();
    refetchNextSend();
  };

  const handleDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    setDeleting(true);
    // Delete recipients first, then campaign
    await supabase.from("campaign_recipients").delete().eq("campaign_id", campaignToDelete.id);
    const { error } = await supabase.from("campaigns").delete().eq("id", campaignToDelete.id);
    if (error) {
      toast.error("Erro ao excluir campanha");
    } else {
      toast.success("Campanha excluída!");
      loadCampaigns();
    }
    setDeleting(false);
    setCampaignToDelete(null);
  };

  const handleResetCampaign = async () => {
    if (!campaignToReset) return;
    setResetting(true);
    // Volta status para draft e marca quem estava "sending" como "pending"
    await supabase
      .from("campaign_recipients")
      .update({ status: "pending", error_message: null })
      .eq("campaign_id", campaignToReset.id)
      .eq("status", "sending");
    const { error } = await supabase
      .from("campaigns")
      .update({ status: "draft", started_at: null })
      .eq("id", campaignToReset.id);
    if (error) {
      toast.error("Erro ao resetar campanha");
    } else {
      toast.success("Campanha pronta para retomar!");
      const updated = { ...campaignToReset, status: "draft" };
      setCampaignToReset(null);
      await loadCampaigns();
      setSendCampaign(updated);
    }
    setResetting(false);
  };

  // Pausa o envio pelo servidor; quem falta continua esperando
  const handlePause = async (campaign: Campaign) => {
    const { error } = await supabase.from("campaigns").update({ status: "draft" }).eq("id", campaign.id);
    if (error) {
      toast.error("Erro ao pausar a campanha");
    } else {
      toast.success("Campanha pausada. Para continuar, clique em Continuar.");
      loadCampaigns();
    }
  };

  const handleToggleActive = async (campaign: Campaign, active: boolean) => {
    // Reativar uma campanha que já mandou para todos volta para "Concluída", não "Rascunho"
    const newStatus = active ? reactivatedStatus(campaign) : "cancelled";
    const { error } = await supabase
      .from("campaigns")
      .update({ status: newStatus })
      .eq("id", campaign.id);
    if (error) {
      toast.error("Erro ao atualizar campanha");
    } else {
      toast.success(active ? "Campanha ativada" : "Campanha desativada");
      loadCampaigns();
    }
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar
          canManageUsers={canManageUsers}
          isAdmin={isAdmin}
          currentUserName={currentCompany?.name || ""}
          onRefresh={loadCampaigns}
          onLogout={handleLogout}
        />
        <main className="flex-1 flex flex-col w-full">
          <header className="bg-card border-b border-border sticky top-0 z-10 md:hidden">
            <div className="px-3 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <MobileMenu
                  isOpen={isMobileMenuOpen}
                  onOpenChange={setIsMobileMenuOpen}
                  trigger={
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                      <Menu className="w-5 h-5" />
                    </Button>
                  }
                  currentPage="campanhas"
                  userName={user?.user_metadata?.full_name || ""}
                  userEmail={user?.email || ""}
                  canManageUsers={canManageUsers}
                  isAdmin={isAdmin}
                  onRefresh={loadCampaigns}
                  onLogout={handleLogout}
                />
                <div className="flex items-center gap-2 min-w-0">
                  <img src={getCompanyLogoOverride(currentCompany?.slug, currentCompany?.logo_url) || '/placeholder.svg'} alt={currentCompany?.name || 'Logo'} className="h-8 w-auto shrink-0" />
                  <h1 className="font-display font-bold text-foreground text-sm truncate">Campanhas</h1>
                </div>
              </div>
            </div>
          </header>
          <div className="flex-1 p-3 md:p-5 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-4">
          <div className="hidden md:block">
            <div className="relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
              <div className="relative flex items-center justify-between gap-4 p-5 md:p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                    <Megaphone className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Campanhas</h1>
                    <p className="text-sm text-muted-foreground/70 mt-0.5">Envie mensagens em massa para seus leads</p>
                  </div>
                </div>
                <GuiaCampanhasDialog />
              </div>
            </div>
          </div>

          <Tabs defaultValue="campanhas" className="space-y-4">
            <div className="flex justify-center">
              <TabsList className="bg-transparent p-0 h-auto gap-1.5 flex-wrap">
                <TabsTrigger value="campanhas" className="gap-2 rounded-xl px-5 py-2 text-sm font-medium border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:shadow-none hover:bg-accent hover:text-foreground">
                  <Megaphone className="w-4 h-4 shrink-0" />
                  <span>Campanhas</span>
                </TabsTrigger>
                <TabsTrigger value="galeria" className="gap-2 rounded-xl px-5 py-2 text-sm font-medium border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:shadow-none hover:bg-accent hover:text-foreground">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span>Galeria</span>
                </TabsTrigger>
                <TabsTrigger value="base" className="gap-2 rounded-xl px-5 py-2 text-sm font-medium border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:shadow-none hover:bg-accent hover:text-foreground">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Leads</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="campanhas">
              <div className="flex items-center justify-between gap-2 mb-4">
                <Button variant="ghost" size="sm" className="text-muted-foreground rounded-full" onClick={() => setOptoutsOpen(true)}>
                  <UserX className="w-4 h-4 mr-1.5" />
                  Pediram para sair
                </Button>
                <Button onClick={() => setWizardOpen(true)} size="sm" className="rounded-full">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Nova Campanha
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Megaphone className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground font-medium">Nenhuma campanha criada</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Clique em "Nova Campanha" para começar</p>
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {campaigns.map((campaign) => {
                    const sendingHere = sender.isSending && sender.activeCampaignId === campaign.id;
                    const state = campaignState(campaign, sendingHere);
                    return (
                      <CampaignCard
                        key={campaign.id}
                        campaign={campaign}
                        state={state}
                        result={results?.[campaign.id]}
                        nextSendAt={nextSendAt}
                        onOpen={() => setDetailCampaign(campaign)}
                        onAction={() => {
                          if (state.action === "resume") setCampaignToReset(campaign);
                          else if (state.action === "pause") handlePause(campaign);
                          else setSendCampaign(campaign);
                        }}
                        onEdit={() => setEditingCampaign(campaign)}
                        onToggleActive={(active) => handleToggleActive(campaign, active)}
                        onDelete={() => setCampaignToDelete(campaign)}
                      />
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="base">
              <BaseLeadsTab companyId={companyId || ""} />
            </TabsContent>

            <TabsContent value="galeria">
              <CampaignGalleryTab companyId={companyId || ""} />
            </TabsContent>
          </Tabs>

          <CampaignWizard
            open={wizardOpen || !!editingAudienceCampaign}
            onOpenChange={(o) => {
              if (!o) {
                setWizardOpen(false);
                setEditingAudienceCampaign(null);
              } else {
                setWizardOpen(o);
              }
            }}
            companyId={companyId || ""}
            companyName={currentCompany?.name || ""}
            editingCampaign={editingAudienceCampaign ? {
              id: editingAudienceCampaign.id,
              name: editingAudienceCampaign.name,
              total_recipients: editingAudienceCampaign.total_recipients,
            } : null}
            onCampaignCreated={(campaign) => {
              if (editingAudienceCampaign) {
                setEditingAudienceCampaign(null);
                loadCampaigns();
              } else {
                setWizardOpen(false);
                loadCampaigns();
                setSendCampaign(campaign);
              }
            }}
          />

          {companyId && (
            <OptoutListDialog open={optoutsOpen} onOpenChange={setOptoutsOpen} companyId={companyId} />
          )}
          {sendCampaign && (
            <CampaignSendDialog
              open={!!sendCampaign}
              onOpenChange={(open) => { if (!open) setSendCampaign(null); }}
              campaign={sendCampaign}
              companyId={companyId || ""}
              onComplete={() => {
                setSendCampaign(null);
                loadCampaigns();
              }}
            />
          )}

          <CampaignDetailSheet
            campaign={detailCampaign}
            open={!!detailCampaign}
            onOpenChange={(open) => { if (!open) setDetailCampaign(null); }}
            companyId={companyId || ""}
            onStartSend={(c) => { setDetailCampaign(null); setSendCampaign(c); }}
            onPause={(c) => { setDetailCampaign(null); handlePause(c as Campaign); }}
            onResend={(c) => { setSendCampaign(c); }}
            onEditAudience={(c) => { setDetailCampaign(null); setEditingAudienceCampaign(c); }}
            onRefresh={loadCampaigns}
          />

          <CampaignEditDialog
            campaign={editingCampaign}
            open={!!editingCampaign}
            onOpenChange={(o) => { if (!o) setEditingCampaign(null); }}
            onSaved={loadCampaigns}
          />


          <AlertDialog open={!!campaignToDelete} onOpenChange={(open) => !open && setCampaignToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir a campanha "{campaignToDelete?.name}"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteCampaign}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                >
                  {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={!!campaignToReset} onOpenChange={(open) => !open && setCampaignToReset(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Retomar campanha?</AlertDialogTitle>
                <AlertDialogDescription>
                  A campanha "{campaignToReset?.name}" está marcada como "Enviando" mas não há envio ativo (provavelmente foi interrompida).
                  Deseja resetar e retomar o envio dos contatos pendentes?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetCampaign} disabled={resetting}>
                  {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Retomar envio
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
