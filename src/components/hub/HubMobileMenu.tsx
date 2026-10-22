import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import logoCelebrei from "@/assets/logo-celebrei-2.png";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { hubNavGroups, type HubPage } from "./hubNavigation";

interface HubMobileMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  currentPage: HubPage;
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  onLogout: () => void;
}

const getInitials = (name: string) => {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

// Mesmo visual do menu da plataforma (admin/MobileMenu): cartão flutuante, ícones em bolinhas coloridas
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
  const who = userName || userEmail || "Usuário";

  const go = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      {/* Sem foco automático: senão o cabeçalho abre com uma borda de seleção */}
      <SheetContent
        side="left"
        className="inset-y-2 left-2 h-auto w-[19rem] p-0 flex flex-col rounded-[28px] border-0 shadow-2xl overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Hub e quem está logado */}
        <SheetHeader className="p-3 pb-1 text-left">
          <div className="flex items-center gap-3 w-full rounded-3xl p-3 pr-9 bg-gradient-to-br from-secondary/35 via-secondary/15 to-primary/10">
            <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              <img src={logoCelebrei} alt="Celebrei" className="h-10 w-10 object-contain" />
            </div>
            <div className="min-w-0 flex-1 flex flex-col">
              <SheetTitle asChild>
                <span className="block font-display tracking-tight text-base font-bold leading-tight truncate">Hub Celebrei</span>
              </SheetTitle>
              <span className="flex items-center gap-1.5 mt-1 min-w-0">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={userAvatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-semibold">{getInitials(who)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">{who} · Admin</span>
              </span>
            </div>
          </div>
        </SheetHeader>

        {/* Itens em grupos */}
        <nav className="flex-1 overflow-y-auto px-3 py-1">
          {hubNavGroups.map((group) => {
            const items = group.items.filter((item) => !item.hidden);
            if (items.length === 0) return null;
            return (
              <div key={group.label} className="py-1.5">
                <p className="text-xs font-semibold text-muted-foreground/80 px-3 pt-1 pb-1">{group.label}</p>
                {items.map((item) => {
                  const active = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item.path)}
                      className={cn(
                        "relative w-full flex items-center gap-3 h-12 px-2.5 rounded-2xl text-sm font-medium transition-colors",
                        active ? "bg-secondary/25 text-foreground font-semibold shadow-sm" : "text-foreground/80 hover:bg-muted/70",
                      )}
                    >
                      {active && <span className="absolute left-1 top-3 bottom-3 w-1 rounded-full bg-secondary" />}
                      <span className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", item.color)}>
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Rodapé */}
        <div className="p-3 pt-2">
          <button
            onClick={() => { onLogout(); onOpenChange(false); }}
            className="w-full h-11 rounded-full bg-destructive/10 text-sm font-medium text-destructive hover:bg-destructive/15 flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
