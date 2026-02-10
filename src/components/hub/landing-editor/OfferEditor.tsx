import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { LPOffer } from "@/types/landing-page";

interface OfferEditorProps {
  data: LPOffer;
  onChange: (data: LPOffer) => void;
}

export function OfferEditor({ data, onChange }: OfferEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Seção ativa</Label>
        <Switch
          checked={data.enabled}
          onCheckedChange={(enabled) => onChange({ ...data, enabled })}
        />
      </div>

      <div>
        <Label>Título da oferta</Label>
        <Input
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Ex: Oferta Especial"
        />
      </div>

      <div>
        <Label>Descrição</Label>
        <Textarea
          value={data.description}
          onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="Ex: Ganhe 10% de desconto na sua primeira festa!"
          rows={3}
        />
      </div>

      <div>
        <Label>Texto de destaque (urgência)</Label>
        <Input
          value={data.highlight_text}
          onChange={(e) => onChange({ ...data, highlight_text: e.target.value })}
          placeholder="Ex: Apenas 5 vagas restantes este mês!"
        />
      </div>

      <div>
        <Label>Texto do botão CTA</Label>
        <Input
          value={data.cta_text}
          onChange={(e) => onChange({ ...data, cta_text: e.target.value })}
          placeholder="Ex: Aproveitar agora!"
        />
      </div>
    </div>
  );
}
