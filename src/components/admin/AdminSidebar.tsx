import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Users, LogOut, RefreshCw, Headset, Settings, Pin, PinOff, ChevronLeft, Building2, Brain, CalendarDays, FolderOpen } from "lucide-react";
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

import logoCastelo from "@/assets/logo-castelo.png";
import { CompanySwitcher } from "./CompanySwitcher";

interface AdminSidebarProps {
  canManageUsers: boolean;
  isAdmin?: boolean;
  currentUserName: string;
  onRefresh: () => void;
  onLogout: () => void;
}


export function AdminSidebar({ 
  canManageUsers,
  isAdmin,
  currentUserName, 
  onRefresh, 
  onLogout 
}: AdminSidebarProps) {
  const { state, setOpen, open } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [isPinned, setIsPinned] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const modules = useCompanyModules();

  // Build menu items dynamically based on permissions AND enabled modules
  const allItems = [
    { title: "Central de Atendimento", url: "/atendimento", icon: Headset },
    ...(modules.config ? [{ title: "Configurações", url: "/configuracoes", icon: Settings }] : []),
    ...(modules.inteligencia ? [{ title: "Inteligência", url: "/inteligencia", icon: Brain }] : []),
    ...(modules.agenda ? [{ title: "Agenda", url: "/agenda", icon: CalendarDays }] : []),
    { title: "Documentos", url: "/formularios", icon: FolderOpen },
    ...(canManageUsers ? [{ title: "Gerenciar Usuários", url: "/users", icon: Users }] : []),
    ...(isAdmin ? [{ title: "Empresas", url: "/hub/empresas", icon: Building2 }] : []),
  ];

  // Handle hover expand/collapse only when not pinned
  const handleMouseEnter = () => {
    if (!isPinned) {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned && !isDropdownOpen) {
      setOpen(false);
    }
  };

  const handlePinToggle = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    setOpen(newPinned);
  };

  // Quick close function
  const handleQuickClose = () => {
    setIsPinned(false);
    setOpen(false);
  };

  return (
    <>
      {/* Overlay to close sidebar easily when open and not pinned */}
      {open && !collapsed && !isPinned && (
        <div 
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] md:hidden"
          onClick={handleQuickClose}
        />
      )}
      
      <Sidebar 
        collapsible="icon" 
        className="border-r border-sidebar-border transition-all duration-200 z-40"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-3">
          <img 
            src={logoCastelo} 
            alt="Castelo da Diversão" 
            className="h-9 w-9 object-contain shrink-0 rounded-lg"
          />
          {!collapsed && (
            <>
              <div className="min-w-0 overflow-hidden flex-1">
                <p className="font-display font-bold text-sm text-sidebar-foreground truncate">
                  Castelo
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

              {/* Quick close button - more visible */}
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
                        className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-primary/15 data-[active=true]:text-sidebar-primary data-[active=true]:font-medium"
                      >
                        <NavLink 
                          to={item.url} 
                          end 
                          className="flex items-center gap-3"
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
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
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
