import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, UserX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Optout {
  id: string;
  phone: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  /** avisa quem abriu que a lista mudou (para recarregar contagens) */
  onChanged?: () => void;
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

// Quem mandou "sair", "parar" ou "não quero mais" e por isso não recebe campanhas.
// Se a pessoa pedir para voltar a receber, a equipe tira daqui.
export function OptoutListDialog({ open, onOpenChange, companyId, onChanged }: Props) {
  const [items, setItems] = useState<Optout[] | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !companyId) return;
    setItems(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("campaign_optouts")
      .select("id, phone, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data }: { data: Optout[] | null }) => setItems(data || []));
  }, [open, companyId]);

  const remove = async (item: Optout) => {
    setRemoving(item.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("campaign_optouts").delete().eq("id", item.id);
    setRemoving(null);
    if (error) {
      toast.error("Não foi possível tirar da lista");
      return;
    }
    setItems((prev) => (prev || []).filter((i) => i.id !== item.id));
    toast.success("Tirado da lista: volta a poder receber campanhas");
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-primary" /> Pediram para sair
          </DialogTitle>
          <DialogDescription>
            Mandaram "sair", "parar" ou "não quero mais" e não recebem mais campanhas. Se a pessoa pedir para voltar a
            receber, tire da lista.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {items === null ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Ninguém pediu para sair até agora.</p>
          ) : (
            <div className="space-y-1.5">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border/70 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{formatPhone(item.phone)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      desde {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full shrink-0"
                    disabled={removing === item.id}
                    onClick={() => remove(item)}
                  >
                    {removing === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Tirar da lista"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
