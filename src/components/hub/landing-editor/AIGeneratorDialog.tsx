import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Sparkles, Loader2, DatabaseZap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CompanyLandingPage } from "@/types/landing-page";

type LPData = Omit<CompanyLandingPage, "id" | "company_id" | "created_at" | "updated_at">;

interface AIGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  onGenerated: (data: LPData) => void;
}

export function AIGeneratorDialog({ open, onOpenChange, companyId, companyName, onGenerated }: AIGeneratorDialogProps) {
  const [description, setDescription] = useState("");
  const [promoTheme, setPromoTheme] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [hasOnboarding, setHasOnboarding] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Check if onboarding data exists for this company
    supabase
      .from("company_onboarding")
      .select("id")
      .eq("company_id", companyId)
      .limit(1)
      .then(({ data }) => setHasOnboarding(!!data?.length));
  }, [open, companyId]);

  const loadFromOnboarding = async () => {
    setLoadingOnboarding(true);
    try {
      const { data: ob } = await supabase
        .from("company_onboarding")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!ob) {
        toast.error("Nenhum onboarding encontrado para esta empresa");
        return;
      }

      // Build description from onboarding data
      const parts: string[] = [];
      if (ob.buffet_name) parts.push(`Buffet: ${ob.buffet_name}`);
      if (ob.city && ob.state) parts.push(`Localização: ${ob.city}/${ob.state}`);
      if (ob.full_address) parts.push(`Endereço: ${ob.full_address}`);
      if (ob.service_hours) parts.push(`Horário: ${ob.service_hours}`);
      if (ob.attendants_count) parts.push(`${ob.attendants_count} atendentes`);
      if (ob.multiple_units) parts.push("Múltiplas unidades");
      if (ob.main_goal) parts.push(`Objetivo: ${ob.main_goal}`);
      if (ob.brand_notes) parts.push(`Marca: ${ob.brand_notes}`);

      setDescription(parts.join(". ") + ".");

      // Extra info
      const extras: string[] = [];
      if (ob.instagram) extras.push(`Instagram: ${ob.instagram}`);
      if (ob.website) extras.push(`Site: ${ob.website}`);
      if (ob.contact_phone) extras.push(`Telefone: ${ob.contact_phone}`);
      if (ob.additional_notes) extras.push(ob.additional_notes);
      if (extras.length) setExtraInfo(extras.join("\n"));

      // Videos
      if (ob.video_urls?.length) setVideoUrl(ob.video_urls[0]);

      // Photos
      if (ob.photo_urls?.length) setPhotos(ob.photo_urls);

      toast.success("Dados do onboarding carregados!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados do onboarding");
    } finally {
      setLoadingOnboarding(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);

    const newPhotos = [...photos];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${companyId}/gallery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error } = await supabase.storage.from("landing-pages").upload(path, file);
      if (error) {
        toast.error(`Erro ao enviar ${file.name}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from("landing-pages").getPublicUrl(path);
      newPhotos.push(urlData.publicUrl);
    }
    setPhotos(newPhotos);
    setUploading(false);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error("Descreva o buffet para a IA gerar a LP");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-landing-page", {
        body: {
          company_name: companyName,
          description,
          promo_theme: promoTheme,
          video_url: videoUrl || null,
          photo_urls: photos,
          extra_info: extraInfo,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      onGenerated({
        hero: { ...data.hero, background_image_url: photos[0] || null },
        video: data.video,
        gallery: data.gallery,
        testimonials: data.testimonials,
        offer: data.offer,
        theme: data.theme,
        footer: data.footer,
        is_published: false,
      });

      toast.success("LP gerada com sucesso! Revise e salve.");
      onOpenChange(false);
    } catch (err: any) {
      console.error("AI generation error:", err);
      toast.error(err.message || "Erro ao gerar LP com IA");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Criar LP com IA
          </DialogTitle>
          <DialogDescription>
            Descreva o buffet e a IA gera toda a landing page automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasOnboarding && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={loadFromOnboarding}
              disabled={loadingOnboarding}
            >
              {loadingOnboarding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <DatabaseZap className="h-4 w-4 mr-2" />
              )}
              Preencher com dados do Onboarding
            </Button>
          )}

          <div>
            <Label>Descrição do buffet *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Buffet infantil premium em São Paulo, 3 salões temáticos, capacidade para 200 convidados, decoração personalizada, cardápio gourmet..."
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label>Tema da promoção</Label>
            <Input
              value={promoTheme}
              onChange={(e) => setPromoTheme(e.target.value)}
              placeholder="Ex: Férias de Julho - 20% off para festas em julho"
            />
          </div>

          <div>
            <Label>URL do vídeo institucional</Label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Ex: https://youtube.com/watch?v=..."
            />
          </div>

          <div>
            <Label>Fotos do espaço ({photos.length})</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                  <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-16 object-cover" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removePhoto(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center h-16 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Adicionar</span>
                  </>
                )}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          <div>
            <Label>Informações extras</Label>
            <Textarea
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
              placeholder="Ex: Estacionamento grátis, equipe bilíngue, 15 anos de experiência, endereço: Rua..."
              className="min-h-[60px]"
            />
          </div>

          <Button onClick={handleGenerate} disabled={generating || !description.trim()} className="w-full" size="lg">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Gerando LP...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Landing Page
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
