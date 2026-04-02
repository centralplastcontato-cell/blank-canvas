import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { Users, LogOut, RefreshCw, Headset, Settings, Pin, PinOff, ChevronLeft, Building2, Brain, CalendarDays, FolderOpen, GraduationCap, Megaphone, MapPin, FileSignature, Lock, Unlock, DollarSign, Handshake } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

import { CompanySwitcher } from "./CompanySwitcher";
import { useCompany } from "@/contexts/CompanyContext";

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
  const { state, setOpen, open } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [isPinned, setIsPinned] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const modules = useCompanyModules();
  const { currentCompany } = useCompany();

  // Check financial.view permission for current user
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

  // Build menu items dynamically based on permissions AND enabled modules
  const allItems = [
    ...(modules.central_atendimento ? [{ title: "Central de Atendimento", url: "/atendimento", icon: Headset }] : []),
    ...(modules.inteligencia ? [{ title: "Inteligência", url: "/inteligencia", icon: Brain }] : []),
    ...(modules.campanhas ? [{ title: "Campanhas", url: "/campanhas", icon: Megaphone }] : []),
    ...(modules.visitas ? [{ title: "Agenda de visitas", url: "/visitas", icon: MapPin }] : []),
    ...(modules.agenda ? [{ title: "Agenda de festas", url: "/agenda", icon: CalendarDays }] : []),
    ...(modules.operacoes ? [{ title: "Operações", url: "/formularios", icon: FolderOpen }] : []),
    ...(modules.contrato ? [{ title: "Contratos", url: "/contratos", icon: FileSignature }] : []),
    ...(showFinanceiro ? [{ title: "Financeiro", url: "/financeiro", icon: DollarSign }] : []),
    ...(modules.config ? [{ title: "Configurações", url: "/configuracoes", icon: Settings }] : []),
    ...(canManageUsers ? [{ title: "Gerenciar Usuários", url: "/users", icon: Users }] : []),
    ...(isAdmin ? [{ title: "Empresas", url: "/hub/empresas", icon: Building2 }] : []),
    ...(modules.treinamento ? [{ title: "Treinamento", url: "/treinamento", icon: GraduationCap }] : []),
    ...(modules.empresa_parceira ? [{ title: "Empresa Parceira", url: "/parceiro", icon: Handshake }] : []),
  ];

  // Detect touch device to prevent hover-expand flicker
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Handle hover expand/collapse only when not pinned and not touch device
  const handleMouseEnter = () => {
    if (!isPinned && !isLocked && !isTouchDevice) {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned && !isDropdownOpen && !isTouchDevice) {
      setOpen(false);
    }
  };

  const handlePinToggle = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    if (newPinned) setIsLocked(false);
    setOpen(newPinned);
  };

  const handleLockToggle = () => {
    const newLocked = !isLocked;
    setIsLocked(newLocked);
    if (newLocked) {
      setIsPinned(false);
      setOpen(false);
    }
  };

  // Quick close function
  const handleQuickClose = () => {
    setIsPinned(false);
    setOpen(false);
  };

  return (
    <>
      {/* Floating lock button OUTSIDE sidebar - desktop only */}
      {collapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`fixed top-3 left-16 z-[60] h-8 w-8 rounded-md border border-border bg-background shadow-sm hidden md:flex ${isLocked ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleLockToggle();
              }}
            >
              {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {isLocked ? "Desbloquear menu" : "Travar menu fechado"}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Overlay to close sidebar easily when open and not pinned */}
      {open && !collapsed && !isPinned && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] md:hidden"
          onClick={handleQuickClose}
        />
      )}
      
      <Sidebar 
        collapsible="icon" 
        className="border-r border-sidebar-border transition-all duration-300 z-40"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img 
            src={currentCompany?.logo_url || '/placeholder.svg'} 
            alt={currentCompany?.name || "Logo"} 
            className="h-9 w-9 object-contain shrink-0 rounded-lg"
          />
          {!collapsed && (
            <>
              <div className="min-w-0 overflow-hidden flex-1">
                <p className="font-display font-bold text-sm text-sidebar-foreground truncate">
                  {currentCompany?.name || "Empresa"}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {currentUserName}
                </p>
              </div>
              {/* Pin toggle button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={handlePinToggle}
                  >
                    {isPinned ? (
                      <Pin className="h-4 w-4 text-sidebar-primary" />
                    ) : (
                      <PinOff className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {isPinned ? "Desfixar sidebar" : "Fixar sidebar"}
                </TooltipContent>
              </Tooltip>

              {/* Quick close button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={handleQuickClose}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  Fechar menu
                </TooltipContent>
              </Tooltip>
            </>
          )}
          {/* Lock button moved outside sidebar - see floating button above */}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Company Switcher */}
        <div className="px-2 pt-1">
          <CompanySwitcher collapsed={collapsed} onDropdownOpenChange={setIsDropdownOpen} />
        </div>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">Navegação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === item.url}
                        className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5 transition-all duration-200 data-[active=true]:bg-sidebar-accent/80 data-[active=true]:text-sidebar-primary data-[active=true]:font-semibold data-[active=true]:border-l-4 data-[active=true]:border-sidebar-primary"
                      >
                        <NavLink 
                          to={item.url} 
                          end 
                          className="flex items-center gap-3"
                          onMouseEnter={() => prefetchRoute(item.url)}
                          onFocus={() => prefetchRoute(item.url)}
                        >
                          <item.icon className="h-[22px] w-[22px] shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" sideOffset={10}>
                        {item.title}
                      </TooltipContent>
                    )}
                  </Tooltip>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton 
                      onClick={onRefresh}
                      className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    >
                      <RefreshCw className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Atualizar Dados</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" sideOffset={10}>
                      Atualizar Dados
                    </TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Separator className="mb-2 bg-sidebar-border" />
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton 
                  onClick={onLogout}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>Sair da Conta</span>}
                </SidebarMenuButton>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" sideOffset={10}>
                  Sair da Conta
                </TooltipContent>
              )}
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    </>
  );
}
