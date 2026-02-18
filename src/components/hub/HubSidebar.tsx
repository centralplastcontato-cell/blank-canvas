import { useState } from "react";
import { useLocation } from "react-router-dom";
import { BarChart3, Building2, Users, LogOut, ChevronLeft, Pin, PinOff, Smartphone, ClipboardList, Target, Presentation } from "lucide-react";
import logoCelebrei from "@/assets/logo-celebrei-2.png";
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

const hubMenuItems = [
  { title: "Painel Hub", url: "/hub", icon: BarChart3 },
  { title: "Empresas", url: "/hub/empresas", icon: Building2 },
  { title: "Comercial B2B", url: "/hub/comercial-b2b", icon: Presentation },
  { title: "Prospecção", url: "/hub/prospeccao", icon: Target },
  { title: "WhatsApp", url: "/hub/whatsapp", icon: Smartphone },
  { title: "Usuários", url: "/hub/users", icon: Users },
  { title: "Onboarding", url: "/hub/onboarding", icon: ClipboardList },
];

interface HubSidebarProps {
  currentUserName: string;
  onLogout: () => void;
}

export function HubSidebar({ currentUserName, onLogout }: HubSidebarProps) {
  const { state, setOpen, open } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [isPinned, setIsPinned] = useState(false);

  const handleMouseEnter = () => {
    if (!isPinned) setOpen(true);
  };

  const handleMouseLeave = () => {
    if (!isPinned) setOpen(false);
  };

  const handlePinToggle = () => {
    const newPinned = !isPinned;
    setIsPinned(newPinned);
    setOpen(newPinned);
  };

  const handleQuickClose = () => {
    setIsPinned(false);
    setOpen(false);
  };

  return (
    <>
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
            <div className="h-[72px] w-[72px] rounded-lg flex items-center justify-center shrink-0">
              <img src={logoCelebrei} alt="Celebrei" className="h-16 w-16 object-contain" />
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 overflow-hidden flex-1">
                  <p className="font-display font-bold text-sm text-sidebar-foreground truncate">
                    Hub Celebrei
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {currentUserName}
                  </p>
                </div>
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname === item.url}
                          className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5 transition-all duration-200 data-[active=true]:bg-sidebar-accent/80 data-[active=true]:text-sidebar-primary data-[active=true]:font-semibold data-[active=true]:border-l-4 data-[active=true]:border-sidebar-primary"
                        >
                          <NavLink to={item.url} end className="flex items-center gap-3">
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
