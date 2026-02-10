import { useState, useEffect, useMemo } from "react";
import { Wifi, MessageSquare, Bell, Bot, Settings, Lock, HelpCircle, FolderOpen, Upload, GitBranch } from "lucide-react";
import { ConnectionSection } from "./settings/ConnectionSection";
import { MessagesSection } from "./settings/MessagesSection";
import { NotificationsSection } from "./settings/NotificationsSection";
import { AutomationsSection } from "./settings/AutomationsSection";
import { AdvancedSection } from "./settings/AdvancedSection";
import { VisualGuideSection } from "./settings/VisualGuideSection";
import { SalesMaterialsSection } from "./settings/SalesMaterialsSection";
import { DataImportSection } from "@/components/admin/DataImportSection";
import { FlowListManager } from "@/components/flowbuilder/FlowListManager";
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
    <div className="flex flex-col md:flex-row gap-4 h-full">
      {/* Sidebar Menu - Vertical on desktop, horizontal scroll on mobile */}
      <div className="md:w-56 shrink-0">
        {/* Mobile: Horizontal scrollable tabs */}
        <div className="md:hidden overflow-x-auto">
          <div className="flex gap-2 pb-2 min-w-max">
            {configSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors shrink-0",
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                <section.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: Vertical sidebar */}
        <nav className="hidden md:flex flex-col gap-1 bg-muted/30 rounded-lg p-2">
          {configSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left w-full",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                activeSection === section.id
                  ? "bg-primary-foreground/20"
                  : "bg-primary/10"
              )}>
                <section.icon className={cn(
                  "w-4 h-4",
                  activeSection === section.id
                    ? "text-primary-foreground"
                    : "text-primary"
                )} />
              </div>
              <div className="min-w-0">
                <p className={cn(
                  "font-medium text-sm truncate",
                  activeSection === section.id
                    ? "text-primary-foreground"
                    : "text-foreground"
                )}>
                  {section.title}
                </p>
                <p className={cn(
                  "text-xs truncate",
                  activeSection === section.id
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                )}>
                  {section.description}
                </p>
              </div>
            </button>
          ))}
        </nav>
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
        <ScrollArea className="h-[calc(100vh-300px)] md:h-[calc(100vh-280px)]">
          {renderContent()}
        </ScrollArea>
      </div>
    </div>
  );
}
