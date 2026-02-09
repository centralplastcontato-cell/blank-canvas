import { useNavigate } from "react-router-dom";
import { 
  Headset, 
  Settings, 
  Users, 
  RefreshCw, 
  LogOut, 
  Presentation,
  Building2
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


interface MobileMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  currentPage: "atendimento" | "configuracoes" | "users" | "comercial-b2b";
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  canManageUsers: boolean;
  canAccessB2B: boolean;
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
  canAccessB2B,
  isAdmin,
  onRefresh,
  onLogout,
}: MobileMenuProps) {
  const navigate = useNavigate();

  const menuItems = [
    {
      id: "atendimento",
      label: "Central de Atendimento",
      icon: Headset,
      path: "/atendimento",
      show: true,
    },
    {
      id: "configuracoes",
      label: "Configurações",
      icon: Settings,
      path: "/configuracoes",
      show: true,
    },
    {
      id: "comercial-b2b",
      label: "Comercial B2B",
      icon: Presentation,
      path: "/comercial-b2b",
      show: canAccessB2B,
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
        
        <nav className="flex flex-col p-2">
          {menuItems
            .filter(item => item.show)
            .map((item) => (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "secondary" : "ghost"}
                className="justify-start h-11 px-3"
                onClick={() => handleNavigation(item.path)}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </Button>
            ))}
          
          <Separator className="my-2" />
          
          {onRefresh && (
            <Button
              variant="ghost"
              className="justify-start h-11 px-3"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-5 h-5 mr-3" />
              Atualizar Dados
            </Button>
          )}
          
          <Button
            variant="ghost"
            className="justify-start h-11 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair da Conta
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
