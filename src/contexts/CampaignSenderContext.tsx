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
  onStatusChange?: (recipientId: string, status: string) => void;
  onComplete?: (result: { success: number; errors: number; paused: boolean }) => void;
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

  const startCampaign = useCallback(async ({ campaign, companyId, instanceId, recipients, onStatusChange, onComplete }: StartParams) => {
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

    const variations = Array.isArray(campaign.message_variations) ? campaign.message_variations : [];
    let successCount = 0;
    let errorCount = 0;

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

      try {
        let sendError: any = null;

        if (campaign.image_url) {
          const { error } = await supabase.functions.invoke("wapi-send", {
            body: { action: "send-image", instanceId, phone: r.phone, mediaUrl: campaign.image_url, caption: text },
          });
          sendError = error;
        } else {
          const { error } = await supabase.functions.invoke("wapi-send", {
            body: { action: "send-text", instanceId, phone: r.phone, message: text },
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

          if (campaign.pause_bot_on_reply) {
            try {
              await supabase.functions.invoke("campaign-mark-conversation", {
                body: { campaign_id: campaign.id, phone: r.phone, instance_id: instanceId, lead_name: r.lead_name },
              });
            } catch (markErr) {
              console.error("Error marking conversation for campaign pause:", markErr);
            }
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

  const banner = isSending && isMinimized
    ? createPortal(
        <div
          className="fixed z-[200] flex items-center gap-2 rounded-lg border bg-background px-2 py-3 pr-4 shadow-xl min-w-[280px] max-w-[360px] select-none"
          style={bannerStyle}
        >
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
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate flex items-center gap-1.5">
              <Megaphone className="w-3 h-3 text-primary" />
              {activeCampaignName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {paused ? "Pausando..." : `Enviando ${progress?.current || 0} de ${progress?.total || 0}`}
              {progress?.waiting && countdown !== null && !paused && ` • próximo em ${countdown}s`}
            </p>
            <Progress value={progressPercent} className="h-1.5 mt-1" />
          </div>
          <button
            type="button"
            onClick={pauseCampaign}
            disabled={paused}
            className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md bg-muted hover:bg-accent text-foreground transition-colors disabled:opacity-50"
            title="Pausar campanha"
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
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
