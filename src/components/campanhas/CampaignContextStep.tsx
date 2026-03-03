import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw, Pencil, ImagePlus, ZoomIn, Trash2, Building2, Image, Wand2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { CampaignDraft } from "./CampaignWizard";

interface Props {
  draft: CampaignDraft;
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
  companyName: string;
}

const CAMPAIGN_TYPE_OPTIONS = [
  { group: "Datas Comemorativas", items: [
    { value: "Esquenta de Carnaval", description: "Promoção pré-carnaval com descontos e convidados extras para festas realizadas no período." },
    { value: "Volta às Aulas", description: "Aproveitar o período de volta às aulas para promover festas de aniversário com condições facilitadas." },
    { value: "Dia das Mães", description: "Homenagem ao Dia das Mães com condições especiais para mamães que querem celebrar com os filhos." },
    { value: "Dia dos Pais", description: "Promoção especial de Dia dos Pais com pacotes família e descontos para festas no período." },
    { value: "Férias de Julho", description: "Promoção especial para festas nas férias de julho, com pacotes temáticos e preços promocionais." },
    { value: "Mês das Crianças", description: "Campanha especial de Dia das Crianças com pacotes promocionais e brindes para aniversariantes do período." },
    { value: "Black Friday", description: "Descontos imperdíveis de Black Friday em todos os pacotes de festa infantil por tempo limitado." },
    { value: "Natal Mágico", description: "Pacotes especiais de Natal com decoração temática e condições exclusivas para festas no período natalino." },
    { value: "Promoção de Natal", description: "Promoção de fim de ano com descontos progressivos e brindes para quem fechar festa em dezembro." },
  ]},
  { group: "Sazonais", items: [
    { value: "Liquidação de Verão", description: "Liquidação de verão com os melhores preços do ano em pacotes de festa infantil." },
    { value: "Especial Primavera", description: "Promoção de primavera com pacotes floridos, decoração temática e preços especiais." },
    { value: "Feriado Prolongado", description: "Aproveite o feriado prolongado para garantir sua festa com desconto especial e vagas limitadas." },
  ]},
  { group: "Promoções Genéricas", items: [
    { value: "Mês do Consumidor", description: "Aproveitar o mês do consumidor para oferecer condições especiais em pacotes de festa infantil com descontos exclusivos." },
    { value: "Semana do Cliente", description: "Semana exclusiva para clientes com ofertas especiais, upgrades de pacote e brindes." },
    { value: "Promo Aniversário", description: "Comemore o aniversário do buffet com descontos exclusivos e brindes para os primeiros contratos." },
    { value: "Super Promoção", description: "Super promoção com desconto especial, convidados extras e condições imperdíveis por tempo limitado." },
    { value: "Festival de Descontos", description: "Festival de descontos com até 15% off em pacotes selecionados para festas nos próximos meses." },
  ]},
  { group: "Urgência e Escassez", items: [
    { value: "Oportunidade Relâmpago", description: "Promoção relâmpago com vagas limitadas e desconto agressivo para fechar contratos esta semana." },
    { value: "Últimos Contratos", description: "Últimas vagas disponíveis no mês, urgência para fechar os contratos restantes com condições diferenciadas." },
    { value: "Última Chance", description: "Última oportunidade de garantir sua festa com as condições promocionais antes do reajuste." },
    { value: "Queima de Estoque", description: "Queima de datas disponíveis com descontos agressivos para fechar o calendário do mês." },
    { value: "Fecha em 25", description: "Condição exclusiva para quem fechar contrato com entrada de apenas R$25 por convidado." },
    { value: "Lote Promocional", description: "Lote promocional com quantidade limitada de vagas com desconto especial para os primeiros." },
  ]},
  { group: "Reengajamento", items: [
    { value: "Convite Especial", description: "Convite personalizado para leads selecionados com oferta exclusiva e prazo curto." },
    { value: "Reativação de Leads", description: "Reativar leads antigos com uma oferta irresistível para quem já demonstrou interesse anteriormente." },
  ]},
];

const TONE_LABELS: Record<string, string> = {
  profissional: "🏢 Profissional",
  "amigável": "😊 Amigável",
  urgente: "⏰ Urgente",
  curta: "⚡ Curta",
  detalhada: "📝 Detalhada",
};

export function CampaignContextStep({ draft, setDraft, companyName }: Props) {
  const { currentCompanyId, currentCompany } = useCompany();
  const [generating, setGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [composing, setComposing] = useState(false);
  const [includeLogo, setIncludeLogo] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [artDialogOpen, setArtDialogOpen] = useState(false);
  const [buffetPhotos, setBuffetPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [logoPosition, setLogoPosition] = useState<string>("bottom-right");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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

  const saveImageToGallery = async (imageUrl: string, source: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id || !currentCompanyId) return;
      await supabase.from("campaign_images" as any).insert({
        company_id: currentCompanyId,
        image_url: imageUrl,
        source,
        campaign_name: draft.campaignType || draft.name || null,
        created_by: user.user.id,
      });
    } catch (err) {
      console.error("Error saving image to gallery:", err);
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
      await saveImageToGallery(urlData.publicUrl, "upload");
      toast.success("Imagem carregada!");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadForArt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `campaigns/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("sales-materials").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("sales-materials").getPublicUrl(path);
      setSelectedPhoto(urlData.publicUrl);
      toast.success("Foto carregada!");
    } catch (err: any) {
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUseLogo = async () => {
    if (currentCompany?.logo_url) {
      setDraft((prev) => ({ ...prev, imageUrl: currentCompany.logo_url }));
      await saveImageToGallery(currentCompany.logo_url, "logo");
      toast.success("Logotipo aplicado!");
    }
  };

  const handleOpenArtDialog = async () => {
    setArtDialogOpen(true);
    setSelectedPhoto(null);
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from("sales_materials")
        .select("id, name, photo_urls")
        .eq("company_id", currentCompanyId!)
        .eq("is_active", true);
      if (error) throw error;

      const allPhotos: string[] = [];
      (data || []).forEach((m: any) => {
        if (Array.isArray(m.photo_urls)) {
          m.photo_urls.forEach((url: string) => {
            if (url) allPhotos.push(url);
          });
        }
      });
      setBuffetPhotos(allPhotos);
    } catch (err: any) {
      toast.error("Erro ao carregar fotos");
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleComposeArt = async () => {
    if (!selectedPhoto) {
      toast.error("Selecione uma foto base primeiro");
      return;
    }
    setComposing(true);
    try {
      const { data, error } = await supabase.functions.invoke("campaign-image", {
        body: {
          base_image_url: selectedPhoto,
          logo_url: includeLogo && currentCompany?.logo_url ? currentCompany.logo_url : null,
          company_id: currentCompanyId,
          position: logoPosition,
          campaign_theme: draft.campaignType || draft.name || null,
          context: draft.description || null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Nenhuma imagem retornada");

      setDraft((prev) => ({ ...prev, imageUrl: data.url }));
      await saveImageToGallery(data.url, "ai_compose");
      setArtDialogOpen(false);
      toast.success("Arte profissional criada com IA! 🎨");
    } catch (err: any) {
      console.error("campaign-image error:", err);
      toast.error(err.message || "Erro ao criar arte");
    } finally {
      setComposing(false);
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
      {/* Título da campanha */}
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
      </div>

      {/* Tipo da campanha */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tipo da campanha
        </Label>
        <Select
          value={draft.campaignType}
          onValueChange={(value) => {
            const allItems = CAMPAIGN_TYPE_OPTIONS.flatMap((g) => g.items);
            const match = allItems.find((item) => item.value === value);
            setDraft((prev) => ({
              ...prev,
              campaignType: value,
              description: match?.description || prev.description,
            }));
          }}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Selecione o tipo..." />
          </SelectTrigger>
          <SelectContent>
            {CAMPAIGN_TYPE_OPTIONS.map((group) => (
              <SelectGroup key={group.group}>
                <SelectLabel>{group.group}</SelectLabel>
                {group.items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.value}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
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

      {/* Image section */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Imagem (opcional)
        </Label>
        {draft.imageUrl ? (
          <div className="rounded-xl border border-border/60 bg-muted/10 shadow-sm overflow-hidden">
            {/* Preview row */}
            <div className="flex items-center gap-3 p-3">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="relative group shrink-0 rounded-lg overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all"
              >
                <img src={draft.imageUrl} alt="Campaign" className="h-16 w-24 object-contain bg-white" />
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
            {/* Action bar */}
            <div className="flex items-center border-t border-border/40 divide-x divide-border/40">
              <button
                type="button"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                onClick={handleOpenArtDialog}
              >
                <Wand2 className="w-3 h-3" />
                Criar Arte
              </button>
              <label className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                <ImagePlus className="w-3 h-3" />
                Trocar
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Primary CTA: Criar Arte Profissional */}
            <Button
              type="button"
              className="w-full h-12 gap-2.5 text-sm font-semibold"
              onClick={handleOpenArtDialog}
            >
              <Wand2 className="w-4.5 h-4.5" />
              Criar Arte Profissional
            </Button>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              ou
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 p-2.5 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/30 transition-all text-xs text-muted-foreground hover:text-foreground">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                Upload manual
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
              {currentCompany?.logo_url && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-auto py-2.5 gap-2 border-dashed text-xs"
                  onClick={handleUseLogo}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Usar Logotipo
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Dialog de preview da imagem */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-lg p-2 bg-black/90 border-none">
            {draft.imageUrl && (
              <img src={draft.imageUrl} alt="Preview" className="w-full h-auto rounded-lg" />
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Criar Arte Profissional */}
        <Dialog open={artDialogOpen} onOpenChange={setArtDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Criar Arte Profissional
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Step 1: Select photo */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Escolha a foto base
                </Label>

                {selectedPhoto ? (
                  <div className="relative rounded-xl overflow-hidden border-2 border-primary shadow-md">
                    <img src={selectedPhoto} alt="Foto selecionada" className="w-full h-48 object-contain bg-white" />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 h-7 text-xs gap-1"
                      onClick={() => setSelectedPhoto(null)}
                    >
                      <RefreshCw className="w-3 h-3" />
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <>
                    {loadingPhotos ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : buffetPhotos.length > 0 ? (
                      <ScrollArea className="h-52">
                        <div className="grid grid-cols-3 gap-2 p-1">
                          {buffetPhotos.map((url, i) => (
                            <button
                              key={i}
                              type="button"
                              className="relative group rounded-lg overflow-hidden border-2 border-border/40 hover:border-primary hover:shadow-md transition-all bg-white dark:bg-muted/30"
                              onClick={() => setSelectedPhoto(url)}
                            >
                              <div className="w-full pt-[100%] relative">
                                <img
                                  src={url}
                                  alt={`Foto ${i + 1}`}
                                  className="absolute inset-0 w-full h-full object-contain p-0.5"
                                  loading="lazy"
                                />
                              </div>
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <Image className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma foto encontrada nos materiais de venda.
                      </p>
                    )}

                    <label className="flex items-center justify-center gap-2 p-3 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/30 transition-all text-sm text-muted-foreground hover:text-foreground">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                      {uploading ? "Enviando..." : "Fazer upload de outra foto"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadForArt} disabled={uploading} />
                    </label>
                  </>
                )}
              </div>

              {/* Step 2: Logo options */}
              {currentCompany?.logo_url && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    2. Logotipo
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-logo-art"
                      checked={includeLogo}
                      onCheckedChange={(v) => setIncludeLogo(!!v)}
                    />
                    <label htmlFor="include-logo-art" className="text-sm cursor-pointer">
                      Incluir logotipo na arte
                    </label>
                  </div>
                  {includeLogo && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-muted-foreground">Posição do logo</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { value: "top-left", label: "↖" },
                          { value: "top-right", label: "↗" },
                          { value: "center", label: "⊕" },
                          { value: "bottom-left", label: "↙" },
                          { value: "bottom-right", label: "↘" },
                        ].map((pos) => (
                          <button
                            key={pos.value}
                            type="button"
                            className={`p-2 text-sm rounded-md border transition-colors ${
                              logoPosition === pos.value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/30 hover:bg-muted border-border"
                            }`}
                            onClick={() => setLogoPosition(pos.value)}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Generate button */}
              <Button
                className="w-full h-11 gap-2 text-sm font-semibold"
                onClick={handleComposeArt}
                disabled={composing || !selectedPhoto}
              >
                {composing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando arte profissional...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Gerar Arte Profissional
                  </>
                )}
              </Button>

              {!selectedPhoto && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Selecione uma foto do buffet para a IA criar uma arte promocional profissional
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
