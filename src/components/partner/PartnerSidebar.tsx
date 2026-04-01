import { LayoutDashboard, Package, ShoppingCart, Settings, Store, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuItems = [
  { title: "Painel", url: "/parceiro", icon: LayoutDashboard },
  { title: "Catálogo", url: "/parceiro/catalogo", icon: Package },
  { title: "Pedidos", url: "/parceiro/pedidos", icon: ShoppingCart },
  { title: "Configurações", url: "/parceiro/config", icon: Settings },
];

export function PartnerSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";
  const { currentCompany } = useCompany();

  const companyName = currentCompany?.name || "Empresa Parceira";
  const logoUrl = currentCompany?.logo_url || "";
  const initials = companyName.slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 rounded-xl flex-shrink-0 bg-primary shadow-sm">
            <AvatarImage src={logoUrl} alt={companyName} className="rounded-xl object-cover" />
            <AvatarFallback className="rounded-xl bg-primary text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-bold text-sm text-sidebar-foreground truncate">{companyName}</p>
              <p className="text-[10px] text-sidebar-foreground/60">Empresa Parceira</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="bg-sidebar-border/50" />

      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/parceiro"}
                      className="hover:bg-sidebar-accent rounded-lg transition-colors"
                      activeClassName="font-medium"
                      activeStyle={{ backgroundColor: "hsl(var(--sidebar-primary))", color: "hsl(var(--sidebar-primary-foreground))" }}
                    >
                      <item.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Separator className="bg-sidebar-border/50 mb-3" />
        <div className="flex items-center gap-2">
          <SidebarTrigger className="text-sidebar-foreground/60 hover:text-sidebar-foreground" />
          {!collapsed && (
            <Button variant="ghost" size="sm" className="text-sidebar-foreground/60 hover:text-sidebar-foreground ml-auto text-xs gap-1.5" onClick={() => navigate("/atendimento")}>
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}