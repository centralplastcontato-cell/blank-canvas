import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Users, Clock, MessageSquare, ImageIcon, PauseCircle, CalendarDays } from "lucide-react";
import { useEffect } from "react";
import type { CampaignDraft } from "./CampaignWizard";
import { SendNumberPicker, useSendInstances } from "./CampaignSendNumber";
import { CAMPAIGN_DAILY_LIMIT, sendDays } from "@/lib/campaignAudience";
import { previewMessage, usableVariations } from "@/lib/campaignMessages";

interface Props {
  draft: CampaignDraft;
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
  companyName?: string;
  companyId: string;
}

export function CampaignConfigStep({ draft, setDraft, companyName = "", companyId }: Props) {
  const instances = useSendInstances(companyId);
  // Primeiro número conectado já vem escolhido
  useEffect(() => {
    if (!instances || instances.length === 0) return;
    if (!instances.some((i) => i.instance_id === draft.sendInstanceId)) {
      setDraft((prev) => ({ ...prev, sendInstanceId: instances[0].instance_id, sendMode: instances.length > 1 ? prev.sendMode : "single" }));
    }
  }, [instances, draft.sendInstanceId, setDraft]);
  const total = draft.selectedLeadIds.length;
  const variations = usableVariations(draft.variations);
  // O servidor manda até 30 por dia, espalhadas entre 9h e 19h (segunda a sábado)
  const days = sendDays(total, CAMPAIGN_DAILY_LIMIT);

  const summaryItems = [
    { icon: Users, label: "Destinatários", value: total.toLocaleString("pt-BR"), color: "text-primary" },
    { icon: MessageSquare, label: "Mensagens", value: String(variations.length), color: "text-primary" },
    {
      icon: Clock,
      label: "Dias de envio",
      value: String(Math.max(days, 1)),
      color: "text-primary",
    },
    { icon: ImageIcon, label: "Com imagem", value: draft.imageUrl ? "Sim" : "Não", color: "text-primary" },
  ];

  return (
    <div className="space-y-5">
      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {summaryItems.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20">
            <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold leading-tight">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Como sai: pelo servidor, espalhado ao longo do dia */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground/80 leading-relaxed">
        <CalendarDays className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <span>
          A campanha <strong>sai sozinha</strong>, sem precisar deixar a tela aberta: até{" "}
          <strong>{CAMPAIGN_DAILY_LIMIT} mensagens por dia</strong>, de segunda a sábado das 9h às 19h, uma a cada
          ~20 minutos com tempo variado (ritmo de robô é o que mais bloqueia o número).
          {total > 0 && (
            <> Com {total.toLocaleString("pt-BR")} pessoas, leva cerca de <strong>{Math.max(days, 1)} dia(s) de envio</strong>.</>
          )}
        </span>
      </div>

      {/* Por qual número sai */}
      <div className="p-4 rounded-xl border bg-muted/10">
        {instances === null ? (
          <p className="text-xs text-muted-foreground">Carregando números…</p>
        ) : (
          <SendNumberPicker
            instances={instances}
            mode={draft.sendMode}
            onModeChange={(m) => setDraft((prev) => ({ ...prev, sendMode: m }))}
            instanceId={draft.sendInstanceId}
            onInstanceChange={(id) => setDraft((prev) => ({ ...prev, sendInstanceId: id }))}
          />
        )}
      </div>

      {/* Pause bot on reply */}
      <div className="space-y-3 p-4 rounded-xl border bg-muted/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <PauseCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <Label className="text-sm font-semibold">Passar para a equipe quando responder</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Com a IA ligada no número, ela responde na hora quem responder em até 7 dias, sabendo da campanha, e a equipe recebe um aviso. Sem a IA: quem responder recebe a mensagem abaixo, o robô para naquela conversa e a equipe é avisada. Desligado: o atendimento automático de sempre responde.
              </p>
            </div>
          </div>
          <Switch
            checked={draft.pauseBotOnReply}
            onCheckedChange={(v) => setDraft((prev) => ({ ...prev, pauseBotOnReply: v }))}
          />
        </div>

        {draft.pauseBotOnReply && (
          <div className="space-y-1.5 pt-1">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Mensagem automática de boas-vindas
            </Label>
            <Textarea
              value={draft.autoReplyMessage}
              onChange={(e) => setDraft((prev) => ({ ...prev, autoReplyMessage: e.target.value }))}
              rows={3}
              placeholder="Oi! Recebemos sua mensagem, um atendente vai te responder em instantes 😊"
              className="text-sm resize-none"
            />
            <p className="text-[10px] text-muted-foreground">
              Enviada uma única vez quando o lead responder. Deixe vazio para apenas pausar o bot sem mensagem.
            </p>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Prévia da primeira mensagem
        </Label>
        <div className="p-3.5 bg-muted/30 rounded-xl border text-sm whitespace-pre-wrap leading-relaxed text-foreground/80">
          {variations[0] ? previewMessage(variations[0].text, "João", companyName) : "Nenhuma mensagem ainda"}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/70 text-center pt-1">
        Ao clicar em "Começar envio", a campanha entra na fila e sai sozinha. Dá para pausar a qualquer momento.
      </p>
    </div>
  );
}
