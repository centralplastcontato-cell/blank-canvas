import { useNavigate } from "react-router-dom";
import { 
  Headset, 
  Settings, 
  Users, 
  RefreshCw, 
  LogOut, 
  Building2,
  MessageSquare,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCompanyModules } from "@/hooks/useCompanyModules";


interface MobileMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  currentPage: "atendimento" | "configuracoes" | "users" | "whatsapp";
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  canManageUsers: boolean;
  isAdmin?: boolean;
  onRefresh?: () => void;
  onLogout: () => void;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function MobileMenu({
  isOpen,
  onOpenChange,
  trigger,
  currentPage,
  userName,
  userEmail,
  userAvatar,
  canManageUsers,
  isAdmin,
  onRefresh,
  onLogout,
}: MobileMenuProps) {
  const navigate = useNavigate();
  const modules = useCompanyModules();

  const menuItems = [
    {
      id: "atendimento",
      label: "Central de Atendimento",
      icon: Headset,
      path: "/atendimento",
      show: true,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageSquare,
      path: "/whatsapp",
      show: true,
    },
    {
      id: "inteligencia",
      label: "Inteligência",
      icon: Brain,
      path: "/inteligencia",
      show: !!modules.inteligencia,
    },
    {
      id: "configuracoes",
      label: "Configurações",
      icon: Settings,
      path: "/configuracoes",
      show: true,
    },
    {
      id: "users",
      label: "Gerenciar Usuários",
      icon: Users,
      path: "/users",
      show: canManageUsers,
    },
    {
      id: "empresas",
      label: "Empresas",
      icon: Building2,
      path: "/hub/empresas",
      show: !!isAdmin,
    },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const handleRefresh = () => {
    onRefresh?.();
    onOpenChange(false);
  };

  const handleLogout = () => {
    onLogout();
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar 
              className="h-12 w-12 border-2 border-primary/20 cursor-pointer hover:border-primary/40 transition-colors shrink-0" 
              onClick={() => handleNavigation("/configuracoes")}
            >
              <AvatarImage src={userAvatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(userName || userEmail || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-left text-base truncate">
                {userName || "Usuário"}
              </SheetTitle>
              <p className="text-xs text-muted-foreground truncate">
                {userEmail}
              </p>
            </div>
          </div>
        </SheetHeader>
        
        <nav className="flex flex-col p-3 gap-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
            Navegação
          </p>
          {menuItems
            .filter(item => item.show)
            .map((item) => (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "secondary" : "ghost"}
                className="justify-start h-10 px-3 rounded-lg text-sm font-medium"
                onClick={() => handleNavigation(item.path)}
              >
                <item.icon className="w-4 h-4 mr-3 shrink-0" />
                {item.label}
              </Button>
            ))}
          
          <Separator className="my-2" />

          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
            Ações
          </p>
          
          {onRefresh && (
            <Button
              variant="ghost"
              className="justify-start h-10 px-3 rounded-lg text-sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-4 h-4 mr-3 shrink-0" />
              Atualizar Dados
            </Button>
          )}
          
          <Button
            variant="ghost"
            className="justify-start h-10 px-3 rounded-lg text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-3 shrink-0" />
            Sair da Conta
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
