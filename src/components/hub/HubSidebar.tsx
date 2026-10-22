import { useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
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
import { hubNavGroups } from "./hubNavigation";

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
            collapsed ? "h-8 w-8" : "h-12 w-12"
          )}>
            <img src={logoCelebrei} alt="Celebrei" className={cn("object-contain transition-all duration-150", collapsed ? "h-7 w-7" : "h-11 w-11")} />
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

      <SidebarContent className="gap-0">
        {hubNavGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-[11px] uppercase tracking-wider">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.filter((item) => !item.hidden).map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      isActive={location.pathname === item.path}
                      className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors data-[active=true]:bg-sidebar-accent/80 data-[active=true]:text-sidebar-primary data-[active=true]:font-semibold"
                    >
                      <NavLink to={item.path} end className="flex items-center gap-3">
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
