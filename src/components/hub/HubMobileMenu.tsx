import { useNavigate } from "react-router-dom";
import { BarChart3, Building2, Users, LogOut, Smartphone, ClipboardList, Presentation, Brain, GraduationCap, Contact } from "lucide-react";
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

interface HubMobileMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  currentPage: "hub" | "empresas" | "users" | "whatsapp" | "onboarding" | "prospeccao" | "comercial-b2b" | "consumo-ia" | "treinamento" | "leads" | "suporte";
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  onLogout: () => void;
}

const getInitials = (name: string) => {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const menuItems = [
  { id: "hub", label: "Painel Hub", icon: BarChart3, path: "/hub" },
  { id: "leads", label: "Leads", icon: Contact, path: "/hub/leads" },
  { id: "empresas", label: "Empresas", icon: Building2, path: "/hub/empresas" },
  { id: "comercial-b2b", label: "Comercial B2B", icon: Presentation, path: "/hub/comercial-b2b" },
  { id: "whatsapp", label: "WhatsApp", icon: Smartphone, path: "/hub/whatsapp" },
  { id: "users", label: "Usuários", icon: Users, path: "/hub/users" },
  { id: "onboarding", label: "Onboarding", icon: ClipboardList, path: "/hub/onboarding" },
  { id: "consumo-ia", label: "Consumo IA", icon: Brain, path: "/hub/consumo-ia" },
  { id: "treinamento", label: "Treinamento", icon: GraduationCap, path: "/hub/treinamento" },
];

export function HubMobileMenu({
  isOpen,
  onOpenChange,
  trigger,
  currentPage,
  userName,
  userEmail,
  userAvatar,
  onLogout,
}: HubMobileMenuProps) {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
              <AvatarImage src={userAvatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(userName || userEmail || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-left text-base truncate">
                {userName || "Usuário"}
              </SheetTitle>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          </div>
        </SheetHeader>

        <nav className="flex flex-col p-2">
          {menuItems.map((item) => (
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

          <Button
            variant="ghost"
            className="justify-start h-11 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => { onLogout(); onOpenChange(false); }}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair da Conta
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
