import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Plus, CheckCircle2, XCircle, Clock, Loader2, Users, Menu, ImageIcon } from "lucide-react";
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
                  <img src={currentCompany?.logo_url || '/placeholder.svg'} alt={currentCompany?.name || 'Logo'} className="h-8 w-auto shrink-0" />
                  <h1 className="font-display font-bold text-foreground text-sm truncate">Campanhas</h1>
                </div>
              </div>
            </div>
          </header>
          <div className="hidden md:flex items-center gap-2 px-4 sm:px-6 pt-6 pb-2">
            <Megaphone className="w-6 h-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold">Campanhas</h1>
          </div>
          <div className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">

          <Tabs defaultValue="campanhas" className="space-y-4">
            <div className="flex justify-center">
              <TabsList className="h-auto p-1.5 gap-1 rounded-full">
                <TabsTrigger value="campanhas" className="gap-2 rounded-full px-5 py-2.5 text-sm font-medium">
                  <Megaphone className="w-4 h-4" />
                  Campanhas
                </TabsTrigger>
                <TabsTrigger value="galeria" className="gap-2 rounded-full px-5 py-2.5 text-sm font-medium">
                  <ImageIcon className="w-4 h-4" />
                  Galeria
                </TabsTrigger>
                <TabsTrigger value="base" className="gap-2 rounded-full px-5 py-2.5 text-sm font-medium">
                  <Users className="w-4 h-4" />
                  Leads de Base
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
                          <div className="text-right shrink-0">
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
            open={wizardOpen}
            onOpenChange={setWizardOpen}
            companyId={companyId || ""}
            companyName={currentCompany?.name || ""}
            onCampaignCreated={(campaign) => {
              setWizardOpen(false);
              loadCampaigns();
              setSendCampaign(campaign);
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
            onRefresh={loadCampaigns}
          />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
