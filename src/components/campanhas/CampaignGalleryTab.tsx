import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Loader2, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GalleryImage {
  id: string;
  image_url: string;
  source: string;
  campaign_name: string | null;
  created_at: string;
}

const sourceConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ai_compose: { label: "IA", variant: "default" },
  upload: { label: "Upload", variant: "secondary" },
  logo: { label: "Logo", variant: "outline" },
};

export function CampaignGalleryTab({ companyId }: { companyId: string }) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("campaign_images")
        .select("id, image_url, source, campaign_name, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      setImages((data as GalleryImage[]) || []);
      setLoading(false);
    };
    load();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ImageIcon className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground font-medium">Nenhuma imagem gerada</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Crie campanhas com imagem para vê-las aqui</p>
      </div>
    );
  }

  const allUrls = images.map((i) => i.image_url);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((img, idx) => {
          const sc = sourceConfig[img.source] || sourceConfig.upload;
          return (
            <div
              key={img.id}
              className="group relative rounded-xl overflow-hidden border border-border bg-card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLightboxIndex(idx)}
            >
              <div className="aspect-square">
                <img
                  src={img.image_url}
                  alt={img.campaign_name || "Imagem"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <div className="w-full p-2.5 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-white text-xs font-semibold truncate">{img.campaign_name || "Sem título"}</p>
                </div>
              </div>
              {/* Badge */}
              <div className="absolute top-2 right-2">
                <Badge variant={sc.variant} className="text-[9px] px-1.5 py-0.5">
                  {sc.label}
                </Badge>
              </div>
              {/* Date footer */}
              <div className="px-2.5 py-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(img.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={allUrls}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
