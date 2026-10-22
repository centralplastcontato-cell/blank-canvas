import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { hubNavGroups } from "./hubNavigation";

interface CompanyOption {
  id: string;
  name: string;
  logo_url: string | null;
}

// Busca rápida do Hub: telas e empresas (Ctrl/⌘ + K)
export function HubCommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || companies.length > 0) return;
    supabase
      .from("companies")
      .select("id, name, logo_url, parent_id")
      .order("name")
      .then(({ data }) => {
        const all = data || [];
        // Mesmo critério do Painel: unidades (filhas) quando existem
        const children = all.filter((c) => c.parent_id !== null);
        setCompanies(children.length > 0 ? children : all);
      });
  }, [open, companies.length]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 w-9 p-0 md:w-56 md:justify-start md:px-3 text-muted-foreground font-normal"
        aria-label="Buscar"
      >
        <Search className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline flex-1 text-left">Buscar…</span>
        <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          Ctrl K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar tela ou empresa…" />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          {hubNavGroups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={[item.label, ...(item.keywords || [])].join(" ")}
                  onSelect={() => go(item.path)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          {companies.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Empresas — abrir no Painel">
                {companies.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`empresa ${c.name}`}
                    onSelect={() => go(`/hub?empresa=${c.id}`)}
                  >
                    {c.logo_url ? (
                      <img src={c.logo_url} alt="" className="mr-2 h-4 w-4 rounded object-contain" />
                    ) : (
                      <Building2 className="mr-2 h-4 w-4" />
                    )}
                    {c.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
