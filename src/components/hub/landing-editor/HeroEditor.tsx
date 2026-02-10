import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LPHero } from "@/types/landing-page";
import { toast } from "sonner";

interface HeroEditorProps {
  data: LPHero;
  companyId: string;
  onChange: (data: LPHero) => void;
}

export function HeroEditor({ data, companyId, onChange }: HeroEditorProps) {
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop();
    const path = `${companyId}/hero-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("landing-pages")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Erro ao enviar imagem");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("landing-pages")
      .getPublicUrl(path);

    onChange({ ...data, background_image_url: urlData.publicUrl });
    toast.success("Imagem enviada!");
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Título principal</Label>
        <Input
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Ex: O melhor buffet infantil da região"
        />
      </div>

      <div>
        <Label>Subtítulo</Label>
        <Textarea
          value={data.subtitle}
          onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
          placeholder="Ex: Festas inesquecíveis para seu filho"
          rows={2}
        />
      </div>

      <div>
        <Label>Texto do botão CTA</Label>
        <Input
          value={data.cta_text}
          onChange={(e) => onChange({ ...data, cta_text: e.target.value })}
          placeholder="Ex: Quero fazer minha festa!"
        />
      </div>

      <div>
        <Label>Imagem de fundo</Label>
        {data.background_image_url ? (
          <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
            <img
              src={data.background_image_url}
              alt="Hero background"
              className="w-full h-40 object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={() => onChange({ ...data, background_image_url: null })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="mt-2 flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Clique para enviar</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        )}
      </div>
    </div>
  );
}
