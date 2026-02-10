import { useCompany } from "@/contexts/CompanyContext";
import { Building2, ChevronsUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { USER_COMPANY_ROLE_LABELS } from "@/types/company";

interface CompanySwitcherProps {
  collapsed?: boolean;
  onDropdownOpenChange?: (open: boolean) => void;
}

export function CompanySwitcher({ collapsed = false, onDropdownOpenChange }: CompanySwitcherProps) {
  const { currentCompany, currentRole, userCompanies, switchCompany, isLoading } = useCompany();

  // Don't render if user has only one company
  if (userCompanies.length <= 1) return null;

  if (collapsed) {
    return (
      <DropdownMenu onOpenChange={onDropdownOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            <Building2 className="h-5 w-5 text-sidebar-foreground/70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Trocar empresa</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {userCompanies.map((uc) => (
            <DropdownMenuItem
              key={uc.company_id}
              onClick={() => switchCompany(uc.company_id)}
              className="flex items-center gap-2 cursor-pointer"
            >
              {uc.company.logo_url ? (
                <img src={uc.company.logo_url} alt="" className="h-5 w-5 rounded object-contain" />
              ) : (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="flex-1 truncate text-sm">{uc.company.name}</span>
              {currentCompany?.id === uc.company_id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu onOpenChange={onDropdownOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between gap-2 h-auto py-2 px-3 text-left hover:bg-sidebar-accent"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2 min-w-0">
            {currentCompany?.logo_url ? (
              <img src={currentCompany.logo_url} alt="" className="h-6 w-6 rounded object-contain shrink-0" />
            ) : (
              <Building2 className="h-5 w-5 shrink-0 text-sidebar-foreground/70" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {currentCompany?.name || "Selecionar empresa"}
              </p>
              {currentRole && (
                <p className="text-[10px] text-sidebar-foreground/50 truncate">
                  {USER_COMPANY_ROLE_LABELS[currentRole]}
                </p>
              )}
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Trocar empresa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userCompanies.map((uc) => (
          <DropdownMenuItem
            key={uc.company_id}
            onClick={() => switchCompany(uc.company_id)}
            className="flex items-center gap-2 cursor-pointer"
          >
            {uc.company.logo_url ? (
              <img src={uc.company.logo_url} alt="" className="h-5 w-5 rounded object-contain" />
            ) : (
              <Building2 className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{uc.company.name}</p>
              <p className="text-[10px] text-muted-foreground">{USER_COMPANY_ROLE_LABELS[uc.role]}</p>
            </div>
            {currentCompany?.id === uc.company_id && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
