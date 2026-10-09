import { useState } from "react";
import { useLocation } from "react-router-dom";
import { LogOut, RefreshCw, Lightbulb, X } from "lucide-react";
import { prefetchRoute } from "@/App";
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
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FloatingTips, reactivateFloatingTips } from "@/components/ui/floating-tips";
import { cn } from "@/lib/utils";

import { CompanySwitcher } from "./CompanySwitcher";
import { useCompany } from "@/contexts/CompanyContext";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";
import { MENU_GROUPS, badgeText, getInitials, roleLabel, useMenuItems } from "./menuItems";

interface AdminSidebarProps {
  canManageUsers: boolean;
  isAdmin?: boolean;
  currentUserName: string;
  canViewFinanceiro?: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

// Menu lateral do computador e do tablet, com o mesmo visual do menu do celular
// (MobileMenu): cartão da empresa, grupos, ícones coloridos em círculo e números
// de pendências. Recolhido, mostra só os círculos (com o nome ao passar o mouse).
export function AdminSidebar({
  isAdmin,
  currentUserName,
  canViewFinanceiro = true,
  onRefresh,
  onLogout,
}: AdminSidebarProps) {
  const { state, isMobile, setOpenMobile, setOpen } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const closeSidebar = () => (isMobile ? setOpenMobile(false) : setOpen(false));
  const location = useLocation();
  const [, setIsDropdownOpen] = useState(false);
  const { currentCompany, currentRole } = useCompany();
  const { items, authName } = useMenuItems({ isAdmin, canViewFinanceiro, badgesEnabled: true });

  const companyName = currentCompany?.name || "Empresa";
  const companyLogo = getCompanyLogoOverride(currentCompany?.slug, currentCompany?.logo_url);
  // Algumas páginas mandam o nome da empresa no lugar do nome da pessoa
  const who = currentUserName && currentUserName !== currentCompany?.name ? currentUserName : authName || currentUserName;

  const logoBox = (size: string, imgSize: string) => (
    <div className={cn("rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0", size)}>
      {companyLogo ? (
        <img src={companyLogo} alt={companyName} className={cn("object-contain", imgSize)} />
      ) : (
        <span className="text-xs font-bold text-primary">{getInitials(companyName)}</span>
      )}
    </div>
  );

  return (
    <>
    <Sidebar collapsible="icon" iconWidth="4.5rem" className="border-r border-sidebar-border z-40">
      {/* Empresa e quem está logado */}
      <SidebarHeader className="p-3 pb-1 group-data-[collapsible=icon]:p-2">
        {collapsed ? (
          <div className="mx-auto" title={companyName}>
            {logoBox("h-11 w-11 rounded-2xl", "h-9 w-9")}
          </div>
        ) : (
          <div className="relative flex items-center gap-3 rounded-3xl p-3 pr-9 bg-gradient-to-br from-secondary/35 via-secondary/15 to-primary/10">
            {logoBox("h-11 w-11", "h-9 w-9")}
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-sm leading-tight tracking-tight text-sidebar-foreground truncate">
                {companyName}
              </p>
              <span className="flex items-center gap-1.5 mt-1 min-w-0">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">
                    {getInitials(who || companyName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  {who ? `${who} · ` : ""}{roleLabel(currentRole, isAdmin)}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={closeSidebar}
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
        <div className="px-2 pt-1">
          <CompanySwitcher collapsed={collapsed} onDropdownOpenChange={setIsDropdownOpen} />
        </div>

        {/* Itens em grupos */}
        {MENU_GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group.id);
          if (groupItems.length === 0) return null;
          return (
            <SidebarGroup key={group.id} className="py-1">
              <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60">{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:gap-2">
                  {groupItems.map((item) => {
                    const active = location.pathname === item.path;
                    const hasBadge = !!item.badge && item.badge > 0;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          size="lg"
                          tooltip={hasBadge ? `${item.label} (${badgeText(item.badge!)})` : item.label}
                          isActive={active}
                          className={cn(
                            "relative h-12 gap-3 rounded-2xl px-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-muted/70 hover:text-sidebar-foreground",
                            "data-[active=true]:bg-secondary/25 data-[active=true]:font-semibold data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-sm",
                            "group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:overflow-visible group-data-[collapsible=icon]:data-[active=true]:shadow-none",
                          )}
                        >
                          <NavLink
                            to={item.path}
                            end
                            onMouseEnter={() => prefetchRoute(item.path)}
                            onFocus={() => prefetchRoute(item.path)}
                          >
                            {active && (
                              <span className="absolute left-0.5 top-3 bottom-3 w-1 rounded-full bg-secondary group-data-[collapsible=icon]:hidden" />
                            )}
                            <span
                              className={cn(
                                "relative h-9 w-9 group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 rounded-full flex items-center justify-center shrink-0",
                                item.color,
                                active && "group-data-[collapsible=icon]:ring-2 group-data-[collapsible=icon]:ring-inset group-data-[collapsible=icon]:ring-secondary",
                              )}
                            >
                              <item.icon className="h-[18px] w-[18px] group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5" />
                              {/* Recolhido: o número vira uma bolinha */}
                              {hasBadge && (
                                <span
                                  className={cn(
                                    "hidden group-data-[collapsible=icon]:block absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-sidebar",
                                    item.badgeTone === "info" ? "bg-emerald-500" : "bg-red-500",
                                  )}
                                />
                              )}
                            </span>
                            <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                            {hasBadge && (
                              <span
                                className={cn(
                                  "min-w-[1.5rem] h-6 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 group-data-[collapsible=icon]:hidden",
                                  item.badgeTone === "info" ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500 text-white",
                                )}
                              >
                                {badgeText(item.badge!)}
                              </span>
                            )}
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

      {/* Ações no rodapé */}
      <SidebarFooter className="p-3 pt-2 group-data-[collapsible=icon]:p-2">
        {collapsed ? (
          <SidebarMenu className="items-center gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Atualizar dados" onClick={onRefresh} className="group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:!p-0 justify-center [&>svg]:size-5 rounded-full text-sidebar-foreground/70">
                <RefreshCw />
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Dicas da plataforma" onClick={() => reactivateFloatingTips()} className="group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:!p-0 justify-center [&>svg]:size-5 rounded-full text-sidebar-foreground/70">
                <Lightbulb />
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Sair da conta" onClick={onLogout} className="group-data-[collapsible=icon]:!size-11 group-data-[collapsible=icon]:!p-0 justify-center [&>svg]:size-5 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10">
                <LogOut />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => reactivateFloatingTips()}
              className="w-full h-9 rounded-full text-xs font-medium text-sidebar-foreground/60 hover:bg-muted/70 hover:text-sidebar-foreground flex items-center justify-center gap-1.5"
            >
              <Lightbulb className="h-3.5 w-3.5" /> Dicas da plataforma
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onRefresh}
                className="flex-1 h-10 rounded-full bg-card shadow-sm border border-border/60 text-sm font-medium text-foreground/70 hover:bg-muted flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Atualizar
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex-1 h-10 rounded-full bg-destructive/10 text-sm font-medium text-destructive hover:bg-destructive/15 flex items-center justify-center gap-2"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    <FloatingTips />
    </>
  );
}
