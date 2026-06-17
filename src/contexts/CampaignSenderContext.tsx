import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Pause, Megaphone, Maximize2, GripVertical, ChevronDown, ChevronUp, AlertCircle, Clock, Send } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface Recipient {
  id: string;
  lead_name: string;
  phone: string;
  variation_index: number;
  status: string;
}

interface CampaignPayload {
  id: string;
  name: string;
  message_variations: any;
  image_url: string | null;
  delay_seconds: number;
  pause_bot_on_reply?: boolean | null;
  auto_reply_message?: string | null;
}

interface StartParams {
  campaign: CampaignPayload;
  companyId: string;
  instanceId: string;
  recipients: Recipient[];
  /** "single": tudo pela instanceId. "smart": cada lead pela instância onde já conversou (fallback = instanceId). */
  mode?: "single" | "smart";
  onStatusChange?: (recipientId: string, status: string) => void;
  onComplete?: (result: { success: number; errors: number; paused: boolean }) => void;
}

function normalizePhone(p: string): string {
  return (p || "").replace(/\D/g, "");
}
function phoneVariantsList(p: string): string[] {
  const n = normalizePhone(p);
  const v = new Set<string>();
  if (n) {
    v.add(n);
    v.add(n.replace(/^55/, ""));
    if (!n.startsWith("55")) v.add(`55${n}`);
  }
  return [...v].filter(Boolean);
}

interface CampaignSenderContextValue {
  isSending: boolean;
  activeCampaignId: string | null;
  activeCampaignName: string | null;
  progress: { current: number; total: number; waiting: boolean } | null;
  countdown: number | null;
  paused: boolean;
  startCampaign: (params: StartParams) => Promise<void>;
  pauseCampaign: () => void;
  isMinimized: boolean;
  setMinimized: (v: boolean) => void;
}

const CampaignSenderContext = createContext<CampaignSenderContextValue | null>(null);

export function useCampaignSender() {
  const ctx = useContext(CampaignSenderContext);
  if (!ctx) throw new Error("useCampaignSender must be used within CampaignSenderProvider");
  return ctx;
}

export function CampaignSenderProvider({ children }: { children: ReactNode }) {
  const [isSending, setIsSending] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [activeCampaignName, setActiveCampaignName] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; waiting: boolean } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [isMinimized, setIsMinimizedState] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [bannerPos, setBannerPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem("campaign_banner_pos");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const dragRef = useRef<{ dx: number; dy: number; dragging: boolean }>({ dx: 0, dy: 0, dragging: false });

  const pauseRequestedRef = useRef(false);
  const isSendingRef = useRef(false);

  // Countdown ticker
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setInterval(() => setCountdown((p) => (p && p > 1 ? p - 1 : null)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const startCampaign = useCallback(async ({ campaign, companyId, instanceId, recipients, mode = "single", onStatusChange, onComplete }: StartParams) => {
    if (isSendingRef.current) {
      toast.error("Já existe uma campanha em andamento. Aguarde finalizar ou pause.");
      return;
    }

    isSendingRef.current = true;
    pauseRequestedRef.current = false;
    setIsSending(true);
    setPaused(false);
    setActiveCampaignId(campaign.id);
    setActiveCampaignName(campaign.name);
    setProgress({ current: 0, total: recipients.length, waiting: false });

    // Buscar nome da empresa para interpolar {empresa}
    const { data: companyData } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();
    const companyName = companyData?.name || "";

    await supabase.from("campaigns").update({ status: "sending", started_at: new Date().toISOString() }).eq("id", campaign.id);

    // Limpa campanhas presas em "sending" de sessões anteriores (ex: browser fechado durante envio)
    await supabase
      .from("campaigns")
      .update({ status: "draft" })
      .eq("company_id", companyId)
      .eq("status", "sending")
      .neq("id", campaign.id);

    // Smart mode: pre-resolve phone -> instance_id (WAPI string id)
    // Looks at wapi_conversations (most recent per phone) joined with wapi_instances.
    const phoneToInstance = new Map<string, string>();
    if (mode === "smart" && recipients.length > 0) {
      try {
        const allVariants = new Set<string>();
        const jids = new Set<string>();
        recipients.forEach((r) => {
          phoneVariantsList(r.phone).forEach((v) => {
            allVariants.add(v);
            jids.add(`${v}@s.whatsapp.net`);
            jids.add(`${v}@c.us`);
          });
        });
        // Só considera instâncias ATIVAS e CONECTADAS — evita rotear para
        // instâncias legadas/desligadas (ex: W-API antiga com assinatura vencida)
        const { data: convs } = await supabase
          .from("wapi_conversations")
          .select("remote_jid, last_message_at, instance:wapi_instances!inner(instance_id, company_id, is_active, status)")
          .eq("instance.company_id", companyId)
          .eq("instance.is_active", true)
          .eq("instance.status", "connected")
          .in("remote_jid", [...jids])
          .order("last_message_at", { ascending: false });

        (convs || []).forEach((c: any) => {
          const jid = c.remote_jid as string;
          const phoneOnly = jid.split("@")[0];
          const instStr = c.instance?.instance_id;
          if (!instStr) return;
          // Map every variant of this phone to the same instance (first wins = most recent due to ordering)
          phoneVariantsList(phoneOnly).forEach((v) => {
            if (!phoneToInstance.has(v)) phoneToInstance.set(v, instStr);
          });
        });
        console.log(`[campaign-smart] Resolved ${phoneToInstance.size} phone→instance mappings for ${recipients.length} recipients`);
      } catch (e) {
        console.error("[campaign-smart] Failed to resolve instances, will fallback to selected:", e);
      }
    }

    const variations = Array.isArray(campaign.message_variations) ? campaign.message_variations : [];


    // Seed counters with cumulative totals already persisted in campaign_recipients
    // so that pausing/resuming a campaign does not overwrite previous progress.
    let successCount = 0;
    let errorCount = 0;
    try {
      const { count: sentCount } = await supabase
        .from("campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("status", "sent");
      const { count: errCount } = await supabase
        .from("campaign_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .eq("status", "error");
      successCount = sentCount || 0;
      errorCount = errCount || 0;
    } catch (e) {
      console.warn("Could not seed campaign counters from recipients:", e);
    }

    for (let i = 0; i < recipients.length; i++) {
      if (pauseRequestedRef.current) break;
      const r = recipients[i];

      if (i > 0) {
        const totalDelay = campaign.delay_seconds + Math.floor(Math.random() * 5);
        setCountdown(totalDelay);
        setProgress({ current: i, total: recipients.length, waiting: true });
        for (let s = 0; s < totalDelay; s++) {
          if (pauseRequestedRef.current) break;
          await new Promise((res) => setTimeout(res, 1000));
        }
        setCountdown(null);
        if (pauseRequestedRef.current) break;
      }

      setProgress({ current: i + 1, total: recipients.length, waiting: false });
      onStatusChange?.(r.id, "sending");

      const variation = variations[r.variation_index] || variations[0];
      const text = (variation?.text || "")
        .replace(/\{\{?\s*nome\s*\}?\}/gi, r.lead_name || "")
        .replace(/\{\{?\s*empresa\s*\}?\}/gi, companyName);

      // Resolve which instance to use for this recipient
      let useInstanceId = instanceId;
      if (mode === "smart") {
        const variants = phoneVariantsList(r.phone);
        for (const v of variants) {
          const mapped = phoneToInstance.get(v);
          if (mapped) { useInstanceId = mapped; break; }
        }
      }

      try {
        let sendError: any = null;

        if (campaign.image_url) {
          const { error } = await supabase.functions.invoke("wapi-send", {
            body: { action: "send-image", instanceId: useInstanceId, phone: r.phone, mediaUrl: campaign.image_url, caption: text, source: "campaign", automation: true },
          });
          sendError = error;
        } else {
          const { error } = await supabase.functions.invoke("wapi-send", {
            body: { action: "send-text", instanceId: useInstanceId, phone: r.phone, message: text, source: "campaign", automation: true },
          });
          sendError = error;
        }

        if (sendError) {
          errorCount++;
          onStatusChange?.(r.id, "error");
          await supabase.from("campaign_recipients").update({ status: "error", error_message: String(sendError) }).eq("id", r.id);
        } else {
          successCount++;
          onStatusChange?.(r.id, "sent");
          await supabase.from("campaign_recipients").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", r.id);

          // Sempre marcar a conversa para que o vendedor seja avisado quando o lead responder.
          // Quando pause_bot_on_reply = false, usa modo "soft" (não desliga o bot).
          try {
            await supabase.functions.invoke("campaign-mark-conversation", {
              body: {
                campaign_id: campaign.id,
                phone: r.phone,
                instance_id: useInstanceId,
                lead_name: r.lead_name,
                soft: !campaign.pause_bot_on_reply,
              },
            });
          } catch (markErr) {
            console.error("Error marking conversation for campaign reply tracking:", markErr);
          }
        }

        await supabase.from("campaigns").update({ sent_count: successCount, error_count: errorCount }).eq("id", campaign.id);
      } catch (err) {
        errorCount++;
        onStatusChange?.(r.id, "error");
        await supabase.from("campaign_recipients").update({ status: "error", error_message: String(err) }).eq("id", r.id);
      }
    }

    const wasPaused = pauseRequestedRef.current;

    await supabase.from("campaigns").update({
      status: wasPaused ? "draft" : "completed",
      completed_at: wasPaused ? null : new Date().toISOString(),
      sent_count: successCount,
      error_count: errorCount,
    }).eq("id", campaign.id);

    if (wasPaused) {
      toast.success(`Campanha pausada. ${successCount} enviados, ${recipients.length - successCount - errorCount} pendentes.`);
    } else {
      toast.success(`Campanha finalizada! ${successCount} enviados${errorCount ? `, ${errorCount} falhas` : ""}.`);
    }

    onComplete?.({ success: successCount, errors: errorCount, paused: wasPaused });

    setIsSending(false);
    isSendingRef.current = false;
    setProgress(null);
    setCountdown(null);
    setPaused(false);
    pauseRequestedRef.current = false;
    // Mantém id por alguns segundos para mostrar "finalizada" e some
    setTimeout(() => {
      setActiveCampaignId(null);
      setActiveCampaignName(null);
    }, 5000);
  }, []);

  const pauseCampaign = useCallback(() => {
    if (!isSendingRef.current) return;
    pauseRequestedRef.current = true;
    setPaused(true);
    toast.info("Pausando após o envio atual...");
  }, []);

  const setMinimized = useCallback((v: boolean) => setIsMinimizedState(v), []);

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  // Drag handlers
  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.currentTarget.parentElement as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    dragRef.current = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
      dragging: true,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return;
    const w = 320, h = 80;
    const x = Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX - dragRef.current.dx));
    const y = Math.max(8, Math.min(window.innerHeight - h - 8, e.clientY - dragRef.current.dy));
    setBannerPos({ x, y });
  };
  const handleDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (bannerPos) {
      try { localStorage.setItem("campaign_banner_pos", JSON.stringify(bannerPos)); } catch {}
    }
  };

  // Banner global flutuante – aparece sempre que minimizado e há campanha rodando
  const bannerStyle: React.CSSProperties = bannerPos
    ? { left: bannerPos.x, top: bannerPos.y, right: "auto", bottom: "auto" }
    : { right: 16, bottom: 16 };

  const remaining = progress ? Math.max(progress.total - progress.current, 0) : 0;
  const errorCountState = 0; // tracked locally inside startCampaign; we surface live via progress only

  const banner = isSending && isMinimized
    ? createPortal(
        <div
          className="fixed z-[200] rounded-xl border bg-background shadow-xl select-none overflow-hidden transition-all"
          style={{ ...bannerStyle, width: expanded ? 340 : undefined, minWidth: expanded ? 340 : 280, maxWidth: 360 }}
        >
          {/* Header row (always visible) */}
          <div className="flex items-center gap-2 px-2 py-3 pr-3">
            <div
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              className="shrink-0 flex items-center justify-center h-8 w-5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
              title="Arraste para mover"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex-1 min-w-0 text-left"
              title={expanded ? "Recolher" : "Expandir detalhes"}
            >
              <p className="text-xs font-semibold truncate flex items-center gap-1.5">
                <Megaphone className="w-3 h-3 text-primary" />
                {activeCampaignName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {paused ? "Pausando..." : `Enviando ${progress?.current || 0} de ${progress?.total || 0}`}
                {progress?.waiting && countdown !== null && !paused && ` • próximo em ${countdown}s`}
              </p>
              <Progress value={progressPercent} className="h-1.5 mt-1" />
            </button>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md bg-muted hover:bg-accent text-foreground transition-colors"
              title={expanded ? "Recolher" : "Expandir"}
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={pauseCampaign}
              disabled={paused}
              className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md bg-muted hover:bg-accent text-foreground transition-colors disabled:opacity-50"
              title="Pausar campanha"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Expanded details */}
          {expanded && progress && (
            <div className="border-t bg-muted/30 px-3 py-3 space-y-2.5 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-background border p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                    <Send className="h-3 w-3" />
                    <span className="text-[10px] uppercase tracking-wide">Enviados</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{progress.current}</p>
                </div>
                <div className="rounded-lg bg-background border p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                    <Clock className="h-3 w-3" />
                    <span className="text-[10px] uppercase tracking-wide">Restam</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{remaining}</p>
                </div>
                <div className="rounded-lg bg-background border p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-[10px] uppercase tracking-wide">Total</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{progress.total}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>Progresso</span>
                <span className="font-semibold text-foreground">{progressPercent}%</span>
              </div>

              {progress.waiting && countdown !== null && !paused && (
                <div className="flex items-center gap-2 rounded-md bg-background border px-2 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Próximo envio em <strong className="text-foreground">{countdown}s</strong></span>
                </div>
              )}

              {paused && (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-2 py-1.5 text-amber-900 dark:text-amber-200">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Pausando após o envio atual...</span>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground leading-relaxed pt-1 border-t">
                💡 Você pode navegar pela plataforma — a campanha continua rodando em segundo plano.
              </p>
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <CampaignSenderContext.Provider
      value={{
        isSending,
        activeCampaignId,
        activeCampaignName,
        progress,
        countdown,
        paused,
        startCampaign,
        pauseCampaign,
        isMinimized,
        setMinimized,
      }}
    >
      {children}
      {banner}
    </CampaignSenderContext.Provider>
  );
}
