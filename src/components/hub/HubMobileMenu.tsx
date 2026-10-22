import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border-2 border-primary/20 shrink-0">
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

        <ScrollArea className="flex-1 min-h-0">
          <nav className="flex flex-col p-2 pb-6">
            {hubNavGroups.map((group) => (
              <div key={group.label} className="mb-1">
                <p className="px-3 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </p>
                {group.items.filter((item) => !item.hidden).map((item) => {
                  const active = currentPage === item.id;
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start h-10 px-3 font-normal",
                        active && "bg-primary/10 text-primary font-semibold hover:bg-primary/15 hover:text-primary"
                      )}
                      onClick={() => handleNavigation(item.path)}
                    >
                      <item.icon className="w-[18px] h-[18px] mr-3" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            ))}

            <Separator className="my-2" />

            <Button
              variant="ghost"
              className="justify-start h-10 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => { onLogout(); onOpenChange(false); }}
            >
              <LogOut className="w-[18px] h-[18px] mr-3" />
              Sair da Conta
            </Button>
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
