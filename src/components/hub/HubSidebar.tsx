import { useLocation } from "react-router-dom";
import { LogOut, X } from "lucide-react";
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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { hubNavGroups } from "./hubNavigation";

interface HubSidebarProps {
  currentUserName: string;
  onLogout: () => void;
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

// Mesmo visual do menu da plataforma (admin/AdminSidebar): cartão no topo, ícones em bolinhas coloridas
export function HubSidebar({ currentUserName, onLogout }: HubSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const logoBox = (size: string, imgSize: string) => (
    <div className={cn("rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0", size)}>
      <img src={logoCelebrei} alt="Celebrei" className={cn("object-contain", imgSize)} />
    </div>
  );

  return (
    <Sidebar collapsible="icon" iconWidth="4.5rem" className="border-r border-sidebar-border z-40">
      <SidebarHeader className="p-3 pb-1 group-data-[collapsible=icon]:p-2">
        {collapsed ? (
          <div className="mx-auto" title="Hub Celebrei">
            {logoBox("h-11 w-11", "h-9 w-9")}
          </div>
        ) : (
          <div className="relative flex items-center gap-3 rounded-3xl p-3 pr-9 bg-gradient-to-br from-secondary/35 via-secondary/15 to-primary/10">
            {logoBox("h-11 w-11", "h-9 w-9")}
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-sm leading-tight tracking-tight text-sidebar-foreground truncate">
                Hub Celebrei
              </p>
              <span className="flex items-center gap-1.5 mt-1 min-w-0">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">
                    {getInitials(currentUserName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  {currentUserName ? `${currentUserName} · ` : ""}Admin
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Recolher menu"
              title="Recolher menu"
              className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-1">
        {hubNavGroups.map((group) => {
          const items = group.items.filter((item) => !item.hidden);
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label} className="py-1">
              <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60">{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:gap-2">
                  {items.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          size="lg"
                          tooltip={item.label}
                          isActive={active}
                          className={cn(
                            "relative h-12 gap-3 rounded-2xl px-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-muted/70 hover:text-sidebar-foreground",
                            "data-[active=true]:bg-secondary/25 data-[active=true]:font-semibold data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-sm",
                            "group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:overflow-visible group-data-[collapsible=icon]:data-[active=true]:shadow-none",
                          )}
                        >
                          <NavLink to={item.path} end>
                            {active && (
                              <span className="absolute left-0.5 top-3 bottom-3 w-1 rounded-full bg-secondary group-data-[collapsible=icon]:hidden" />
                            )}
                            <span
                              className={cn(
                                "h-9 w-9 group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 rounded-full flex items-center justify-center shrink-0",
                                item.color,
                                active && "group-data-[collapsible=icon]:ring-2 group-data-[collapsible=icon]:ring-inset group-data-[collapsible=icon]:ring-secondary",
                              )}
                            >
                              <item.icon className="h-[18px] w-[18px] group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5" />
                            </span>
                            <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-3 pt-2 group-data-[collapsible=icon]:p-2">
        {collapsed ? (
          <SidebarMenu className="items-center">
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Sair da conta"
                onClick={onLogout}
                className="group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:!p-0 justify-center [&>svg]:size-5 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <button
            type="button"
            onClick={onLogout}
            className="w-full h-10 rounded-full bg-destructive/10 text-sm font-medium text-destructive hover:bg-destructive/15 flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
