import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Clock, MessageSquare, ImageIcon, Info } from "lucide-react";
import type { CampaignDraft } from "./CampaignWizard";

interface Props {
  draft: CampaignDraft;
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
}

export function CampaignConfigStep({ draft, setDraft }: Props) {
  const estimatedMinutes = Math.ceil((draft.selectedLeadIds.length * draft.delaySeconds) / 60);

  const summaryItems = [
    { icon: Users, label: "Destinatários", value: String(draft.selectedLeadIds.length), color: "text-primary" },
    { icon: MessageSquare, label: "Variações", value: String(draft.variations.length), color: "text-primary" },
    { icon: Clock, label: "Tempo estimado", value: `~${estimatedMinutes}min`, color: "text-primary" },
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

      {/* Delay config */}
      <div className="space-y-3 p-4 rounded-xl border bg-muted/10">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Intervalo entre mensagens
          </Label>
          <span className="text-sm font-bold text-primary">{draft.delaySeconds}s</span>
        </div>
        <Slider
          value={[draft.delaySeconds]}
          onValueChange={([v]) => setDraft((prev) => ({ ...prev, delaySeconds: v }))}
          min={30}
          max={120}
          step={5}
        />
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Intervalos maiores reduzem o risco de bloqueio. Recomendado: 60–90 segundos.</span>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Prévia da primeira mensagem
        </Label>
        <div className="p-3.5 bg-muted/30 rounded-xl border text-sm whitespace-pre-wrap leading-relaxed text-foreground/80">
          {draft.variations[0]?.text?.replace(/\{nome\}/g, "João") || "Nenhuma variação gerada"}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/70 text-center pt-1">
        Ao clicar em "Criar e Iniciar Envio", a campanha será salva e você poderá iniciar o disparo imediatamente.
      </p>
    </div>
  );
}
