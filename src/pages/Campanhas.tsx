import { useState, useEffect } from "react";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Plus, CheckCircle2, XCircle, Clock, Loader2, Users, Menu, ImageIcon, Trash2, Play, RotateCcw, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CampaignWizard } from "@/components/campanhas/CampaignWizard";
import { CampaignSendDialog } from "@/components/campanhas/CampaignSendDialog";
import { CampaignDetailSheet } from "@/components/campanhas/CampaignDetailSheet";
import { BaseLeadsTab } from "@/components/campanhas/BaseLeadsTab";
import { CampaignGalleryTab } from "@/components/campanhas/CampaignGalleryTab";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { GuiaCampanhasDialog } from "@/components/guias/GuiaCampanhasDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [sendCampaign, setSendCampaign] = useState<Campaign | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [editingAudienceCampaign, setEditingAudienceCampaign] = useState<Campaign | null>(null);
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

  const handleToggleActive = async (campaign: Campaign, active: boolean) => {
    const newStatus = active ? "draft" : "cancelled";
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

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
    draft: { label: "Rascunho", variant: "secondary", icon: Clock },
    sending: { label: "Enviando", variant: "default", icon: Loader2 },
    completed: { label: "Concluída", variant: "outline", icon: CheckCircle2 },
    cancelled: { label: "Cancelada", variant: "destructive", icon: XCircle },
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
                  currentPage="atendimento"
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
              <div className="flex justify-end mb-4">
                <Button onClick={() => setWizardOpen(true)} size="sm">
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
                <div className="space-y-3">
                  {campaigns.map((campaign) => {
                    const sc = statusConfig[campaign.status] || statusConfig.draft;
                    const StatusIcon = sc.icon;
                    return (
                      <Card key={campaign.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDetailCampaign(campaign)}>
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold truncate">{campaign.name}</p>
                              <Badge variant={sc.variant} className="shrink-0 text-[10px]">
                                <StatusIcon className={`w-3 h-3 mr-1 ${campaign.status === "sending" ? "animate-spin" : ""}`} />
                                {sc.label}
                              </Badge>
                            </div>
                            {campaign.description && (
                              <p className="text-sm text-muted-foreground truncate">{campaign.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-3 text-sm">
                              <div className="text-center">
                                <p className="font-bold text-lg">{campaign.total_recipients}</p>
                                <p className="text-[10px] text-muted-foreground">Total</p>
                              </div>
                              <div className="text-center">
                                <p className="font-bold text-lg text-green-600">{campaign.sent_count}</p>
                                <p className="text-[10px] text-muted-foreground">Enviados</p>
                              </div>
                              {campaign.error_count > 0 && (
                                <div className="text-center">
                                  <p className="font-bold text-lg text-destructive">{campaign.error_count}</p>
                                  <p className="text-[10px] text-muted-foreground">Erros</p>
                                </div>
                              )}
                            </div>
                            <div
                              className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-card"
                              onClick={(e) => e.stopPropagation()}
                              title={campaign.status === "cancelled" ? "Campanha desativada" : "Campanha ativa"}
                            >
                              <Switch
                                checked={campaign.status !== "cancelled"}
                                onCheckedChange={(v) => handleToggleActive(campaign, v)}
                                disabled={campaign.status === "completed"}
                              />
                              <span className="text-[10px] text-muted-foreground">
                                {campaign.status === "cancelled" ? "Inativa" : "Ativa"}
                              </span>
                            </div>
                            {(campaign.status === "draft" || campaign.status === "sending") && (
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (campaign.status === "sending") {
                                    setCampaignToReset(campaign);
                                  } else {
                                    setSendCampaign(campaign);
                                  }
                                }}
                              >
                                {campaign.status === "sending" ? (
                                  <><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Retomar</>
                                ) : (
                                  <><Play className="h-3.5 w-3.5 mr-1.5" /> Iniciar</>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              onClick={(e) => { e.stopPropagation(); setDetailCampaign(campaign); }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" /> Prévia
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setCampaignToDelete(campaign); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
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
            onResend={(c) => { setSendCampaign(c); }}
            onEditAudience={(c) => { setDetailCampaign(null); setEditingAudienceCampaign(c); }}
            onRefresh={loadCampaigns}
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
