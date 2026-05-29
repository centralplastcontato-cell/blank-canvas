import { useRef, useState } from "react";
import { Image as ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { normalizeImageOrientation } from "@/lib/image-orientation";

interface FollowUpImageUploaderProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  companyId: string | null | undefined;
  followUpNumber: 1 | 2 | 3 | 4;
  disabled?: boolean;
}

export function FollowUpImageUploader({
  value,
  onChange,
  companyId,
  followUpNumber,
  disabled,
}: FollowUpImageUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!companyId) {
      toast({ title: "Aguarde", description: "Carregando dados da empresa…", variant: "destructive" });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Formato inválido", description: "Use JPG, PNG ou WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máx. 10MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const normalized = await normalizeImageOrientation(file);
      const ext = (normalized.name.split(".").pop() || "jpg").toLowerCase();
      const fileName = `${companyId}/followups/fu${followUpNumber}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("sales-materials")
        .upload(fileName, normalized, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("sales-materials").getPublicUrl(fileName);
      onChange(urlData.publicUrl);
      toast({ title: "Imagem adicionada", description: `Será enviada junto com o ${followUpNumber}º Follow-up.` });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message || String(err), variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        Imagem (opcional)
      </Label>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {value ? (
        <div className="flex items-start gap-3 p-3 border rounded-xl bg-muted/30">
          <img
            src={value}
            alt={`Imagem do ${followUpNumber}º Follow-up`}
            className="w-20 h-20 object-cover rounded-lg border bg-white"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-2">
              Esta imagem será enviada junto com a mensagem (como legenda).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || uploading}
              >
                {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                Trocar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onChange(null)}
                disabled={disabled || uploading}
              >
                <X className="w-3 h-3 mr-1" />
                Remover
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="rounded-xl"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Adicionar imagem
            </>
          )}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Opcional. Se deixar vazio, o follow-up será enviado apenas como texto. JPG/PNG/WebP até 10MB.
      </p>
    </div>
  );
}
