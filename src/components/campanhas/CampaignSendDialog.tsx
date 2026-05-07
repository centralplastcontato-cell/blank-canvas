import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Send, Minus, CheckCircle2, XCircle, Clock, Megaphone, Pause, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCampaignSender } from "@/contexts/CampaignSenderContext";

interface Recipient {
  id: string;
  lead_name: string;
  phone: string;
  variation_index: number;
  status: string;
}

interface InstanceOption {
  id: string;
  instance_id: string;
  unit: string | null;
  phone_number: string | null;
}

interface CampaignSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: {
    id: string;
    name: string;
    message_variations: any;
    image_url: string | null;
    delay_seconds: number;
    total_recipients: number;
    pause_bot_on_reply?: boolean | null;
    auto_reply_message?: string | null;
  };
  companyId: string;
  onComplete: () => void;
}

export function CampaignSendDialog({ open, onOpenChange, campaign, companyId, onComplete }: CampaignSendDialogProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const [statuses, setStatuses] = useState<Map<string, string>>(new Map());
  const [instances, setInstances] = useState<InstanceOption[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");

  const sender = useCampaignSender();
  const isThisActive = sender.isSending && sender.activeCampaignId === campaign.id;
  const sending = isThisActive;
  const progress = isThisActive ? sender.progress : null;
  const countdown = isThisActive ? sender.countdown : null;
  const paused = isThisActive ? sender.paused : false;

  useEffect(() => {
    if (!open) return;
    loadRecipients();
    loadInstances();
  }, [open]);

  const loadRecipients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("campaign_recipients")
      .select("id, lead_name, phone, variation_index, status")
      .eq("campaign_id", campaign.id)
      .eq("status", "pending")
      .order("created_at");
    setRecipients((data as Recipient[]) || []);
    const m = new Map<string, string>();
    (data || []).forEach((r: Recipient) => m.set(r.id, "pending"));
    setStatuses(m);
    setLoading(false);
  };

  const loadInstances = async () => {
    const { data } = await supabase
      .from("wapi_instances")
      .select("id, instance_id, unit, phone_number")
      .eq("company_id", companyId)
      .eq("status", "connected")
      .order("unit", { ascending: true });
    const list = (data as InstanceOption[]) || [];
    setInstances(list);
    if (list.length > 0 && !selectedInstanceId) {
      setSelectedInstanceId(list[0].instance_id);
    }
  };

  const handleSend = async () => {
    const instanceId = selectedInstanceId || instances[0]?.instance_id || null;
    if (!instanceId) {
      toast.error("Nenhuma instância de WhatsApp conectada!");
      return;
    }
    if (sender.isSending) {
      toast.error("Já existe uma campanha em andamento.");
      return;
    }
    setResult(null);
    sender.setMinimized(false);

    await sender.startCampaign({
      campaign,
      companyId,
      instanceId,
      recipients,
      onStatusChange: (id, status) => {
        setStatuses((prev) => new Map(prev).set(id, status));
      },
      onComplete: ({ success, errors, paused: wasPaused }) => {
        if (wasPaused) {
          onOpenChange(false);
          onComplete();
        } else {
          setResult({ success, errors });
          onComplete();
        }
      },
    });
  };

  const handlePause = () => sender.pauseCampaign();

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
    onComplete();
  };

  const handleMinimize = () => {
    sender.setMinimized(true);
    onOpenChange(false);
  };

  const handleDialogChange = (newOpen: boolean) => {
    // Se está enviando e usuário fecha o dialog, apenas minimiza (envio segue rodando globalmente)
    if (sending && !newOpen) {
      handleMinimize();
      return;
    }
    onOpenChange(newOpen);
  };

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col overflow-hidden p-4 sm:p-6">
        {sending && (
          <button
            type="button"
            onClick={handleMinimize}
            className="absolute right-11 top-4 z-10 flex items-center justify-center h-6 w-6 rounded-md bg-muted hover:bg-accent text-foreground transition-colors"
            title="Minimizar (envio continua em segundo plano)"
          >
            <Minus className="h-4 w-4" />
          </button>
        )}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            {campaign.name}
          </DialogTitle>
          <DialogDescription>
            {sending ? "Enviando campanha..." : result ? "Resultado" : `${recipients.length} destinatários pendentes`}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-3 text-center">
              {result.errors === 0 ? (
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              ) : (
                <XCircle className="w-10 h-10 text-destructive" />
              )}
              <div>
                <p className="text-base font-semibold">
                  {result.success > 0 ? `Enviado para ${result.success} contato(s)!` : "Nenhuma mensagem enviada"}
                </p>
                {result.errors > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">{result.errors} falha(s)</p>
                )}
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">Fechar</Button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sending ? (
          <div className="space-y-3 py-2 flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="space-y-1.5 shrink-0">
              <p className="text-sm font-medium">{paused ? "Finalizando envio atual..." : `Enviando ${progress?.current || 0} de ${progress?.total || 0}...`}</p>
              <Progress value={progressPercent} className="h-2" />
              {progress?.waiting && countdown !== null && !paused && (
                <p className="text-xs text-muted-foreground animate-pulse">Próximo envio em {countdown}s ⏳</p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePause}
                disabled={paused}
                className="w-full mt-2"
              >
                <Pause className="w-3.5 h-3.5 mr-1.5" />
                {paused ? "Pausando..." : "Pausar campanha"}
              </Button>
            </div>
            <ScrollArea className="flex-1 border rounded-md min-h-0">
              <div className="p-1 space-y-0.5">
                {recipients.map((r) => {
                  const s = statuses.get(r.id) || "pending";
                  return (
                    <div key={r.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${s === "sending" ? "bg-accent" : ""}`}>
                      {s === "pending" && <Clock className="w-4 h-4 shrink-0 text-muted-foreground" />}
                      {s === "sending" && <Loader2 className="w-4 h-4 shrink-0 text-primary animate-spin" />}
                      {s === "sent" && <CheckCircle2 className="w-4 h-4 shrink-0 text-green-500" />}
                      {s === "error" && <XCircle className="w-4 h-4 shrink-0 text-destructive" />}
                      <span className="truncate flex-1">{r.lead_name}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground shrink-0">
              ✨ Você pode minimizar esta janela e usar a plataforma normalmente — o envio continua em segundo plano.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {instances.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  Enviar pelo WhatsApp
                </Label>
                <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a instância" />
                  </SelectTrigger>
                  <SelectContent>
                    {instances.map((inst) => (
                      <SelectItem key={inst.instance_id} value={inst.instance_id}>
                        {inst.unit || "Sem unidade"}
                        {inst.phone_number ? ` — ${inst.phone_number}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Escolha por qual número os disparos serão feitos.
                </p>
              </div>
            )}
            {instances.length === 1 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  Enviando por: <strong className="text-foreground">{instances[0].unit || "WhatsApp"}</strong>
                  {instances[0].phone_number ? ` (${instances[0].phone_number})` : ""}
                </span>
              </div>
            )}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {recipients.length} mensagens serão enviadas com intervalo de {campaign.delay_seconds}s.
                Tempo estimado: ~{Math.ceil((recipients.length * campaign.delay_seconds) / 60)} minutos.
              </p>
              <Button onClick={handleSend} className="w-full" size="lg" disabled={instances.length === 0}>
                <Send className="w-4 h-4 mr-2" />
                {instances.length === 0 ? "Nenhum WhatsApp conectado" : "Iniciar Envio"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
