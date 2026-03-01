import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Clock, MessageSquare, ImageIcon } from "lucide-react";
import type { CampaignDraft } from "./CampaignWizard";

interface Props {
  draft: CampaignDraft;
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
}

export function CampaignConfigStep({ draft, setDraft }: Props) {
  const estimatedMinutes = Math.ceil((draft.selectedLeadIds.length * draft.delaySeconds) / 60);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Users className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-lg font-bold">{draft.selectedLeadIds.length}</p>
              <p className="text-[10px] text-muted-foreground">Destinatários</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-lg font-bold">{draft.variations.length}</p>
              <p className="text-[10px] text-muted-foreground">Variações</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-lg font-bold">~{estimatedMinutes}min</p>
              <p className="text-[10px] text-muted-foreground">Tempo estimado</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-lg font-bold">{draft.imageUrl ? "Sim" : "Não"}</p>
              <p className="text-[10px] text-muted-foreground">Com imagem</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delay config */}
      <div className="space-y-2">
        <Label>Intervalo entre mensagens: {draft.delaySeconds}s</Label>
        <Slider
          value={[draft.delaySeconds]}
          onValueChange={([v]) => setDraft((prev) => ({ ...prev, delaySeconds: v }))}
          min={30}
          max={120}
          step={5}
        />
        <p className="text-xs text-muted-foreground">
          Intervalos maiores reduzem o risco de bloqueio. Recomendado: 60-90 segundos.
        </p>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-sm">Prévia da primeira mensagem:</Label>
        <div className="p-3 bg-muted/50 rounded-md border text-sm whitespace-pre-wrap">
          {draft.variations[0]?.text?.replace(/\{nome\}/g, "João") || "Nenhuma variação gerada"}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Ao clicar em "Criar e Iniciar Envio", a campanha será salva e você poderá iniciar o disparo imediatamente.
      </p>
    </div>
  );
}
