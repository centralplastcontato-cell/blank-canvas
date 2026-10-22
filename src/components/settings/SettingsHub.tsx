import { useEffect, useMemo, type ComponentType, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity, Bell, Bot, Building2, ChevronLeft, ChevronRight, Database, FileText, FolderOpen, Globe, HelpCircle,
  MessageSquare, PartyPopper, Send, Settings, Sparkles, UserCircle, Users, Wifi, Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useConfigPermissions } from "@/hooks/useConfigPermissions";
import { signupStatus } from "@/lib/selfSetup";
import { ProfileContent } from "@/components/admin/ProfileContent";
import { PartyControlConfig } from "@/components/admin/PartyControlConfig";
import { UsersManagementPanel } from "@/components/admin/UsersManagementPanel";
import { CompanyBackupPanel } from "@/components/admin/CompanyBackupPanel";
import { ActivityLogPanel } from "@/components/admin/ActivityLogPanel";
import { CompanyDataSection } from "@/components/whatsapp/settings/CompanyDataSection";
import { SiteSection } from "@/components/whatsapp/settings/SiteSection";
import { ConnectionSection } from "@/components/whatsapp/settings/ConnectionSection";
import { NotificationsSection } from "@/components/whatsapp/settings/NotificationsSection";
import { MessagesSection } from "@/components/whatsapp/settings/MessagesSection";
import { SalesMaterialsSection } from "@/components/whatsapp/settings/SalesMaterialsSection";
import { AiAgentSection } from "@/components/whatsapp/settings/AiAgentSection";
import { AiTestSection } from "@/components/whatsapp/settings/AiTestSection";
import { AutomationsSection } from "@/components/whatsapp/settings/AutomationsSection";
import { AdvancedSection } from "@/components/whatsapp/settings/AdvancedSection";
import { VisualGuideSection } from "@/components/whatsapp/settings/VisualGuideSection";

// Configurações organizadas pelo que o dono quer fazer (22/10): um menu só,
// em 6 grupos, no lugar das três fileiras de abas (Configurações → Empresa e
// WhatsApp → Automações). Nenhuma função mudou de comportamento, só de lugar;
// as permissões de cada item são as mesmas de antes.

const MESSAGE_TABS = ["visitas", "followups", "reativacao", "prereserva", "formularios", "campanhas"];
const ROBOT_TABS = ["geral", "perguntas", "bot-lp", "festa", "vip", "gatilhos", "fluxos"];

interface Item {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  visible: boolean;
  render: () => ReactNode;
}

interface Group {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  items: Item[];
}

// Links antigos (?tab= / ?secao=) continuam abrindo o lugar certo
const LEGACY: Record<string, string> = {
  perfil: "perfil",
  usuarios: "usuarios",
  whatsapp: "company",
  festa: "festa",
  backup: "backup",
  auditoria: "auditoria",
  company: "company",
  site: "site",
  "ia-teste": "ia-teste",
  connection: "connection",
  content: "materials",
  notifications: "notifications",
  automations: "automations",
  advanced: "advanced",
  guide: "guide",
};

interface Props {
  userId: string;
  userEmail: string;
  isAdmin: boolean;
  isGestor: boolean;
  canManageUsers: boolean;
  showOperacoes: boolean;
  isMobile: boolean;
}

export function SettingsHub({ userId, userEmail, isAdmin, isGestor, canManageUsers, showOperacoes, isMobile }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const modules = useCompanyModules();
  const { currentRole, currentCompany } = useCompany();
  const { permissions, isLoading } = useConfigPermissions(userId, isAdmin, currentRole === "owner");
  const companyAdmin = currentRole === "admin" || currentRole === "owner" || isAdmin || isGestor;
  const hasAi = !!modules.ia_conversacional || !!signupStatus(currentCompany?.settings);
  const automationsOn = !!permissions.automations && (isAdmin || !!modules.automations);
  const messagesOn = !!permissions.messages && (isAdmin || !!modules.messages);
  const systemOn = isGestor || isAdmin || canManageUsers;

  const groups: Group[] = useMemo(() => [
    {
      id: "buffet", title: "Meu buffet", icon: Building2, items: [
        { id: "company", title: "Dados da empresa", description: "Logo, nome e dados do buffet", icon: Building2, visible: companyAdmin, render: () => <CompanyDataSection /> },
        { id: "site", title: "Meu site", description: "Página do buffet e botões do WhatsApp", icon: Globe, visible: companyAdmin, render: () => <SiteSection /> },
        { id: "festa", title: "Controle da festa", description: "Checklists e operação do dia da festa", icon: PartyPopper, visible: showOperacoes, render: () => <PartyControlConfig /> },
        { id: "usuarios", title: "Usuários", description: "Equipe, senhas e permissões", icon: Users, visible: canManageUsers, render: () => <UsersManagementPanel userId={userId} isAdmin={isAdmin} /> },
      ],
    },
    {
      id: "whatsapp", title: "WhatsApp", icon: MessageSquare, items: [
        { id: "connection", title: "Conexão dos números", description: "Status, QR Code e números conectados", icon: Wifi, visible: !!permissions.connection, render: () => <ConnectionSection userId={userId} isAdmin={isAdmin} /> },
        { id: "templates", title: "Respostas prontas", description: "Mensagens rápidas da equipe no chat", icon: FileText, visible: messagesOn, render: () => <MessagesSection userId={userId} isAdmin={isAdmin} /> },
        { id: "notifications", title: "Notificações e alertas", description: "Som e avisos para a equipe", icon: Bell, visible: !!permissions.notifications, render: () => <NotificationsSection /> },
      ],
    },
    {
      id: "ia", title: "Inteligência Artificial", icon: Sparkles, items: [
        { id: "ia-config", title: "Configurar a IA", description: "Preços, horários, promoções e jeito de atender", icon: Wand2, visible: !!modules.ia_conversacional && automationsOn, render: () => <AiAgentSection /> },
        { id: "materials", title: "Materiais", description: "Fotos, vídeo, PDF e avaliações que a IA envia", icon: FolderOpen, visible: messagesOn, render: () => <SalesMaterialsSection userId={userId} isAdmin={isAdmin} /> },
        { id: "ia-teste", title: "Testar e ensinar", description: "Conversar com a IA e ver o que ela passou para a equipe", icon: Sparkles, visible: companyAdmin && hasAi, render: () => <AiTestSection /> },
      ],
    },
    {
      id: "auto", title: "Mensagens automáticas", icon: Send, items: [
        { id: "automations", title: "Mensagens automáticas", description: "Visitas e pós-visita, follow-ups, reativação, pré-reserva, dados do contrato e campanhas", icon: Send, visible: automationsOn, render: () => <AutomationsSection tabs={MESSAGE_TABS} hideAi /> },
      ],
    },
    {
      id: "robot", title: "Robô de atendimento", icon: Bot, items: [
        { id: "robot", title: "Robô e fluxos", description: "Perguntas, Bot LP, Bot Festa, VIP, gatilhos e fluxos", icon: Bot, visible: automationsOn, render: () => <AutomationsSection tabs={ROBOT_TABS} hideAi /> },
      ],
    },
    {
      id: "sistema", title: "Sistema", icon: Settings, items: [
        { id: "perfil", title: "Meu perfil", description: "Seu nome, foto e senha", icon: UserCircle, visible: true, render: () => <ProfileContent userId={userId} userEmail={userEmail} /> },
        { id: "backup", title: "Backup", description: "Cópia dos dados do buffet", icon: Database, visible: systemOn, render: () => <CompanyBackupPanel /> },
        { id: "auditoria", title: "Auditoria", description: "Quem fez o quê na plataforma", icon: Activity, visible: systemOn, render: () => <ActivityLogPanel /> },
        { id: "advanced", title: "Avançado", description: "Sincronização, logs e importação", icon: Settings, visible: !!permissions.advanced && (isAdmin || !!modules.advanced), render: () => <AdvancedSection userId={userId} isAdmin={isAdmin} /> },
        { id: "guide", title: "Guia visual", description: "O que significa cada ícone", icon: HelpCircle, visible: true, render: () => <VisualGuideSection /> },
      ],
    },
  ].map((g) => ({ ...g, items: g.items.filter((i) => i.visible) })).filter((g) => g.items.length > 0),
  [permissions, modules, companyAdmin, hasAi, automationsOn, messagesOn, systemOn, showOperacoes, canManageUsers, userId, userEmail, isAdmin]);

  const allItems = groups.flatMap((g) => g.items);
  const requested = searchParams.get("item") || LEGACY[searchParams.get("secao") || ""] || LEGACY[searchParams.get("tab") || ""] || null;
  const current = allItems.find((i) => i.id === requested) || null;
  // No computador sempre há um item aberto; no celular, sem item = a lista
  const active = current || (isMobile ? null : allItems[0] || null);

  const open = (id: string | null) => {
    const next = new URLSearchParams();
    if (id) next.set("item", id);
    setSearchParams(next, { replace: false });
  };

  const activeId = active?.id;
  useEffect(() => {
    if (activeId) document.getElementById("settings-content-top")?.scrollIntoView({ block: "start" });
  }, [activeId]);

  if (isLoading) {
    return (
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-64 space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        <Skeleton className="h-64 flex-1 rounded-xl" />
      </div>
    );
  }

  const groupOf = (id: string) => groups.find((g) => g.items.some((i) => i.id === id));

  // Celular: lista de cartões; ao tocar, abre o item com "voltar"
  if (isMobile) {
    if (!active) {
      return (
        <div className="space-y-5 pb-6">
          {groups.map((g) => (
            <section key={g.id} className="space-y-2">
              <h2 className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <g.icon className="h-3.5 w-3.5" /> {g.title}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-card divide-y divide-border/50">
                {g.items.map((i) => (
                  <button key={i.id} type="button" onClick={() => open(i.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/60">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10"><i.icon className="h-4 w-4 text-primary" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{i.title}</span>
                      <span className="block text-xs text-muted-foreground truncate">{i.description}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-4 pb-6">
        <div id="settings-content-top" />
        <button type="button" onClick={() => open(null)} className="flex items-center gap-1 text-sm font-medium text-primary">
          <ChevronLeft className="h-4 w-4" /> Configurações
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{groupOf(active.id)?.title}</p>
          <h2 className="text-lg font-bold text-foreground">{active.title}</h2>
          <p className="text-xs text-muted-foreground">{active.description}</p>
        </div>
        <div className="min-w-0">{active.render()}</div>
      </div>
    );
  }

  // Computador: menu à esquerda, conteúdo à direita
  return (
    <div className="flex gap-6 items-start">
      <nav className="w-64 shrink-0 sticky top-0 space-y-4 rounded-2xl border border-border/40 bg-card p-3 shadow-sm">
        {groups.map((g) => (
          <div key={g.id} className="space-y-1">
            <p className="flex items-center gap-2 px-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <g.icon className="h-3.5 w-3.5" /> {g.title}
            </p>
            {g.items.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => open(i.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  active?.id === i.id ? "bg-primary text-primary-foreground font-semibold shadow-sm" : "text-foreground/80 hover:bg-muted",
                )}
              >
                <i.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{i.title}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        <div id="settings-content-top" />
        {active && (
          <>
            <div className="mb-5 flex items-center gap-3 border-b border-border pb-3">
              <div className="rounded-xl bg-primary/10 p-2.5"><active.icon className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{groupOf(active.id)?.title}</p>
                <h2 className="font-display text-lg font-bold tracking-tight">{active.title}</h2>
                <p className="text-sm text-muted-foreground">{active.description}</p>
              </div>
            </div>
            {active.render()}
          </>
        )}
      </div>
    </div>
  );
}
