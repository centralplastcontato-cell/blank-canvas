import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw, Pencil, ImagePlus, X, ZoomIn, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CampaignDraft } from "./CampaignWizard";

interface Props {
  draft: CampaignDraft;
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
  companyName: string;
}

const CAMPAIGN_NAME_SUGGESTIONS = [
  // Datas comemorativas (ordem cronológica)
  { name: "Esquenta de Carnaval", description: "Promoção pré-carnaval com descontos e convidados extras para festas realizadas no período." },
  { name: "Volta às Aulas", description: "Aproveitar o período de volta às aulas para promover festas de aniversário com condições facilitadas." },
  { name: "Dia das Mães", description: "Homenagem ao Dia das Mães com condições especiais para mamães que querem celebrar com os filhos." },
  { name: "Dia dos Pais", description: "Promoção especial de Dia dos Pais com pacotes família e descontos para festas no período." },
  { name: "Férias de Julho", description: "Promoção especial para festas nas férias de julho, com pacotes temáticos e preços promocionais." },
  { name: "Mês das Crianças", description: "Campanha especial de Dia das Crianças com pacotes promocionais e brindes para aniversariantes do período." },
  { name: "Black Friday", description: "Descontos imperdíveis de Black Friday em todos os pacotes de festa infantil por tempo limitado." },
  { name: "Natal Mágico", description: "Pacotes especiais de Natal com decoração temática e condições exclusivas para festas no período natalino." },
  { name: "Promoção de Natal", description: "Promoção de fim de ano com descontos progressivos e brindes para quem fechar festa em dezembro." },
  // Sazonais
  { name: "Liquidação de Verão", description: "Liquidação de verão com os melhores preços do ano em pacotes de festa infantil." },
  { name: "Especial Primavera", description: "Promoção de primavera com pacotes floridos, decoração temática e preços especiais." },
  { name: "Feriado Prolongado", description: "Aproveite o feriado prolongado para garantir sua festa com desconto especial e vagas limitadas." },
  // Promoções genéricas
  { name: "Mês do Consumidor", description: "Aproveitar o mês do consumidor para oferecer condições especiais em pacotes de festa infantil com descontos exclusivos." },
  { name: "Semana do Cliente", description: "Semana exclusiva para clientes com ofertas especiais, upgrades de pacote e brindes." },
  { name: "Promo Aniversário", description: "Comemore o aniversário do buffet com descontos exclusivos e brindes para os primeiros contratos." },
  { name: "Super Promoção", description: "Super promoção com desconto especial, convidados extras e condições imperdíveis por tempo limitado." },
  { name: "Festival de Descontos", description: "Festival de descontos com até 15% off em pacotes selecionados para festas nos próximos meses." },
  // Urgência e escassez
  { name: "Oportunidade Relâmpago", description: "Promoção relâmpago com vagas limitadas e desconto agressivo para fechar contratos esta semana." },
  { name: "Últimos Contratos", description: "Últimas vagas disponíveis no mês, urgência para fechar os contratos restantes com condições diferenciadas." },
  { name: "Última Chance", description: "Última oportunidade de garantir sua festa com as condições promocionais antes do reajuste." },
  { name: "Queima de Estoque", description: "Queima de datas disponíveis com descontos agressivos para fechar o calendário do mês." },
  { name: "Fecha em 25", description: "Condição exclusiva para quem fechar contrato com entrada de apenas R$25 por convidado." },
  { name: "Lote Promocional", description: "Lote promocional com quantidade limitada de vagas com desconto especial para os primeiros." },
  // Reengajamento
  { name: "Convite Especial", description: "Convite personalizado para leads selecionados com oferta exclusiva e prazo curto." },
  { name: "Reativação de Leads", description: "Reativar leads antigos com uma oferta irresistível para quem já demonstrou interesse anteriormente." },
];

const TONE_LABELS: Record<string, string> = {
  profissional: "🏢 Profissional",
  "amigável": "😊 Amigável",
  urgente: "⏰ Urgente",
  curta: "⚡ Curta",
  detalhada: "📝 Detalhada",
};

export function CampaignContextStep({ draft, setDraft, companyName }: Props) {
  const { currentCompanyId } = useCompany();
  const [generating, setGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleGenerate = async () => {
    if (!draft.description.trim()) {
      toast.error("Descreva o objetivo da campanha");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("campaign-ai", {
        body: { context: draft.description, companyName, company_id: currentCompanyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDraft((prev) => ({ ...prev, variations: data.variations || [] }));
      toast.success("5 variações geradas pela IA!");
    } catch (err: any) {
      console.error("campaign-ai error:", err);
      toast.error(err.message || "Erro ao gerar variações");
    } finally {
      setGenerating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `campaigns/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("sales-materials").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("sales-materials").getPublicUrl(path);
      setDraft((prev) => ({ ...prev, imageUrl: urlData.publicUrl }));
      toast.success("Imagem carregada!");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const saveEdit = (index: number) => {
    setDraft((prev) => {
      const v = [...prev.variations];
      v[index] = { ...v[index], text: editText };
      return { ...prev, variations: v };
    });
    setEditingIndex(null);
  };

  return (
    <div className="space-y-5">
      {/* Nome da campanha */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Título da campanha
        </Label>
        <Input
          placeholder="Ex: Promoção Abril 2026"
          value={draft.name}
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          className="h-10"
        />
        <ScrollArea className="h-28 rounded-lg border bg-muted/20 mt-2">
          <div className="p-1.5 space-y-0.5">
            {CAMPAIGN_NAME_SUGGESTIONS.map((s) => (
              <button
                key={s.name}
                type="button"
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-md transition-all ${
                  draft.name === s.name
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => setDraft((prev) => ({ ...prev, name: s.name, description: s.description }))}
              >
                {s.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Objetivo */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Descreva o objetivo da campanha
        </Label>
        <Textarea
          placeholder="Ex: Promover festas de abril com 10% de desconto para quem fechar até sexta..."
          value={draft.description}
          onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Botão gerar IA */}
      <Button
        onClick={handleGenerate}
        disabled={generating || !draft.description.trim()}
        className="w-full h-10 gap-2"
        variant={draft.variations.length > 0 ? "outline" : "default"}
      >
        {generating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {draft.variations.length > 0 ? "Regenerar Variações" : "Gerar 5 Variações com IA"}
      </Button>

      {/* Variações */}
      {draft.variations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Variações
              </span>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {draft.variations.length}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={handleGenerate} disabled={generating}>
              <RefreshCw className={`w-3 h-3 mr-1 ${generating ? "animate-spin" : ""}`} />
              Regenerar
            </Button>
          </div>
          <ScrollArea className="h-48 rounded-xl border bg-muted/20">
            <div className="p-2.5 space-y-2">
              {draft.variations.map((v, i) => (
                <div key={i} className="p-3 rounded-lg border bg-background shadow-sm text-sm transition-all hover:shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {TONE_LABELS[v.tone] || v.tone}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => {
                      setEditingIndex(i);
                      setEditText(v.text);
                    }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                  {editingIndex === i ? (
                    <div className="space-y-2">
                      <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} className="text-sm resize-none" />
                      <div className="flex gap-1.5 justify-end">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingIndex(null)}>Cancelar</Button>
                        <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(i)}>Salvar</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-foreground/80 leading-relaxed">{v.text}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Image upload */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Imagem (opcional)
        </Label>
        {draft.imageUrl ? (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/10 shadow-sm">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="relative group shrink-0 rounded-lg overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all"
            >
              <img src={draft.imageUrl} alt="Campaign" className="h-16 w-24 object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">Imagem da campanha</p>
              <p className="text-[11px] text-muted-foreground">Clique para visualizar</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => setDraft((prev) => ({ ...prev, imageUrl: null }))}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <label className="flex items-center gap-2.5 p-3 border border-dashed rounded-xl cursor-pointer hover:bg-muted/50 hover:border-primary/30 transition-all group">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <ImagePlus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            )}
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              {uploading ? "Enviando..." : "Clique para enviar imagem"}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
          </label>
        )}

        {/* Dialog de preview da imagem */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-lg p-2 bg-black/90 border-none">
            {draft.imageUrl && (
              <img src={draft.imageUrl} alt="Preview" className="w-full h-auto rounded-lg" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
