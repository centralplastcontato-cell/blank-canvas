import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { Users, LogOut, RefreshCw, Headset, Settings, Building2, Brain, CalendarDays, FolderOpen, GraduationCap, Megaphone, MapPin, FileSignature, DollarSign, Handshake } from "lucide-react";
import { prefetchRoute } from "@/App";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { NavLink } from "@/components/NavLink";
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
import { FloatingTips } from "@/components/ui/floating-tips";

import { CompanySwitcher } from "./CompanySwitcher";
import { useCompany } from "@/contexts/CompanyContext";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";

interface AdminSidebarProps {
  canManageUsers: boolean;
  isAdmin?: boolean;
  currentUserName: string;
  canViewFinanceiro?: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export function AdminSidebar({ 
  canManageUsers,
  isAdmin,
  currentUserName, 
  canViewFinanceiro = true,
  onRefresh, 
  onLogout 
}: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const modules = useCompanyModules();
  const { currentCompany } = useCompany();

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

  const allItems = [
    ...(modules.central_atendimento ? [{ title: "Central de Atendimento", url: "/atendimento", icon: Headset }] : []),
    ...(modules.inteligencia ? [{ title: "Inteligência", url: "/inteligencia", icon: Brain }] : []),
    ...(modules.agenda ? [{ title: "Central de Agenda", url: "/agenda", icon: CalendarDays }] : []),
    ...(modules.operacoes ? [{ title: "Operações", url: "/formularios", icon: FolderOpen }] : []),
    ...(modules.campanhas ? [{ title: "Campanhas", url: "/campanhas", icon: Megaphone }] : []),
    ...(modules.contrato ? [{ title: "Contratos", url: "/contratos", icon: FileSignature }] : []),
    ...(showFinanceiro ? [{ title: "Financeiro", url: "/financeiro", icon: DollarSign }] : []),
    ...(modules.config ? [{ title: "Configurações Gerais", url: "/configuracoes", icon: Settings }] : []),
    ...(isAdmin ? [{ title: "Empresas", url: "/hub/empresas", icon: Building2 }] : []),
    ...(modules.treinamento ? [{ title: "Treinamento", url: "/treinamento", icon: GraduationCap }] : []),
    ...(modules.empresa_parceira ? [{ title: "Empresa Parceira", url: "/parceiro", icon: Handshake }] : []),
  ];

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-sidebar-border z-40"
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img 
            src={getCompanyLogoOverride(currentCompany?.slug, currentCompany?.logo_url) || '/placeholder.svg'} 
            alt={currentCompany?.name || "Logo"} 
            className="h-9 w-9 object-contain shrink-0 rounded-lg"
          />
          {!collapsed && (
            <div className="min-w-0 overflow-hidden flex-1">
              <p className="font-display font-bold text-sm text-sidebar-foreground truncate">
                {currentCompany?.name || "Empresa"}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {currentUserName}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="px-2 pt-1">
          <CompanySwitcher collapsed={collapsed} onDropdownOpenChange={setIsDropdownOpen} />
        </div>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">Navegação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={item.title}
                    isActive={location.pathname === item.url}
                    className="h-11 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors data-[active=true]:bg-sidebar-accent/80 data-[active=true]:text-sidebar-primary data-[active=true]:font-semibold data-[active=true]:border-l-4 data-[active=true]:border-sidebar-primary"
                  >
                    <NavLink 
                      to={item.url} 
                      end 
                      className="flex items-center gap-3"
                      onMouseEnter={() => prefetchRoute(item.url)}
                      onFocus={() => prefetchRoute(item.url)}
                    >
                      <item.icon className="h-[22px] w-[22px] shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">Ações</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip="Atualizar Dados"
                  onClick={onRefresh}
                  className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <RefreshCw className="h-5 w-5 shrink-0" />
                  <span>Atualizar Dados</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
    <FloatingTips />
    </>
  );
}
