import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Type, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TextLayer {
  id: string;
  label: string;
  content: string;
  position: "top" | "center" | "bottom";
  color: string;
  fontSize: "sm" | "md" | "lg";
  bold: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onSave: (finalUrl: string) => void;
  companyId: string;
}

const COLOR_PRESETS = [
  { value: "#FFFFFF", label: "Branco" },
  { value: "#FFD700", label: "Amarelo" },
  { value: "#FF3333", label: "Vermelho" },
  { value: "#00CC66", label: "Verde" },
  { value: "#3399FF", label: "Azul" },
  { value: "#FF69B4", label: "Rosa" },
  { value: "#000000", label: "Preto" },
];

const FONT_SIZES: Record<string, number> = { sm: 40, md: 56, lg: 72 };
const POSITION_Y: Record<string, number> = { top: 0.15, center: 0.50, bottom: 0.85 };

const DEFAULT_LAYERS: TextLayer[] = [
  { id: "title", label: "Título", content: "", position: "top", color: "#FFFFFF", fontSize: "lg", bold: true },
  { id: "subtitle", label: "Subtítulo", content: "", position: "center", color: "#FFD700", fontSize: "md", bold: false },
  { id: "cta", label: "CTA", content: "", position: "bottom", color: "#FFFFFF", fontSize: "md", bold: true },
];

const CANVAS_SIZE = 1080;

export function CampaignTextOverlayEditor({ open, onOpenChange, imageUrl, onSave, companyId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layers, setLayers] = useState<TextLayer[]>(DEFAULT_LAYERS.map((l) => ({ ...l })));
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load base image
  useEffect(() => {
    if (!open || !imageUrl) return;
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      toast.error("Erro ao carregar imagem base");
    };
    img.src = imageUrl;
  }, [open, imageUrl]);

  // Load Montserrat font
  useEffect(() => {
    if (!open) return;
    const font = new FontFace("Montserrat", "url(https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXo.woff2)");
    font.load().then((loaded) => {
      document.fonts.add(loaded);
    }).catch(() => {
      // Fallback to Impact
    });
  }, [open]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // Draw base image (cover)
    const scale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (CANVAS_SIZE - w) / 2, (CANVAS_SIZE - h) / 2, w, h);

    // Draw text layers
    layers.forEach((layer) => {
      if (!layer.content.trim()) return;

      const fontSize = FONT_SIZES[layer.fontSize];
      const y = CANVAS_SIZE * POSITION_Y[layer.position];
      const fontFamily = `${layer.bold ? "bold " : ""}${fontSize}px Montserrat, "Impact", "Arial Black", sans-serif`;

      ctx.font = fontFamily;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Measure text for background
      const metrics = ctx.measureText(layer.content);
      const textWidth = metrics.width;
      const bandHeight = fontSize * 1.6;

      // Semi-transparent background band
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, y - bandHeight / 2, CANVAS_SIZE, bandHeight);

      // Text outline for readability
      ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
      ctx.lineWidth = 3;
      ctx.strokeText(layer.content, CANVAS_SIZE / 2, y);

      // Text fill
      ctx.fillStyle = layer.color;
      ctx.fillText(layer.content, CANVAS_SIZE / 2, y);
    });
  }, [layers, imageLoaded]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const updateLayer = (id: string, updates: Partial<TextLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const handleSaveWithText = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Erro ao exportar canvas");

      const path = `campaigns/text-overlay-${Date.now()}.png`;
      const { error } = await supabase.storage.from("sales-materials").upload(path, blob, { contentType: "image/png" });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("sales-materials").getPublicUrl(path);
      onSave(urlData.publicUrl);
      onOpenChange(false);
      toast.success("Arte com texto salva! 🎨");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWithoutText = () => {
    onSave(imageUrl);
    onOpenChange(false);
  };

  const hasAnyText = layers.some((l) => l.content.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" />
            Adicionar Texto à Arte
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Canvas preview */}
          <div className="rounded-xl border overflow-hidden bg-muted/20">
            <canvas
              ref={canvasRef}
              className="w-full h-auto"
              style={{ maxHeight: 400, objectFit: "contain" }}
            />
          </div>

          {/* Text layer editors */}
          <div className="space-y-3">
            {layers.map((layer) => (
              <div key={layer.id} className="space-y-2 p-3 rounded-lg border bg-muted/10">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{layer.label}</Badge>
                </div>

                <Input
                  placeholder={`Digite o ${layer.label.toLowerCase()}...`}
                  value={layer.content}
                  onChange={(e) => updateLayer(layer.id, { content: e.target.value })}
                  className="h-9 text-sm"
                />

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Position */}
                  <Select
                    value={layer.position}
                    onValueChange={(v) => updateLayer(layer.id, { position: v as TextLayer["position"] })}
                  >
                    <SelectTrigger className="h-7 w-24 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top">Topo</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="bottom">Rodapé</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Font size */}
                  <Select
                    value={layer.fontSize}
                    onValueChange={(v) => updateLayer(layer.id, { fontSize: v as TextLayer["fontSize"] })}
                  >
                    <SelectTrigger className="h-7 w-16 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">P</SelectItem>
                      <SelectItem value="md">M</SelectItem>
                      <SelectItem value="lg">G</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Bold toggle */}
                  <button
                    type="button"
                    className={`h-7 w-7 rounded border text-[11px] font-bold transition-colors ${
                      layer.bold ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 border-border"
                    }`}
                    onClick={() => updateLayer(layer.id, { bold: !layer.bold })}
                  >
                    B
                  </button>

                  {/* Color presets */}
                  <div className="flex gap-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.label}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${
                          layer.color === c.value ? "scale-125 border-primary" : "border-border/60 hover:scale-110"
                        }`}
                        style={{ backgroundColor: c.value }}
                        onClick={() => updateLayer(layer.id, { color: c.value })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSaveWithoutText} disabled={saving} className="gap-1.5">
            <X className="w-3.5 h-3.5" />
            Salvar sem texto
          </Button>
          <Button onClick={handleSaveWithText} disabled={saving || !hasAnyText} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar com texto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
