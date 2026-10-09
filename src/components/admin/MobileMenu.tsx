import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Headset,
  Settings,
  RefreshCw,
  LogOut,
  Building2,
  Brain,
  CalendarDays,
  FolderOpen,
  Megaphone,
  FileSignature,
  DollarSign,
  Handshake,
  type LucideIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useCompany } from "@/contexts/CompanyContext";
import { useMenuBadges } from "@/hooks/useMenuBadges";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  currentPage: "atendimento" | "configuracoes" | "users" | "whatsapp" | "inteligencia" | "agenda" | "avaliacoes" | "prefesta" | "formularios" | "perfil" | "treinamento" | "financeiro" | "parceiro" | "campanhas" | "contratos";
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  canManageUsers: boolean;
  isAdmin?: boolean;
  canViewFinanceiro?: boolean;
  onRefresh?: () => void;
  onLogout: () => void;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function MobileMenu({
  isOpen,
  onOpenChange,
  trigger,
  currentPage,
  userName,
  userEmail,
  userAvatar,
  canManageUsers,
  isAdmin,
  canViewFinanceiro,
  onRefresh,
  onLogout,
}: MobileMenuProps) {
  const navigate = useNavigate();
  const modules = useCompanyModules();

  const [finViewAllowed, setFinViewAllowed] = useState(true);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from('user_permissions')
        .select('granted')
        .eq('user_id', data.user.id)
        .eq('permission', 'financial.view')
        .maybeSingle()
        .then(({ data: perm }) => {
          if (perm && perm.granted === false) setFinViewAllowed(false);
        });
    });
  }, []);
  const showFinanceiro = canViewFinanceiro !== false && finViewAllowed;

  const { currentCompany, currentRole } = useCompany();
  const badges = useMenuBadges(isOpen, !!modules.inteligencia);

  const items: MenuItem[] = [
    { id: "atendimento", group: "atendimento", label: "Central de Atendimento", icon: Headset, color: "bg-blue-500/15 text-blue-600", path: "/atendimento", show: !!modules.central_atendimento, badge: badges.unread, badgeTone: "alert" },
    { id: "inteligencia", group: "atendimento", label: "Inteligência", icon: Brain, color: "bg-violet-500/15 text-violet-600", path: "/inteligencia", show: !!modules.inteligencia, badge: badges.waiting, badgeTone: "alert" },
    { id: "campanhas", group: "atendimento", label: "Campanhas", icon: Megaphone, color: "bg-pink-500/15 text-pink-600", path: "/campanhas", show: !!modules.campanhas },
    { id: "agenda", group: "festas", label: "Central de Agenda", icon: CalendarDays, color: "bg-emerald-500/15 text-emerald-600", path: "/agenda", show: !!modules.agenda, badge: badges.visitsToday, badgeTone: "info" },
    { id: "formularios", group: "festas", label: "Operações", icon: FolderOpen, color: "bg-amber-500/15 text-amber-600", path: "/formularios", show: !!modules.operacoes },
    { id: "contratos", group: "festas", label: "Contratos", icon: FileSignature, color: "bg-sky-500/15 text-sky-600", path: "/contratos", show: !!modules.contrato },
    { id: "financeiro", group: "festas", label: "Financeiro", icon: DollarSign, color: "bg-green-500/15 text-green-700", path: "/financeiro", show: showFinanceiro },
    { id: "configuracoes", group: "mais", label: "Configurações Gerais", icon: Settings, color: "bg-slate-500/15 text-slate-600", path: "/configuracoes", show: !!modules.config },
    { id: "empresas", group: "mais", label: "Empresas", icon: Building2, color: "bg-slate-500/15 text-slate-600", path: "/hub/empresas", show: !!isAdmin },
    // Treinamento escondido (out/2026): nenhuma aula cadastrada
    { id: "parceiro", group: "mais", label: "Empresa Parceira", icon: Handshake, color: "bg-orange-500/15 text-orange-600", path: "/parceiro", show: !!modules.empresa_parceira },
  ];

  const go = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      {/* Sem foco automático: senão o cabeçalho abre com uma borda de seleção */}
      {/* Cartão flutuante com cantos redondos, sem encostar nas bordas da tela */}
      <SheetContent
        side="left"
        className="inset-y-2 left-2 h-auto w-[19rem] p-0 flex flex-col rounded-[28px] border-0 shadow-2xl overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <MobileMenuPanel
          companyName={currentCompany?.name || ""}
          companyLogo={getCompanyLogoOverride(currentCompany?.slug, currentCompany?.logo_url)}
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          roleLabel={roleLabel(currentRole, isAdmin)}
          items={items.filter((i) => i.show)}
          currentPage={currentPage}
          onNavigate={go}
          onRefresh={onRefresh ? () => { onRefresh(); onOpenChange(false); } : undefined}
          onLogout={() => { onLogout(); onOpenChange(false); }}
        />
      </SheetContent>
    </Sheet>
  );
}

// ---------------- Visual do menu (sem acesso a dados) ----------------

export interface MenuItem {
  id: string;
  group: "atendimento" | "festas" | "mais";
  label: string;
  icon: LucideIcon;
  /** cor do quadradinho do ícone */
  color: string;
  path: string;
  show: boolean;
  badge?: number;
  badgeTone?: "alert" | "info";
}

const GROUPS: Array<{ id: MenuItem["group"]; label: string }> = [
  { id: "atendimento", label: "Atendimento" },
  { id: "festas", label: "Festas" },
  { id: "mais", label: "Mais" },
];

const ROLE_LABELS: Record<string, string> = { owner: "Dono", admin: "Administrador", member: "Equipe" };

function roleLabel(role: string | null, isAdmin?: boolean): string {
  if (role && ROLE_LABELS[role]) return ROLE_LABELS[role];
  return isAdmin ? "Administrador" : "Equipe";
}

interface MobileMenuPanelProps {
  companyName: string;
  companyLogo: string | null;
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  roleLabel: string;
  items: MenuItem[];
  currentPage: string;
  onNavigate: (path: string) => void;
  onRefresh?: () => void;
  onLogout: () => void;
}

export function MobileMenuPanel({
  companyName, companyLogo, userName, userEmail, userAvatar, roleLabel, items, currentPage, onNavigate, onRefresh, onLogout,
}: MobileMenuPanelProps) {
  const who = userName || userEmail || "Usuário";
  return (
    <>
      {/* Empresa e quem está logado */}
      <SheetHeader className="p-3 pb-1 text-left">
        <button
          className="flex items-center gap-3 text-left w-full rounded-3xl p-3 pr-9 bg-gradient-to-br from-secondary/35 via-secondary/15 to-primary/10 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          onClick={() => onNavigate("/configuracoes")}
        >
          <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="h-10 w-10 object-contain" />
            ) : (
              <span className="text-sm font-bold text-primary">{getInitials(companyName || who)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1 flex flex-col">
            {/* span: dentro de botão não pode ter título (h2) */}
            <SheetTitle asChild>
              <span className="block font-display tracking-tight text-base font-bold leading-tight truncate">{companyName || who}</span>
            </SheetTitle>
            <span className="flex items-center gap-1.5 mt-1 min-w-0">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={userAvatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">{getInitials(who)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {who} · {roleLabel}
              </span>
            </span>
          </div>
        </button>
      </SheetHeader>

      {/* Itens em grupos */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        {GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group.id);
          if (groupItems.length === 0) return null;
          return (
            <div key={group.id} className="py-1.5">
              <p className="text-xs font-semibold text-muted-foreground/80 px-3 pt-1 pb-1">{group.label}</p>
              {groupItems.map((item) => {
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.path)}
                    className={cn(
                      "relative w-full flex items-center gap-3 h-12 px-2.5 rounded-2xl text-sm font-medium transition-colors",
                      active ? "bg-secondary/25 text-foreground font-semibold shadow-sm" : "text-foreground/80 hover:bg-muted/70",
                    )}
                  >
                    {active && <span className="absolute left-1 top-3 bottom-3 w-1 rounded-full bg-secondary" />}
                    <span className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", item.color)}>
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {!!item.badge && item.badge > 0 && (
                      <span
                        className={cn(
                          "min-w-[1.5rem] h-6 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center",
                          item.badgeTone === "info" ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500 text-white",
                        )}
                      >
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Ações no rodapé */}
      <div className="p-3 pt-2 flex gap-2">
        {onRefresh && (
          <button onClick={onRefresh} className="flex-1 h-11 rounded-full bg-card shadow-sm text-sm font-medium text-foreground/70 hover:bg-muted flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        )}
        <button onClick={onLogout} className="flex-1 h-11 rounded-full bg-destructive/10 text-sm font-medium text-destructive hover:bg-destructive/15 flex items-center justify-center gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </>
  );
}

