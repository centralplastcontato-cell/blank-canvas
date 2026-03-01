import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
import { Loader2, Send, Minus, CheckCircle2, XCircle, Clock, Megaphone } from "lucide-react";
import { toast } from "sonner";

interface Recipient {
  id: string;
  lead_name: string;
  phone: string;
  variation_index: number;
  status: string;
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
  };
  companyId: string;
  onComplete: () => void;
}

export function CampaignSendDialog({ open, onOpenChange, campaign, companyId, onComplete }: CampaignSendDialogProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; waiting: boolean } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const [statuses, setStatuses] = useState<Map<string, string>>(new Map());
  const isSendingRef = useRef(false);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setInterval(() => setCountdown((p) => (p && p > 1 ? p - 1 : null)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    if (!open) return;
    loadRecipients();
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

  const getInstanceId = async (): Promise<string | null> => {
    const { data } = await supabase
      .from("wapi_instances")
      .select("instance_id")
      .eq("company_id", companyId)
      .eq("status", "connected")
      .limit(1)
      .single();
    return data?.instance_id || null;
  };

  const handleSend = async () => {
    const instanceId = await getInstanceId();
    if (!instanceId) {
      toast.error("Nenhuma instância de WhatsApp conectada!");
      return;
    }

    setSending(true);
    isSendingRef.current = true;
    setProgress({ current: 0, total: recipients.length, waiting: false });
    setResult(null);

    // Update campaign status
    await supabase.from("campaigns").update({ status: "sending", started_at: new Date().toISOString() }).eq("id", campaign.id);

    const variations = Array.isArray(campaign.message_variations) ? campaign.message_variations : [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];

      if (i > 0) {
        const totalDelay = campaign.delay_seconds + Math.floor(Math.random() * 5);
        setCountdown(totalDelay);
        setProgress({ current: i, total: recipients.length, waiting: true });
        await new Promise((res) => setTimeout(res, totalDelay * 1000));
        setCountdown(null);
      }

      setProgress({ current: i + 1, total: recipients.length, waiting: false });
      setStatuses((prev) => new Map(prev).set(r.id, "sending"));

      const variation = variations[r.variation_index] || variations[0];
      const text = (variation?.text || "").replace(/\{nome\}/g, r.lead_name || "");

      try {
        let sendError: any = null;

        if (campaign.image_url) {
          const { error } = await supabase.functions.invoke("wapi-send", {
            body: {
              action: "send-image",
              instanceId,
              phone: r.phone,
              imageUrl: campaign.image_url,
              caption: text,
            },
          });
          sendError = error;
        } else {
          const { error } = await supabase.functions.invoke("wapi-send", {
            body: {
              action: "send-text",
              instanceId,
              phone: r.phone,
              message: text,
            },
          });
          sendError = error;
        }

        if (sendError) {
          errorCount++;
          setStatuses((prev) => new Map(prev).set(r.id, "error"));
          await supabase.from("campaign_recipients").update({ status: "error", error_message: String(sendError) }).eq("id", r.id);
        } else {
          successCount++;
          setStatuses((prev) => new Map(prev).set(r.id, "sent"));
          await supabase.from("campaign_recipients").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", r.id);
        }

        // Update campaign counts
        await supabase.from("campaigns").update({
          sent_count: successCount,
          error_count: errorCount,
        }).eq("id", campaign.id);
      } catch (err) {
        errorCount++;
        setStatuses((prev) => new Map(prev).set(r.id, "error"));
        await supabase.from("campaign_recipients").update({ status: "error", error_message: String(err) }).eq("id", r.id);
      }
    }

    // Finalize
    await supabase.from("campaigns").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      sent_count: successCount,
      error_count: errorCount,
    }).eq("id", campaign.id);

    setResult({ success: successCount, errors: errorCount });
    setSending(false);
    isSendingRef.current = false;
    setProgress(null);
    setMinimized(false);
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
    onComplete();
  };

  const handleDialogChange = (newOpen: boolean) => {
    if (sending) return;
    onOpenChange(newOpen);
  };

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;
  const dialogVisible = open && !minimized;

  const floatingBanner = minimized && (sending || result)
    ? createPortal(
        <div
          onClick={() => setMinimized(false)}
          className="fixed bottom-4 right-4 z-[100] flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg cursor-pointer hover:shadow-xl transition-shadow min-w-[240px]"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Enviando {progress?.current || 0} de {progress?.total || 0}...</p>
                {progress?.waiting && countdown !== null && (
                  <p className="text-[10px] text-muted-foreground">Próximo em {countdown}s ⏳</p>
                )}
                <Progress value={progressPercent} className="h-1.5 mt-1" />
              </div>
            </>
          ) : result ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-sm font-medium">Campanha finalizada! Clique para ver.</p>
            </>
          ) : null}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <Dialog open={dialogVisible} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col overflow-hidden p-4 sm:p-6">
          {sending && (
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="absolute right-11 top-4 z-10 flex items-center justify-center h-6 w-6 rounded-md bg-muted hover:bg-accent text-foreground transition-colors"
              title="Minimizar"
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
                <p className="text-sm font-medium">Enviando {progress?.current || 0} de {progress?.total || 0}...</p>
                <Progress value={progressPercent} className="h-2" />
                {progress?.waiting && countdown !== null && (
                  <p className="text-xs text-muted-foreground animate-pulse">Próximo envio em {countdown}s ⏳</p>
                )}
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
              <p className="text-xs text-muted-foreground shrink-0">Você pode minimizar e continuar usando o sistema.</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  {recipients.length} mensagens serão enviadas com intervalo de {campaign.delay_seconds}s.
                  Tempo estimado: ~{Math.ceil((recipients.length * campaign.delay_seconds) / 60)} minutos.
                </p>
                <Button onClick={handleSend} className="w-full" size="lg">
                  <Send className="w-4 h-4 mr-2" />
                  Iniciar Envio
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {floatingBanner}
    </>
  );
}
