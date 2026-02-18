import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Wifi, Bell, Bot, Settings, Lock, HelpCircle, ClipboardCheck, FileText, Users, Building2 } from "lucide-react";
import { ConnectionSection } from "./settings/ConnectionSection";
import { NotificationsSection } from "./settings/NotificationsSection";
import { AutomationsSection } from "./settings/AutomationsSection";
import { AdvancedSection } from "./settings/AdvancedSection";
import { VisualGuideSection } from "./settings/VisualGuideSection";
import { ContentSection } from "./settings/ContentSection";
import { CompanyDataSection } from "./settings/CompanyDataSection";
import { ChecklistTemplateManager } from "@/components/agenda/ChecklistTemplateManager";
import { useConfigPermissions } from "@/hooks/useConfigPermissions";
import { useCompanyModules, type CompanyModules } from "@/hooks/useCompanyModules";
import { useCompany } from "@/contexts/CompanyContext";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface WhatsAppConfigProps {
  userId: string;
  isAdmin: boolean;
}

const allConfigSections = [
  {
    id: "company",
    permissionKey: null as any,
    moduleKey: null as keyof CompanyModules | null,
    title: "Empresa",
    description: "Logo, nome e dados",
    icon: Building2,
    requiresCompanyAdmin: true,
  },
  {
    id: "connection",
    permissionKey: "connection" as const,
    moduleKey: null as keyof CompanyModules | null,
    title: "Conexão",
    description: "Status e QR Code",
    icon: Wifi,
  },
  {
    id: "content",
    permissionKey: "messages" as const,
    moduleKey: "messages" as keyof CompanyModules | null,
    title: "Conteúdo",
    description: "Templates e materiais",
    icon: FileText,
  },
  {
    id: "notifications",
    permissionKey: "notifications" as const,
    moduleKey: null,
    title: "Notificações",
    description: "Som e alertas",
    icon: Bell,
  },
  {
    id: "automations",
    permissionKey: "automations" as const,
    moduleKey: "automations" as keyof CompanyModules | null,
    title: "Automações",
    description: "Chatbot, fluxos e respostas",
    icon: Bot,
  },
  {
    id: "advanced",
    permissionKey: "advanced" as const,
    moduleKey: "advanced" as keyof CompanyModules | null,
    title: "Avançado",
    description: "Sync, logs e importação",
    icon: Settings,
  },
  {
    id: "team",
    permissionKey: "advanced" as const,
    moduleKey: null,
    title: "Equipe",
    description: "Gerenciar usuários",
    icon: Users,
    isLink: true,
    linkTo: "/users",
  },
  {
    id: "checklist",
    permissionKey: "advanced" as const,
    moduleKey: null,
    title: "Checklist",
    description: "Templates de eventos",
    icon: ClipboardCheck,
  },
  {
    id: "guide",
    permissionKey: null as any,
    moduleKey: null,
    title: "Guia Visual",
    description: "Legenda de ícones",
    icon: HelpCircle,
  },
];

export function WhatsAppConfig({ userId, isAdmin }: WhatsAppConfigProps) {
  const navigate = useNavigate();
  const { permissions, isLoading, hasAnyPermission } = useConfigPermissions(userId, isAdmin);
  const modules = useCompanyModules();
  const { currentRole } = useCompany();
  const isCompanyAdminOrOwner = currentRole === 'admin' || currentRole === 'owner';
  
  // Filter sections based on permissions AND company modules
  const configSections = useMemo(() => {
    return allConfigSections.filter(section => {
      if ((section as any).requiresCompanyAdmin && !isCompanyAdminOrOwner && !isAdmin) return false;
      const hasPermission = section.permissionKey === null || permissions[section.permissionKey];
      const moduleEnabled = isAdmin || section.moduleKey === null || modules[section.moduleKey];
      return hasPermission && moduleEnabled;
    });
  }, [permissions, modules, isAdmin, isCompanyAdminOrOwner]);

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [checkScroll, configSections]);

  // Set initial active section when permissions load
  useEffect(() => {
    if (!isLoading && configSections.length > 0 && !activeSection) {
      setActiveSection(configSections[0].id);
    }
  }, [isLoading, configSections, activeSection]);

  const renderContent = () => {
    switch (activeSection) {
      case "company":
        return <CompanyDataSection />;
      case "connection":
        return <ConnectionSection userId={userId} isAdmin={isAdmin} />;
      case "content":
        return <ContentSection userId={userId} isAdmin={isAdmin} />;
      case "notifications":
        return <NotificationsSection />;
      case "automations":
        return <AutomationsSection />;
      case "advanced":
        return <AdvancedSection userId={userId} isAdmin={isAdmin} />;
      case "checklist":
        return <ChecklistTemplateManager />;
      case "guide":
        return <VisualGuideSection />;
      default:
        return null;
    }
  };

  const activeConfig = configSections.find(s => s.id === activeSection);

  if (isLoading) {
    return (
      <div className="flex flex-col md:flex-row gap-4 h-full">
        <div className="md:w-56 shrink-0">
          <div className="hidden md:flex flex-col gap-1 bg-muted/30 rounded-lg p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
          <div className="md:hidden flex gap-2 pb-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!hasAnyPermission) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Acesso Restrito</h3>
        <p className="text-muted-foreground max-w-md">
          Você não tem permissão para acessar as configurações do WhatsApp. 
          Entre em contato com um administrador para solicitar acesso.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Horizontal Tabs with scroll fade indicators */}
      <div className="relative shrink-0">
        {/* Left fade */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none rounded-l-xl" />
        )}
        {/* Right fade */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none rounded-r-xl" />
        )}
        <div ref={scrollRef} className="overflow-x-auto scrollbar-hide flex justify-center">
          <div className="inline-flex gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border/40 shadow-sm min-w-max">
            {configSections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  if ((section as any).isLink && (section as any).linkTo) {
                    navigate((section as any).linkTo);
                  } else {
                    setActiveSection(section.id);
                  }
                }}
                className={cn(
                  "inline-flex items-center gap-2.5 px-6 py-3 rounded-xl whitespace-nowrap transition-all duration-200 text-base font-semibold",
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-[1.02]"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <section.icon className="w-5 h-5" />
                <span>{section.title}</span>
                {(section as any).isLink && (
                  <span className="text-xs opacity-50">↗</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        {/* Section Header */}
        <div className="mb-4 pb-3 border-b">
          <div className="flex items-center gap-3">
            {activeConfig && (
              <>
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <activeConfig.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{activeConfig.title}</h2>
                  <p className="text-sm text-muted-foreground">{activeConfig.description}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section Content */}
        <ScrollArea className="h-[calc(100vh-340px)] md:h-[calc(100vh-320px)]">
          {renderContent()}
        </ScrollArea>
      </div>
    </div>
  );
}
