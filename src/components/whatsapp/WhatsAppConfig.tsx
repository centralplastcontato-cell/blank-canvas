import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Wifi, MessageSquare, Bell, Bot, Settings, Lock, HelpCircle, FolderOpen, Upload, GitBranch, ClipboardCheck } from "lucide-react";
import { ConnectionSection } from "./settings/ConnectionSection";
import { MessagesSection } from "./settings/MessagesSection";
import { NotificationsSection } from "./settings/NotificationsSection";
import { AutomationsSection } from "./settings/AutomationsSection";
import { AdvancedSection } from "./settings/AdvancedSection";
import { VisualGuideSection } from "./settings/VisualGuideSection";
import { SalesMaterialsSection } from "./settings/SalesMaterialsSection";
import { DataImportSection } from "@/components/admin/DataImportSection";
import { FlowListManager } from "@/components/flowbuilder/FlowListManager";
import { ChecklistTemplateManager } from "@/components/agenda/ChecklistTemplateManager";
import { useConfigPermissions } from "@/hooks/useConfigPermissions";
import { useCompanyModules, type CompanyModules } from "@/hooks/useCompanyModules";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface WhatsAppConfigProps {
  userId: string;
  isAdmin: boolean;
}

const allConfigSections = [
  {
    id: "connection",
    permissionKey: "connection" as const,
    moduleKey: "whatsapp" as keyof CompanyModules | null,
    title: "Conexão",
    description: "Status e QR Code",
    icon: Wifi,
  },
  {
    id: "messages",
    permissionKey: "messages" as const,
    moduleKey: "messages" as keyof CompanyModules | null,
    title: "Mensagens",
    description: "Templates e legendas",
    icon: MessageSquare,
  },
  {
    id: "materials",
    permissionKey: "messages" as const,
    moduleKey: "sales_materials" as keyof CompanyModules | null,
    title: "Materiais",
    description: "PDFs, fotos e vídeos",
    icon: FolderOpen,
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
    description: "Chatbot e respostas",
    icon: Bot,
  },
  {
    id: "flows",
    permissionKey: "automations" as const,
    moduleKey: "flow_builder" as keyof CompanyModules | null,
    title: "Fluxos",
    description: "Editor visual de fluxos",
    icon: GitBranch,
  },
  {
    id: "advanced",
    permissionKey: "advanced" as const,
    moduleKey: "advanced" as keyof CompanyModules | null,
    title: "Avançado",
    description: "Sincronização e logs",
    icon: Settings,
  },
  {
    id: "import",
    permissionKey: "advanced" as const,
    moduleKey: "data_import" as keyof CompanyModules | null,
    title: "Importar Dados",
    description: "Leads e conversas",
    icon: Upload,
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
  const { permissions, isLoading, hasAnyPermission } = useConfigPermissions(userId, isAdmin);
  const modules = useCompanyModules();
  
  // Filter sections based on permissions AND company modules
  const configSections = useMemo(() => {
    return allConfigSections.filter(section => {
      const hasPermission = section.permissionKey === null || permissions[section.permissionKey];
      const moduleEnabled = isAdmin || section.moduleKey === null || modules[section.moduleKey];
      return hasPermission && moduleEnabled;
    });
  }, [permissions, modules, isAdmin]);

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
      case "connection":
        return <ConnectionSection userId={userId} isAdmin={isAdmin} />;
      case "messages":
        return <MessagesSection userId={userId} isAdmin={isAdmin} />;
      case "materials":
        return <SalesMaterialsSection userId={userId} isAdmin={isAdmin} />;
      case "notifications":
        return <NotificationsSection />;
      case "automations":
        return <AutomationsSection />;
      case "advanced":
        return <AdvancedSection userId={userId} isAdmin={isAdmin} />;
      case "import":
        return <DataImportSection isAdmin={isAdmin} />;
      case "flows":
        return <FlowListManager />;
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
        <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 bg-muted/40 rounded-xl p-1 min-w-max">
            {configSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all text-sm font-medium",
                  activeSection === section.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <section.icon className="w-4 h-4" />
                <span>{section.title}</span>
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
