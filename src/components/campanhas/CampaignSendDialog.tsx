import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Send, Megaphone, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { CAMPAIGN_DAILY_LIMIT, sendDays } from "@/lib/campaignAudience";
import { SendNumberPicker, useSendInstances, type SendMode } from "./CampaignSendNumber";

interface CampaignSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: {
    id: string;
    name: string;
  };
  companyId: string;
  onComplete: () => void;
}

// O envio agora é feito pelo servidor (campaign-dispatch): esta tela só coloca a
// campanha na fila, escolhendo por qual número sai. Pode fechar a tela depois.
export function CampaignSendDialog({ open, onOpenChange, campaign, companyId, onComplete }: CampaignSendDialogProps) {
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const [sendMode, setSendMode] = useState<SendMode>("smart");
  const [saving, setSaving] = useState(false);
  const loaded = useSendInstances(companyId, open);
  const instances = useMemo(() => loaded || [], [loaded]);

  useEffect(() => {
    if (open) loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (instances.length > 0 && !selectedInstanceId) setSelectedInstanceId(instances[0].instance_id);
  }, [instances, selectedInstanceId]);

  const loadPending = async () => {
    setPendingCount(null);
    const { count } = await supabase
      .from("campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .in("status", ["pending", "sending"]);
    setPendingCount(count || 0);
  };

  const handleQueue = async () => {
    const instanceId = selectedInstanceId || instances[0]?.instance_id || null;
    if (!instanceId) {
      toast.error("Nenhum WhatsApp conectado!");
      return;
    }
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      // Quem ficou "enviando" no envio antigo pela tela (página fechada no meio) volta para a fila
      await db
        .from("campaign_recipients")
        .update({ status: "pending" })
        .eq("campaign_id", campaign.id)
        .eq("status", "sending")
        .is("claimed_at", null);
      const { error } = await db
        .from("campaigns")
        .update({
          status: "sending",
          server_send: true,
          send_mode: instances.length > 1 ? sendMode : "single",
          send_instance_id: instanceId,
          started_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", campaign.id);
      if (error) throw error;
      toast.success(`Campanha na fila! Ela sai sozinha, até ${CAMPAIGN_DAILY_LIMIT} por dia.`);
      onOpenChange(false);
      onComplete();
    } catch (err) {
      console.error("Erro ao colocar a campanha na fila:", err);
      toast.error("Não foi possível começar o envio");
    } finally {
      setSaving(false);
    }
  };

  const days = sendDays(pendingCount || 0, CAMPAIGN_DAILY_LIMIT);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            {campaign.name}
          </DialogTitle>
          <DialogDescription>
            {pendingCount === null ? "Carregando..." : `${pendingCount} pessoa(s) para receber`}
          </DialogDescription>
        </DialogHeader>

        {pendingCount === null ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <SendNumberPicker instances={instances} mode={sendMode} onModeChange={setSendMode} instanceId={selectedInstanceId} onInstanceChange={setSelectedInstanceId} />

            {pendingCount > 0 && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs leading-relaxed text-foreground/80">
                <CalendarClock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>
                  A campanha <strong>sai sozinha</strong>: até <strong>{CAMPAIGN_DAILY_LIMIT} por dia</strong>, de segunda a sábado
                  das 9h às 19h, uma a cada ~20 minutos com tempo variado (para proteger o número).
                  {days > 1 ? <> Leva cerca de <strong>{days} dias de envio</strong>.</> : " Termina hoje ou no próximo dia de envio."}
                  {" "}Pode fechar esta tela. Se outra campanha estiver saindo, esta vem logo depois dela.
                </span>
              </div>
            )}

            <Button
              onClick={handleQueue}
              className="w-full"
              size="lg"
              disabled={saving || instances.length === 0 || pendingCount === 0}
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {instances.length === 0 ? "Nenhum WhatsApp conectado" : pendingCount === 0 ? "Nada para enviar" : "Começar envio"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
