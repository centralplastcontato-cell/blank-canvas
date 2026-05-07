import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, XCircle, Clock, Loader2, Users, RefreshCw, Send, ImageIcon, MessageSquare, UserCog } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  total_recipients: number;
  sent_count: number;
  error_count: number;
  message_variations: any;
  image_url: string | null;
  filters: any;
  delay_seconds: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface Recipient {
  id: string;
  lead_name: string;
  phone: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  variation_index: number;
}

interface CampaignDetailSheetProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onStartSend: (campaign: Campaign) => void;
  onResend: (campaign: Campaign) => void;
  onEditAudience?: (campaign: Campaign) => void;
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  draft: { label: "Rascunho", variant: "secondary", icon: Clock },
  sending: { label: "Enviando", variant: "default", icon: Loader2 },
  completed: { label: "Concluída", variant: "outline", icon: CheckCircle2 },
  cancelled: { label: "Cancelada", variant: "destructive", icon: XCircle },
};

export function CampaignDetailSheet({ campaign, open, onOpenChange, companyId, onStartSend, onResend, onEditAudience, onRefresh }: CampaignDetailSheetProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (campaign && open) {
      loadRecipients();
    } else {
      setRecipients([]);
    }
  }, [campaign?.id, open]);

  const loadRecipients = async () => {
    if (!campaign) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("campaign_recipients")
      .select("id, lead_name, phone, status, error_message, sent_at, variation_index")
      .eq("campaign_id", campaign.id)
      .order("lead_name");

    if (error) {
      console.error("Error loading recipients:", error);
    }
    setRecipients((data as Recipient[]) || []);
    setLoading(false);
  };

  const sentCount = recipients.filter(r => r.status === "sent").length;
  const errorCount = recipients.filter(r => r.status === "error").length;
  const pendingCount = recipients.filter(r => r.status === "pending").length;

  const handleResendErrors = async () => {
    if (!campaign) return;
    setResending(true);
    try {
      const { error } = await supabase
        .from("campaign_recipients")
        .update({ status: "pending", error_message: null })
        .eq("campaign_id", campaign.id)
        .eq("status", "error");

      if (error) throw error;

      await supabase
        .from("campaigns")
        .update({
          status: "draft",
          error_count: 0,
          sent_count: sentCount,
          total_recipients: sentCount + errorCount,
        })
        .eq("id", campaign.id);

      toast.success(`${errorCount} contato(s) preparados para reenvio`);
      onOpenChange(false);
      onRefresh();
      onResend({ ...campaign, status: "draft" });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao preparar reenvio");
    } finally {
      setResending(false);
    }
  };

  const formatPhone = (phone: string) => {
    const d = phone.replace(/\D/g, "");
    if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
    if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
    return phone;
  };

  if (!campaign) return null;

  const sc = statusConfig[campaign.status] || statusConfig.draft;
  const StatusIcon = sc.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[620px] lg:max-w-[760px] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border space-y-2">
          <SheetHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-lg truncate">{campaign.name}</SheetTitle>
              <Badge variant={sc.variant} className="shrink-0 text-[10px]">
                <StatusIcon className={`w-3 h-3 mr-1 ${campaign.status === "sending" ? "animate-spin" : ""}`} />
                {sc.label}
              </Badge>
            </div>
          </SheetHeader>
          {campaign.description && (
            <p className="text-sm text-muted-foreground">{campaign.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Criada em {format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-2 p-4 sm:px-6 border-b border-border">
          <MetricCard label="Total" value={recipients.length || campaign.total_recipients} icon={Users} color="text-foreground" />
          <MetricCard label="Enviados" value={sentCount || campaign.sent_count} icon={CheckCircle2} color="text-green-600" />
          <MetricCard label="Erros" value={errorCount || campaign.error_count} icon={XCircle} color="text-destructive" />
          <MetricCard label="Pendentes" value={pendingCount} icon={Clock} color="text-yellow-600" />
        </div>

        {/* Preview + Recipient list */}
        <ScrollArea className="flex-1 min-h-0 w-full [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:!w-full">
          <div className="w-full max-w-full overflow-hidden">
          {/* Prévia da campanha */}
          <div className="p-4 sm:px-6 border-b border-border max-w-full overflow-hidden">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Prévia da campanha
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3 min-w-0 max-w-full overflow-hidden">
              {campaign.image_url && (
                <div className="rounded-lg overflow-hidden bg-card shadow-sm max-w-[280px] border border-border">
                  <img
                    src={campaign.image_url}
                    alt="Imagem da campanha"
                    className="w-full h-auto object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              {Array.isArray(campaign.message_variations) && campaign.message_variations.length > 0 ? (
                campaign.message_variations.map((v: any, idx: number) => {
                  const text = typeof v === "string" ? v : v?.text;
                  const tone = typeof v === "object" ? v?.tone : null;
                  if (!text) return null;
                  return (
                    <div key={idx} className="space-y-1 min-w-0 max-w-full">
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-card border border-border">Variação {idx + 1}</span>
                        {tone && <span className="italic">{tone}</span>}
                      </div>
                      <div className="bg-card rounded-lg rounded-tl-none px-3 py-2 shadow-sm border border-border w-full max-w-full min-w-0 overflow-hidden">
                        <p className="text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-foreground leading-relaxed">{text}</p>
                        <p className="text-[9px] text-muted-foreground text-right mt-1">prévia</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-xs text-muted-foreground flex flex-col items-center gap-1 min-w-0">
                  <ImageIcon className="w-5 h-5 opacity-40" />
                  Nenhuma mensagem configurada
                </div>
              )}
              <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/50 break-words">
                💡 Variáveis <code className="px-1 bg-card rounded">{"{nome}"}</code> e <code className="px-1 bg-card rounded">{"{empresa}"}</code> serão substituídas no envio.
              </p>
            </div>
          </div>
          </div>

          <div className="p-4 sm:px-6 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Destinatários</p>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : recipients.length === 0 ? (
              campaign.total_recipients > 0 ? (
                <div className="text-center py-10 space-y-1">
                  <p className="text-sm text-muted-foreground">Dados de destinatários indisponíveis.</p>
                  <p className="text-xs text-muted-foreground">Possivelmente houve um erro na criação desta campanha.</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">Nenhum destinatário</p>
              )
            ) : (
              recipients.map((r) => (
                <RecipientRow key={r.id} recipient={r} formatPhone={formatPhone} messageVariations={campaign.message_variations} />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="p-4 sm:px-6 border-t border-border space-y-2">
          {campaign.status === "draft" && (
            <>
              <Button className="w-full" onClick={() => { onOpenChange(false); onStartSend(campaign); }}>
                <Send className="w-4 h-4 mr-1.5" />
                Iniciar Envio
              </Button>
              {onEditAudience && (
                <Button variant="outline" className="w-full" onClick={() => { onOpenChange(false); onEditAudience(campaign); }}>
                  <UserCog className="w-4 h-4 mr-1.5" />
                  Editar destinatários
                </Button>
              )}
            </>
          )}
          {errorCount > 0 && (
            <Button
              variant={campaign.status === "draft" ? "outline" : "default"}
              className="w-full"
              onClick={handleResendErrors}
              disabled={resending}
            >
              {resending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
              Reenviar para erros ({errorCount})
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="text-center">
      <Icon className={`w-4 h-4 mx-auto mb-0.5 ${color}`} />
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function RecipientRow({ recipient, formatPhone, messageVariations }: { recipient: Recipient; formatPhone: (p: string) => string; messageVariations: any }) {
  const statusMap: Record<string, { icon: any; label: string; cls: string }> = {
    sent: { icon: CheckCircle2, label: "Enviado", cls: "text-green-600" },
    error: { icon: XCircle, label: "Erro", cls: "text-destructive" },
    pending: { icon: Clock, label: "Pendente", cls: "text-yellow-600" },
  };
  const s = statusMap[recipient.status] || statusMap.pending;
  const SIcon = s.icon;

  const resolvedMessage = (() => {
    if (!messageVariations || !Array.isArray(messageVariations)) return null;
    const item = messageVariations[recipient.variation_index || 0];
    if (!item) return null;
    // Suporta tanto formato novo { tone, text } quanto string legada
    const template = typeof item === "string" ? item : item?.text;
    if (!template || typeof template !== "string") return null;
    return template.replace(/\{nome\}/gi, recipient.lead_name);
  })();

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{recipient.lead_name}</p>
        <p className="text-xs text-muted-foreground">{formatPhone(recipient.phone)}</p>
        {resolvedMessage && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-[11px] text-muted-foreground/70 truncate cursor-help mt-0.5 italic">"{resolvedMessage}"</p>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs whitespace-pre-wrap">{resolvedMessage}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {recipient.status === "error" && recipient.error_message && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-[10px] text-destructive truncate cursor-help">{recipient.error_message}</p>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">{recipient.error_message}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <SIcon className={`w-3.5 h-3.5 ${s.cls}`} />
        <span className={`text-[10px] font-medium ${s.cls}`}>{s.label}</span>
      </div>
    </div>
  );
}
