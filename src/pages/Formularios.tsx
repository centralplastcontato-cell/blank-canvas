import { LoadingScreen } from "@/components/ui/loading-screen";
import { useEffect, useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { Button } from "@/components/ui/button";
import { FolderOpen, Menu, ClipboardCheck, PartyPopper, UtensilsCrossed, FileText, Package, PackagePlus, Users, Wrench, HardHat, ShieldAlert, CreditCard, UserCheck, UserPlus, Landmark, Star, Eye, Wallet, CalendarHeart, ClipboardList, Info } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { AvaliacoesContent } from "./Avaliacoes";
import { PreFestaContent } from "./PreFesta";
import { CardapioContent } from "./Cardapio";
import { EventStaffManager } from "@/components/agenda/EventStaffManager";
import { AccessDeniedRedirect } from "@/components/AccessDeniedRedirect";

import { PackagesManager } from "@/components/admin/PackagesManager";
import { OptionalsManager } from "@/components/admin/OptionalsManager";
import { MaintenanceManager } from "@/components/agenda/MaintenanceManager";
import { PartyMonitoringManager } from "@/components/agenda/PartyMonitoringManager";
import { AttendanceManager } from "@/components/agenda/AttendanceManager";
import { EventInfoManager } from "@/components/agenda/EventInfoManager";
import { FreelancerManagerContent } from "./FreelancerManager";
import { FreelancerEvaluationsTab } from "@/components/freelancer/FreelancerEvaluationsTab";
import { FreelancerCandidatesTab } from "@/components/freelancer/FreelancerCandidatesTab";
import { CardFeesManager } from "@/components/admin/CardFeesManager";
import { SellersManager } from "@/components/admin/SellersManager";
import { BankAccountsManager } from "@/components/financial/BankAccountsManager";
import { EventTypesConfig } from "@/components/admin/EventTypesConfig";
import { GuiaOperacoesDialog } from "@/components/guias/GuiaOperacoesDialog";
import { HubLayout, type HubGroup, type HubTone } from "@/components/settings/HubLayout";

// Operações no mesmo formato de Configurações (22/10): 5 grupos empilhados no
// lugar das duas fileiras de abas. As permissões de cada item são as mesmas de
// antes. O formulário antigo de Contrato saiu da tela (respostas ficam no banco).
const TONES: Record<string, HubTone> = {
  cadastros: { chip: "bg-amber-500/15 text-amber-600", line: "border-amber-500/30", active: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  formularios: { chip: "bg-pink-500/15 text-pink-600", line: "border-pink-500/30", active: "bg-pink-500/10 text-pink-700 dark:text-pink-400" },
  dia: { chip: "bg-violet-500/15 text-violet-600", line: "border-violet-500/30", active: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
  freelancers: { chip: "bg-sky-500/15 text-sky-600", line: "border-sky-500/30", active: "bg-sky-500/10 text-sky-700 dark:text-sky-400" },
  financeiro: { chip: "bg-emerald-500/15 text-emerald-600", line: "border-emerald-500/30", active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
};
const toneOf = (id: string) => TONES[id] || TONES.cadastros;

// Links antigos (?section= / ?tab= / ?sub=) continuam abrindo o lugar certo
const LEGACY_SECTION: Record<string, string> = {
  contratos: "pacotes",
  opcionais: "opcionais",
  tipos_festa: "tipos",
  vendedores: "vendedores",
  taxas_cartao: "taxas",
  contas_bancarias: "contas",
  checklist: "equipe",
};
const LEGACY_TAB: Record<string, string> = {
  avaliacoes: "avaliacao",
  avaliacao: "avaliacao",
  prefesta: "prefesta",
  cardapio: "cardapio",
};

function legacyItem(params: URLSearchParams): string | null {
  const section = params.get("section");
  if (section === "freelancer") return params.get("sub") === "candidatos" ? "fl-candidatos" : "fl-cadastro";
  if (section && LEGACY_SECTION[section]) return LEGACY_SECTION[section];
  return LEGACY_TAB[params.get("tab") || ""] || null;
}

export default function Formularios() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; avatar?: string | null } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});

  const isMobile = useIsMobile();

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const [profileResult, adminResult, permsResult, roleResult] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single(),
        supabase.rpc("is_admin", { _user_id: user.id }),
        supabase.from("user_permissions").select("permission, granted").eq("user_id", user.id),
        supabase.from("user_companies").select("role").eq("user_id", user.id).limit(1).single(),
      ]);
      setCurrentUser({ id: user.id, name: profileResult.data?.full_name || "Usuário", email: user.email || "", avatar: profileResult.data?.avatar_url });
      const isSuperAdmin = adminResult.data === true;
      setIsAdmin(isSuperAdmin);
      const role = roleResult.data?.role;
      setIsOwnerOrAdmin(isSuperAdmin || role === 'owner' || role === 'admin');
      setCanManageUsers(isSuperAdmin || role === 'admin' || role === 'gestor' || role === 'owner');

      const permsMap: Record<string, boolean> = {};
      permsResult.data?.forEach((p) => { permsMap[p.permission] = p.granted; });
      setUserPermissions(permsMap);
      setPermLoading(false);
    }
    check();
  }, [navigate]);

  // Permission check - owners/admins bypass
  const canView = isOwnerOrAdmin || userPermissions['operacoes.view'];
  const canFormularios = isOwnerOrAdmin || userPermissions['operacoes.formularios'];
  const canChecklist = isOwnerOrAdmin || userPermissions['operacoes.checklist'];
  const canPacotes = isOwnerOrAdmin || userPermissions['operacoes.pacotes'];
  const canFreelancer = isOwnerOrAdmin || userPermissions['operacoes.freelancer'];
  const canAvaliacoes = isOwnerOrAdmin || userPermissions['operacoes.avaliacoes'];
  const canBankAccounts = isOwnerOrAdmin || (userPermissions['financial.bank_accounts'] ?? true);

  const groups: HubGroup[] = useMemo(() => [
    {
      id: "cadastros", title: "Cadastros", icon: Package, items: [
        { id: "pacotes", title: "Pacotes", description: "Pacotes de festa com preços e o que inclui", icon: Package, visible: canPacotes, render: () => <PackagesManager /> },
        { id: "opcionais", title: "Opcionais", description: "Itens extras que o cliente pode contratar", icon: PackagePlus, visible: canPacotes, render: () => <OptionalsManager /> },
        { id: "tipos", title: "Tipos de festa", description: "Aniversário, confraternização, formatura…", icon: PartyPopper, visible: canPacotes, render: () => <EventTypesConfig /> },
        { id: "vendedores", title: "Vendedores", description: "Quem vende, para marcar em cada festa", icon: UserCheck, visible: canPacotes, render: () => <SellersManager /> },
      ],
    },
    {
      id: "formularios", title: "Formulários do cliente", icon: FileText, items: [
        { id: "prefesta", title: "Pré-Festa", description: "O que o cliente preenche antes da festa", icon: PartyPopper, visible: canFormularios, render: () => <PreFestaContent /> },
        { id: "cardapio", title: "Cardápio", description: "Escolha do cardápio pelo cliente", icon: UtensilsCrossed, visible: canFormularios, render: () => <CardapioContent /> },
        { id: "avaliacao", title: "Avaliação", description: "Pesquisa de satisfação depois da festa", icon: Star, visible: canFormularios, render: () => <AvaliacoesContent /> },
      ],
    },
    {
      id: "dia", title: "Dia da festa", icon: CalendarHeart, items: [
        { id: "equipe", title: "Equipe da festa", description: "Quem trabalha em cada festa e as funções", icon: Users, visible: canChecklist, render: () => <EventStaffManager /> },
        { id: "manutencao", title: "Manutenção", description: "Conferência do espaço antes e depois", icon: Wrench, visible: canChecklist, render: () => <MaintenanceManager /> },
        { id: "acompanhamento", title: "Acompanhamento", description: "Andamento da festa, etapa por etapa", icon: Eye, visible: canChecklist, render: () => <PartyMonitoringManager /> },
        { id: "presenca", title: "Presença de convidados", description: "Lista de quem chegou na festa", icon: ClipboardList, visible: canChecklist, render: () => <AttendanceManager /> },
        { id: "informacoes", title: "Informações para a equipe", description: "Avisos e detalhes da festa para a equipe", icon: Info, visible: canChecklist, render: () => <EventInfoManager /> },
      ],
    },
    {
      id: "freelancers", title: "Freelancers", icon: HardHat, items: [
        { id: "fl-cadastro", title: "Cadastro", description: "Freelancers cadastrados e o formulário", icon: HardHat, visible: canFreelancer, render: () => <FreelancerManagerContent /> },
        { id: "fl-candidatos", title: "Candidatos", description: "Quem se candidatou pelo Trabalhe Conosco", icon: UserPlus, visible: canFreelancer, render: () => <FreelancerCandidatesTab /> },
        { id: "fl-avaliacoes", title: "Avaliações", description: "Notas dos freelancers depois de cada festa", icon: ClipboardCheck, visible: canAvaliacoes, render: () => <FreelancerEvaluationsTab /> },
      ],
    },
    {
      id: "financeiro", title: "Financeiro", icon: Wallet, items: [
        { id: "taxas", title: "Taxas de cartão", description: "Taxas da maquininha por parcela", icon: CreditCard, visible: canPacotes, render: () => <CardFeesManager /> },
        { id: "contas", title: "Contas bancárias", description: "Contas para receber os pagamentos", icon: Landmark, visible: canPacotes && canBankAccounts, render: () => <BankAccountsManager /> },
      ],
    },
  ].map((g) => ({ ...g, items: g.items.filter((i) => i.visible) })).filter((g) => g.items.length > 0),
  [canFormularios, canChecklist, canPacotes, canFreelancer, canAvaliacoes, canBankAccounts]);

  const allItems = groups.flatMap((g) => g.items);
  const requested = searchParams.get("item") || legacyItem(searchParams);
  const current = allItems.find((i) => i.id === requested) || null;
  // No computador sempre há um item aberto; no celular, sem item = a lista
  const active = current || (isMobile ? null : allItems[0] || null);

  const open = (id: string | null) => {
    const next = new URLSearchParams();
    if (id) next.set("item", id);
    setSearchParams(next);
  };

  const handleLogout = async () => { await supabase.auth.signOut({ scope: "local" }); navigate("/auth"); };
  const handleRefresh = () => { window.location.reload(); };

  if (permLoading) {
    return <LoadingScreen message="Carregando operações..." />;
  }

  if (!canView) {
    return (
      <AccessDeniedRedirect message="Você não tem permissão para acessar a seção de Operações. Solicite ao administrador." />
    );
  }

  if (groups.length === 0) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar canManageUsers={isAdmin} isAdmin={isAdmin} currentUserName={currentUser?.name || ""} onRefresh={handleRefresh} onLogout={handleLogout} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
              <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-semibold">Sem permissões</h2>
              <p className="text-muted-foreground max-w-md">
                Nenhuma seção está disponível para você. Solicite permissões ao administrador.
              </p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar canManageUsers={canManageUsers} isAdmin={isAdmin} currentUserName={currentUser?.name || ""} onRefresh={handleRefresh} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile Header */}
          <header className="bg-card border-b border-border shrink-0 z-10 md:hidden">
            <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MobileMenu
                    isOpen={isMobileMenuOpen}
                    onOpenChange={setIsMobileMenuOpen}
                    trigger={<Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="w-5 h-5" /></Button>}
                    currentPage="formularios"
                    userName={currentUser?.name || ""}
                    userEmail={currentUser?.email || ""}
                    userAvatar={currentUser?.avatar}
                    canManageUsers={canManageUsers}
                    isAdmin={isAdmin}
                    onRefresh={handleRefresh}
                    onLogout={handleLogout}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={getCompanyLogoOverride(currentCompany?.slug, currentCompany?.logo_url) || '/placeholder.svg'} alt={currentCompany?.name || 'Logo'} className="h-8 w-auto shrink-0" />
                    <h1 className="font-display font-bold text-foreground text-sm truncate">Operações</h1>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <NotificationBell />
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Desktop header */}
            <div className="hidden md:block px-3 md:px-5 pt-3 md:pt-4 pb-0">
              <div className="max-w-7xl">
                <div className="relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
                  <div className="relative flex items-center justify-between gap-4 p-5 md:p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                        <FolderOpen className="h-7 w-7 text-primary-foreground" />
                      </div>
                      <div>
                        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Operações</h1>
                        <p className="text-sm text-muted-foreground/70 mt-0.5">Cadastros, formulários, dia da festa, freelancers e financeiro</p>
                      </div>
                    </div>
                    <GuiaOperacoesDialog />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 md:p-5">
              <div className="max-w-7xl">
                <HubLayout groups={groups} active={active} onOpen={open} isMobile={isMobile} backLabel="Operações" toneOf={toneOf} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
