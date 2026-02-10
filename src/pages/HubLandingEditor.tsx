import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Eye, Loader2, Image, Play, MessageCircle, Tag, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { HeroEditor } from "@/components/hub/landing-editor/HeroEditor";
import { VideoEditor } from "@/components/hub/landing-editor/VideoEditor";
import { GalleryEditor } from "@/components/hub/landing-editor/GalleryEditor";
import { TestimonialsEditor } from "@/components/hub/landing-editor/TestimonialsEditor";
import { OfferEditor } from "@/components/hub/landing-editor/OfferEditor";
import { ThemeEditor } from "@/components/hub/landing-editor/ThemeEditor";
import { AIGeneratorDialog } from "@/components/hub/landing-editor/AIGeneratorDialog";
import type {
  CompanyLandingPage,
  LPHero,
  LPVideo,
  LPGallery,
  LPTestimonials,
  LPOffer,
  LPTheme,
} from "@/types/landing-page";

const DEFAULT_LP: Omit<CompanyLandingPage, "id" | "company_id" | "created_at" | "updated_at"> = {
  hero: { title: "", subtitle: "", cta_text: "Quero fazer minha festa!", background_image_url: null },
  video: { enabled: true, title: "Conheça nosso espaço", video_url: null, video_type: "youtube" },
  gallery: { enabled: true, title: "Galeria de Fotos", photos: [] },
  testimonials: { enabled: true, title: "O que nossos clientes dizem", items: [] },
  offer: { enabled: true, title: "Oferta Especial", description: "", highlight_text: "", cta_text: "Aproveitar agora!" },
  theme: {
    primary_color: "#7c3aed", secondary_color: "#f59e0b", background_color: "#0f0d15",
    text_color: "#ffffff", font_heading: "Inter", font_body: "Inter", button_style: "rounded",
  },
  footer: { show_address: true, show_phone: true, show_instagram: true, custom_text: "" },
  is_published: false,
};

export default function HubLandingEditor() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [lpData, setLpData] = useState(DEFAULT_LP);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    const load = async () => {
      // Load company info
      const { data: company } = await supabase
        .from("companies")
        .select("name, slug")
        .eq("id", companyId)
        .single();

      if (company) {
        setCompanyName(company.name);
        setCompanySlug(company.slug);
      }

      // Load existing LP data
      const { data: lp } = await supabase
        .from("company_landing_pages" as any)
        .select("*")
        .eq("company_id", companyId)
        .single();

      if (lp) {
        setExistingId((lp as any).id);
        setLpData({
          hero: (lp as any).hero as LPHero,
          video: (lp as any).video as LPVideo,
          gallery: (lp as any).gallery as LPGallery,
          testimonials: (lp as any).testimonials as LPTestimonials,
          offer: (lp as any).offer as LPOffer,
          theme: (lp as any).theme as LPTheme,
          footer: (lp as any).footer,
          is_published: (lp as any).is_published,
        });
      }

      setLoading(false);
    };

    load();
  }, [companyId]);

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);

    try {
      const payload = {
        company_id: companyId,
        hero: lpData.hero as any,
        video: lpData.video as any,
        gallery: lpData.gallery as any,
        testimonials: lpData.testimonials as any,
        offer: lpData.offer as any,
        theme: lpData.theme as any,
        footer: lpData.footer as any,
        is_published: lpData.is_published,
      };

      if (existingId) {
        const { error } = await supabase
          .from("company_landing_pages" as any)
          .update(payload)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("company_landing_pages" as any)
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        if (data) setExistingId((data as any).id);
      }

      toast.success("Landing page salva com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <HubLayout currentPage="empresas" header={<h1 className="text-lg font-bold">Carregando...</h1>}>
        {() => (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </HubLayout>
    );
  }

  return (
    <HubLayout
      currentPage="empresas"
      header={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/hub/empresas")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Landing Page</h1>
            <p className="text-xs text-muted-foreground">{companyName}</p>
          </div>
        </div>
      }
    >
      {() => (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Top actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">Publicada</Label>
              <Switch
                checked={lpData.is_published}
                onCheckedChange={(is_published) => setLpData((prev) => ({ ...prev, is_published }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setAiDialogOpen(true)}>
                <Sparkles className="h-4 w-4 mr-1" /> Criar com IA
              </Button>
              {companySlug && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/lp/${companySlug}`, "_blank")}
                >
                  <Eye className="h-4 w-4 mr-1" /> Preview
                </Button>
              )}
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar
              </Button>
            </div>
          </div>

          {/* Section editors */}
          <Tabs defaultValue="hero" className="w-full">
            <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 h-auto">
              <TabsTrigger value="hero" className="text-xs gap-1">
                <Image className="h-3.5 w-3.5" /> Hero
              </TabsTrigger>
              <TabsTrigger value="video" className="text-xs gap-1">
                <Play className="h-3.5 w-3.5" /> Vídeo
              </TabsTrigger>
              <TabsTrigger value="gallery" className="text-xs gap-1">
                <Image className="h-3.5 w-3.5" /> Galeria
              </TabsTrigger>
              <TabsTrigger value="testimonials" className="text-xs gap-1">
                <MessageCircle className="h-3.5 w-3.5" /> Depoimentos
              </TabsTrigger>
              <TabsTrigger value="offer" className="text-xs gap-1">
                <Tag className="h-3.5 w-3.5" /> Oferta
              </TabsTrigger>
              <TabsTrigger value="theme" className="text-xs gap-1">
                <Palette className="h-3.5 w-3.5" /> Tema
              </TabsTrigger>
            </TabsList>

            <Card className="mt-4">
              <CardContent className="pt-6">
                <TabsContent value="hero" className="mt-0">
                  <HeroEditor
                    data={lpData.hero}
                    companyId={companyId!}
                    onChange={(hero) => setLpData((prev) => ({ ...prev, hero }))}
                  />
                </TabsContent>

                <TabsContent value="video" className="mt-0">
                  <VideoEditor
                    data={lpData.video}
                    onChange={(video) => setLpData((prev) => ({ ...prev, video }))}
                  />
                </TabsContent>

                <TabsContent value="gallery" className="mt-0">
                  <GalleryEditor
                    data={lpData.gallery}
                    companyId={companyId!}
                    onChange={(gallery) => setLpData((prev) => ({ ...prev, gallery }))}
                  />
                </TabsContent>

                <TabsContent value="testimonials" className="mt-0">
                  <TestimonialsEditor
                    data={lpData.testimonials}
                    onChange={(testimonials) => setLpData((prev) => ({ ...prev, testimonials }))}
                  />
                </TabsContent>

                <TabsContent value="offer" className="mt-0">
                  <OfferEditor
                    data={lpData.offer}
                    onChange={(offer) => setLpData((prev) => ({ ...prev, offer }))}
                  />
                </TabsContent>

                <TabsContent value="theme" className="mt-0">
                  <ThemeEditor
                    data={lpData.theme}
                    onChange={(theme) => setLpData((prev) => ({ ...prev, theme }))}
                  />
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
          <AIGeneratorDialog
            open={aiDialogOpen}
            onOpenChange={setAiDialogOpen}
            companyId={companyId!}
            companyName={companyName}
            onGenerated={(data) => setLpData(data)}
          />
        </div>
      )}
    </HubLayout>
  );
}
