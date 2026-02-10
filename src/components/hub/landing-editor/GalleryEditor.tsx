import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Upload, X, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LPGallery } from "@/types/landing-page";
import { toast } from "sonner";

interface GalleryEditorProps {
  data: LPGallery;
  companyId: string;
  onChange: (data: LPGallery) => void;
}

export function GalleryEditor({ data, companyId, onChange }: GalleryEditorProps) {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = [...data.photos];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${companyId}/gallery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

      const { error } = await supabase.storage
        .from("landing-pages")
        .upload(path, file);

      if (error) {
        toast.error(`Erro ao enviar ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("landing-pages")
        .getPublicUrl(path);

      newPhotos.push(urlData.publicUrl);
    }

    onChange({ ...data, photos: newPhotos });
    toast.success("Fotos enviadas!");
  };

  const removePhoto = (index: number) => {
    onChange({ ...data, photos: data.photos.filter((_, i) => i !== index) });
  };

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
        <Label>Título da seção</Label>
        <Input
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Ex: Galeria de Fotos"
        />
      </div>

      <div>
        <Label>Fotos ({data.photos.length})</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {data.photos.map((photo, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
              <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-24 object-cover" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removePhoto(i)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="h-5 w-5 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">Adicionar</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>
    </div>
  );
}
