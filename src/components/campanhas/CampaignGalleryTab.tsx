import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Loader2, ImageIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [deleteTarget, setDeleteTarget] = useState<GalleryImage | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await (supabase as any)
      .from("campaign_images")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error("Erro ao apagar imagem");
    } else {
      setImages((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success("Imagem apagada");
    }
    setDeleteTarget(null);
  };

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
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <Badge variant={sc.variant} className="text-[9px] px-1.5 py-0.5">
                  {sc.label}
                </Badge>
              </div>
              {/* Delete button */}
              <button
                className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-lg hover:scale-110 active:scale-95"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(img);
                }}
                title="Apagar imagem"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar imagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A imagem será removida permanentemente da galeria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
