import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw, Pencil, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import type { CampaignDraft } from "./CampaignWizard";

interface Props {
  draft: CampaignDraft;
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
  companyName: string;
}

const TONE_LABELS: Record<string, string> = {
  profissional: "🏢 Profissional",
  "amigável": "😊 Amigável",
  urgente: "⏰ Urgente",
  curta: "⚡ Curta",
  detalhada: "📝 Detalhada",
};

export function CampaignContextStep({ draft, setDraft, companyName }: Props) {
  const [generating, setGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleGenerate = async () => {
    if (!draft.description.trim()) {
      toast.error("Descreva o objetivo da campanha");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("campaign-ai", {
        body: { context: draft.description, companyName },
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
          Nome da campanha
        </Label>
        <Input
          placeholder="Ex: Promoção Abril 2026"
          value={draft.name}
          onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
          className="h-10"
        />
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
          <div className="relative inline-block">
            <img src={draft.imageUrl} alt="Campaign" className="h-20 rounded-lg border object-cover shadow-sm" />
            <button
              onClick={() => setDraft((prev) => ({ ...prev, imageUrl: null }))}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
            >
              <X className="w-3 h-3" />
            </button>
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
      </div>
    </div>
  );
}
