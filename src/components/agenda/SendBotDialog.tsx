import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Guest {
  name: string;
  age: string;
  phone: string;
  is_child_only: boolean;
  guardian_name: string;
  guardian_phone: string;
  wants_info: boolean;
}

interface SendBotDialogProps {
  guests: Guest[];
  recordId: string;
  onSent?: () => void;
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function isValidPhone(phone: string): boolean {
  return cleanPhone(phone).length >= 10;
}

export function SendBotButton({ guests, recordId, onSent }: SendBotDialogProps) {
  const companyId = useCurrentCompanyId();
  const { currentCompany } = useCompany();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const eligibleGuests = guests.filter(
    (g) => g.wants_info && g.phone && isValidPhone(g.phone)
  );

  if (eligibleGuests.length === 0) return null;

  const handleSend = async () => {
    if (!companyId) return;
    setSending(true);

    try {
      // Fetch WhatsApp instance
      const { data: instance } = await supabase
        .from("wapi_instances")
        .select("instance_id, instance_token")
        .eq("company_id", companyId)
        .eq("status", "connected")
        .limit(1)
        .maybeSingle();

      if (!instance) {
        toast({
          title: "WhatsApp não conectado",
          description: "Conecte uma instância do WhatsApp antes de enviar.",
          variant: "destructive",
        });
        setSending(false);
        return;
      }

      const companyName = currentCompany?.name || "nosso espaço";
      let successCount = 0;
      let errorCount = 0;

      for (const guest of eligibleGuests) {
        const phone = cleanPhone(guest.phone);
        const message = `Olá, ${guest.name}! 👋\n\nQue bom que você se interessou pelos nossos pacotes durante a festa no ${companyName}!\n\nVou te enviar algumas opções especiais. 🎉`;

        try {
          const { error } = await supabase.functions.invoke("wapi-send", {
            body: {
              action: "send-text",
              phone,
              message,
              instanceId: instance.instance_id,
              instanceToken: instance.instance_token,
              lpMode: true,
            },
          });

          if (error) {
            console.error(`Failed to send to ${guest.name}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`Error sending to ${guest.name}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: `Bot enviado para ${successCount} convidado${successCount > 1 ? "s" : ""}!`,
          description: errorCount > 0 ? `${errorCount} falha${errorCount > 1 ? "s" : ""}.` : undefined,
        });
      } else {
        toast({
          title: "Erro ao enviar",
          description: "Nenhuma mensagem foi enviada com sucesso.",
          variant: "destructive",
        });
      }

      setOpen(false);
      onSent?.();
    } catch (err) {
      console.error("handleSendBot error:", err);
      toast({ title: "Erro inesperado", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 relative"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Enviar Bot para interessados"
      >
        <MessageCircle className="h-4 w-4 text-primary" />
        <Badge
          variant="default"
          className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none flex items-center justify-center"
        >
          {eligibleGuests.length}
        </Badge>
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar Bot do WhatsApp</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">
                  O bot será enviado para {eligibleGuests.length} convidado
                  {eligibleGuests.length > 1 ? "s" : ""} que demonstraram interesse:
                </p>
                <ul className="space-y-1 text-sm">
                  {eligibleGuests.map((g, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="font-medium">{g.name}</span>
                      <span className="text-muted-foreground">— {g.phone}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Cada convidado receberá uma mensagem personalizada e o bot iniciará o fluxo de qualificação automaticamente.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancelar</AlertDialogCancel>
            <Button onClick={handleSend} disabled={sending}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar para {eligibleGuests.length}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
