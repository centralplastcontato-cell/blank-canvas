import { useState, useEffect } from "react";
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
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { DEFAULT_PARTY_BOT_MESSAGES } from "@/components/whatsapp/settings/PartyBotMessagesCard";

function getNextMessage(messages: string[], index: number, name: string, company: string): string {
  return messages[index % messages.length]
    .replace(/\{name\}/g, name)
    .replace(/\{company\}/g, company);
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

export function SendBotButton({ guests, onSent }: Omit<SendBotDialogProps, 'recordId'> & { recordId?: string }) {
  const companyId = useCurrentCompanyId();
  const { currentCompany } = useCompany();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [minDelay, setMinDelay] = useState(8);
  const [maxDelay, setMaxDelay] = useState(15);
  const [progress, setProgress] = useState<{ current: number; total: number; waiting: boolean } | null>(null);
  const [customMessages, setCustomMessages] = useState<string[]>(DEFAULT_PARTY_BOT_MESSAGES);

  useEffect(() => {
    if (!companyId || !open) return;
    supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .single()
      .then(({ data }) => {
        const settings = data?.settings as Record<string, any> | null;
        if (settings?.party_bot_messages && Array.isArray(settings.party_bot_messages)) {
          setCustomMessages(settings.party_bot_messages);
        }
      });
  }, [companyId, open]);

  const eligibleGuests = guests.filter(
    (g) => g.wants_info && g.phone && isValidPhone(g.phone)
  );

  if (eligibleGuests.length === 0) return null;

  const validMin = Math.max(5, minDelay);
  const validMax = Math.min(30, Math.max(validMin, maxDelay));

  const handleSend = async () => {
    if (!companyId) return;
    setSending(true);
    setProgress({ current: 0, total: eligibleGuests.length, waiting: false });

    try {
      const { data: instance } = await supabase
        .from("wapi_instances")
        .select("instance_id")
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
        setProgress(null);
        return;
      }

      const companyName = currentCompany?.name || "nosso espaço";
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < eligibleGuests.length; i++) {
        const guest = eligibleGuests[i];

        if (i > 0) {
          setProgress({ current: i, total: eligibleGuests.length, waiting: true });
          await randomDelay(validMin * 1000, validMax * 1000);
        }

        setProgress({ current: i + 1, total: eligibleGuests.length, waiting: false });

        const phone = cleanPhone(guest.phone);
        const message = getNextMessage(customMessages, i, guest.name, companyName);

        try {
          const { error } = await supabase.functions.invoke("wapi-send", {
            body: {
              action: "send-text",
              phone,
              message,
              instanceId: instance.instance_id,
              lpMode: true,
              contactName: guest.name,
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
      setProgress(null);
    }
  };

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;

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

      <AlertDialog open={open} onOpenChange={sending ? undefined : setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {sending ? "Enviando mensagens..." : "Enviar Bot do WhatsApp"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {!sending ? (
                  <>
                    <p className="mb-3">
                      O bot será enviado para {eligibleGuests.length} convidado
                      {eligibleGuests.length > 1 ? "s" : ""} que demonstraram interesse:
                    </p>
                    <ul className="space-y-1 text-sm mb-4">
                      {eligibleGuests.map((g, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="font-medium">{g.name}</span>
                          <span className="text-muted-foreground">— {g.phone}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="space-y-2 rounded-md border p-3">
                      <Label className="text-xs font-medium">Intervalo de segurança (segundos)</Label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 space-y-1">
                          <Label htmlFor="minDelay" className="text-xs text-muted-foreground">Mín</Label>
                          <Input
                            id="minDelay"
                            type="number"
                            min={5}
                            max={30}
                            value={minDelay}
                            onChange={(e) => setMinDelay(Number(e.target.value))}
                            className="h-8"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label htmlFor="maxDelay" className="text-xs text-muted-foreground">Máx</Label>
                          <Input
                            id="maxDelay"
                            type="number"
                            min={5}
                            max={30}
                            value={maxDelay}
                            onChange={(e) => setMaxDelay(Number(e.target.value))}
                            className="h-8"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Protege seu número contra bloqueio do WhatsApp
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 py-2">
                    <p className="text-sm font-medium">
                      Enviando {progress?.current || 0} de {progress?.total || 0}...
                    </p>
                    <Progress value={progressPercent} className="h-2" />
                    {progress?.waiting && (
                      <p className="text-xs text-muted-foreground animate-pulse">
                        Aguardando intervalo de segurança...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancelar</AlertDialogCancel>
            {!sending && (
              <Button onClick={handleSend}>
                Enviar para {eligibleGuests.length}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
