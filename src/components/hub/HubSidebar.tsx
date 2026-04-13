import { useLocation } from "react-router-dom";
import { BarChart3, Building2, LogOut, Smartphone, Target, Presentation, Brain, GraduationCap, Users, Headset, Package, UserSearch, BookOpen, Database } from "lucide-react";
import logoCelebrei from "@/assets/logo-celebrei-2.png";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const hubMenuItems = [
  { title: "Painel Hub", url: "/hub", icon: BarChart3 },
  { title: "Leads", url: "/hub/leads", icon: Users },
  { title: "Empresas", url: "/hub/empresas", icon: Building2 },
  { title: "Comercial B2B", url: "/hub/comercial-b2b", icon: Presentation },
  { title: "Prospecção", url: "/hub/prospeccao", icon: Target },
  { title: "WhatsApp", url: "/hub/whatsapp", icon: Smartphone },
  { title: "Consumo IA", url: "/hub/consumo-ia", icon: Brain },
  { title: "Treinamento", url: "/hub/treinamento", icon: GraduationCap },
  { title: "Materiais", url: "/hub/materiais", icon: Package },
  { title: "Recrutamento", url: "/hub/recrutamento", icon: UserSearch },
  { title: "Funcionalidades", url: "/hub/funcionalidades", icon: BookOpen },
  { title: "Backups", url: "/hub/backups", icon: Database },
  { title: "Suporte", url: "/hub/suporte", icon: Headset },
];

interface HubSidebarProps {
  currentUserName: string;
  onLogout: () => void;
}

export function HubSidebar({ currentUserName, onLogout }: HubSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border z-40"
    >
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "rounded-lg flex items-center justify-center shrink-0 transition-all duration-150",
            collapsed ? "h-8 w-8" : "h-[72px] w-[72px]"
          )}>
            <img src={logoCelebrei} alt="Celebrei" className={cn("object-contain transition-all duration-150", collapsed ? "h-7 w-7" : "h-16 w-16")} />
          </div>
          {!collapsed && (
            <div className="min-w-0 overflow-hidden flex-1">
              <p className="font-display font-bold text-sm text-sidebar-foreground truncate">
                Hub Celebrei
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {currentUserName}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
              Navegação
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {hubMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={location.pathname === item.url}
                    className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors data-[active=true]:bg-sidebar-accent/80 data-[active=true]:text-sidebar-primary data-[active=true]:font-semibold data-[active=true]:border-l-4 data-[active=true]:border-sidebar-primary"
                  >
                    <NavLink to={item.url} end className="flex items-center gap-3">
                      <item.icon className="h-[22px] w-[22px] shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Separator className="mb-2 bg-sidebar-border" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair da Conta"
              onClick={onLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Sair da Conta</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
