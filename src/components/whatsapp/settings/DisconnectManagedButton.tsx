import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Unplug } from "lucide-react";

/**
 * Número conectado pelo "Conectar meu WhatsApp" (managed_by_celebrei): o dono
 * desconecta por aqui. O servidor só aceita número celebrei-* criado pela
 * Celebrei (whatsapp-connect → remove) e apaga a instância da Evolution.
 */
export function DisconnectManagedButton({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const disconnect = async () => {
    if (!window.confirm("Desconectar o WhatsApp do buffet da plataforma? As conversas já salvas continuam aqui, e você pode conectar de novo quando quiser.")) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-connect", { body: { action: "remove", company_id: companyId } });
    setBusy(false);
    if (error || data?.error) {
      toast({ title: "Não consegui desconectar", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "WhatsApp desconectado" });
    onDone();
  };
  return (
    <Button type="button" size="sm" variant="outline" onClick={disconnect} disabled={busy}>
      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Unplug className="w-4 h-4 mr-2" />}
      Desconectar
    </Button>
  );
}
