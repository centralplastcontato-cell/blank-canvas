import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Type, Save, X, LayoutTemplate, Move, ALargeSmall } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ── Types ──────────────────────────────────────────────── */

type TemplateId = "oferta" | "escassez" | "sazonal";
type PositionY = "top" | "center" | "bottom";

interface TextLayer {
  id: string;
  label: string;
  content: string;
  placeholder: string;
  fontSize: number;        // 0-100 slider → mapped to px range per layer
  fontFamily: string;
}

interface TemplateConfig {
  id: TemplateId;
  label: string;
  description: string;
  layers: TextLayer[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onSave: (finalUrl: string) => void;
  companyId: string;
}

/* ── Constants ──────────────────────────────────────────── */

const CANVAS_SIZE = 1080;
const DPR = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

const COLOR_PRESETS = [
  { value: "#FF3333", label: "Vermelho" },
  { value: "#FF6B00", label: "Laranja" },
  { value: "#FFD700", label: "Amarelo" },
  { value: "#00CC66", label: "Verde" },
  { value: "#3399FF", label: "Azul" },
  { value: "#9B59B6", label: "Roxo" },
  { value: "#FF69B4", label: "Rosa" },
];

const FONT_OPTIONS = [
  { value: "Montserrat", label: "Montserrat" },
  { value: "Arial Black", label: "Arial Black" },
  { value: "Georgia", label: "Georgia" },
  { value: "Impact", label: "Impact" },
  { value: "Courier New", label: "Courier New" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
  { value: "Verdana", label: "Verdana" },
];

const POSITION_OPTIONS: { value: PositionY; label: string }[] = [
  { value: "top", label: "Topo" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Base" },
];

// Font size ranges per layer type (min, max px at CANVAS_SIZE)
const FONT_RANGES: Record<string, [number, number]> = {
  title: [40, 140],
  subtitle: [28, 80],
  cta: [24, 60],
};

function layerFontPx(layerId: string, sliderVal: number): number {
  const [min, max] = FONT_RANGES[layerId] ?? [28, 80];
  return Math.round(min + (sliderVal / 100) * (max - min));
}

const defaultLayer = (id: string, label: string, placeholder: string, defaultSize = 50): TextLayer => ({
  id, label, content: "", placeholder, fontSize: defaultSize, fontFamily: "Montserrat",
});

const TEMPLATES: TemplateConfig[] = [
  {
    id: "oferta",
    label: "Oferta Forte",
    description: "Gradiente + CTA botão",
    layers: [
      defaultLayer("title", "Título", "PROMOÇÃO ESPECIAL", 55),
      defaultLayer("subtitle", "Subtítulo", "Até 20% OFF em todos os pacotes", 50),
      defaultLayer("cta", "Botão CTA", "GARANTA SUA VAGA", 50),
    ],
  },
  {
    id: "escassez",
    label: "Escassez",
    description: "Card central + validade",
    layers: [
      defaultLayer("title", "Título", "ÚLTIMAS VAGAS", 55),
      defaultLayer("subtitle", "Subtítulo", "Apenas 3 datas disponíveis em Abril", 50),
      defaultLayer("cta", "Validade", "Válido até 30/04", 50),
    ],
  },
  {
    id: "sazonal",
    label: "Sazonal",
    description: "Título topo + botão inferior",
    layers: [
      defaultLayer("title", "Título", "FÉRIAS DE JULHO", 55),
      defaultLayer("subtitle", "Subtítulo", "Diversão garantida para toda família", 50),
      defaultLayer("cta", "Botão CTA", "RESERVE AGORA", 50),
    ],
  },
];

/* ── Helpers ─────────────────────────────────────────────── */

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTextWithShadow(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  color: string, strokeColor = "rgba(0,0,0,0.6)", strokeWidth = 2
) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.strokeText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawCTAButton(
  ctx: CanvasRenderingContext2D, text: string, centerX: number, centerY: number,
  bgColor: string, textColor: string, fontSize: number, fontFamily: string
) {
  const font = `bold ${fontSize}px ${fontFamily}, sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const paddingH = 40;
  const paddingV = 22;
  const btnW = metrics.width + paddingH * 2;
  const btnH = fontSize + paddingV * 2;
  const btnX = centerX - btnW / 2;
  const btnY = centerY - btnH / 2;
  const radius = 18;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = bgColor;
  drawRoundedRect(ctx, btnX, btnY, btnW, btnH, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = textColor;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, centerX, centerY + 2);
}

function drawGradientOverlay(ctx: CanvasRenderingContext2D, size: number, position: "top" | "bottom" | "both") {
  if (position === "top" || position === "both") {
    const grad = ctx.createLinearGradient(0, 0, 0, size * 0.45);
    grad.addColorStop(0, "rgba(0,0,0,0.75)");
    grad.addColorStop(0.6, "rgba(0,0,0,0.25)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size * 0.45);
  }
  if (position === "bottom" || position === "both") {
    const grad = ctx.createLinearGradient(0, size * 0.55, 0, size);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.4, "rgba(0,0,0,0.25)");
    grad.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, size * 0.55, size, size * 0.45);
  }
}

/* ── Y position map ──────────────────────────────────────── */

const POS_MAP: Record<PositionY, { title: number; subtitle: number; cta: number }> = {
  top:    { title: 0.15, subtitle: 0.26, cta: 0.40 },
  center: { title: 0.38, subtitle: 0.50, cta: 0.64 },
  bottom: { title: 0.60, subtitle: 0.72, cta: 0.86 },
};

/* ── Render functions per template ───────────────────────── */

function renderOferta(ctx: CanvasRenderingContext2D, size: number, layers: TextLayer[], accentColor: string, posY: PositionY) {
  const title = layers.find((l) => l.id === "title")!;
  const subtitle = layers.find((l) => l.id === "subtitle")!;
  const cta = layers.find((l) => l.id === "cta")!;
  const pos = POS_MAP[posY];

  drawGradientOverlay(ctx, size, "both");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (title.content.trim()) {
    const px = layerFontPx("title", title.fontSize);
    ctx.font = `bold ${px}px ${title.fontFamily}, sans-serif`;
    drawTextWithShadow(ctx, title.content.trim().toUpperCase(), size / 2, size * pos.title, "#FFFFFF");
  }
  if (subtitle.content.trim()) {
    const px = layerFontPx("subtitle", subtitle.fontSize);
    ctx.font = `600 ${px}px ${subtitle.fontFamily}, sans-serif`;
    drawTextWithShadow(ctx, subtitle.content.trim(), size / 2, size * pos.subtitle, "rgba(255,255,255,0.9)", "rgba(0,0,0,0.4)", 1);
  }
  if (cta.content.trim()) {
    const px = layerFontPx("cta", cta.fontSize);
    drawCTAButton(ctx, cta.content.trim().toUpperCase(), size / 2, size * pos.cta, accentColor, "#FFFFFF", px, cta.fontFamily);
  }
}

function renderEscassez(ctx: CanvasRenderingContext2D, size: number, layers: TextLayer[], accentColor: string, _posY: PositionY) {
  const title = layers.find((l) => l.id === "title")!;
  const subtitle = layers.find((l) => l.id === "subtitle")!;
  const cta = layers.find((l) => l.id === "cta")!;

  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(0, 0, size, size);

  const cardW = size * 0.78;
  const cardH = size * 0.48;
  const cardX = (size - cardW) / 2;
  const cardY = (size - cardH) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 20);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = accentColor;
  drawRoundedRect(ctx, cardX, cardY, cardW, 6, 20);
  ctx.fill();
  ctx.fillRect(cardX + 20, cardY, cardW - 40, 6);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (title.content.trim()) {
    const px = layerFontPx("title", title.fontSize);
    ctx.font = `bold ${px}px ${title.fontFamily}, sans-serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(title.content.trim().toUpperCase(), size / 2, cardY + cardH * 0.32);
  }
  if (subtitle.content.trim()) {
    const px = layerFontPx("subtitle", subtitle.fontSize);
    ctx.font = `500 ${px}px ${subtitle.fontFamily}, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(subtitle.content.trim(), size / 2, cardY + cardH * 0.55);
  }
  if (cta.content.trim()) {
    const px = layerFontPx("cta", cta.fontSize);
    ctx.font = `bold ${px}px ${cta.fontFamily}, sans-serif`;
    ctx.fillStyle = accentColor;
    ctx.fillText(cta.content.trim(), size / 2, cardY + cardH * 0.78);
  }
}

function renderSazonal(ctx: CanvasRenderingContext2D, size: number, layers: TextLayer[], accentColor: string, posY: PositionY) {
  const title = layers.find((l) => l.id === "title")!;
  const subtitle = layers.find((l) => l.id === "subtitle")!;
  const cta = layers.find((l) => l.id === "cta")!;
  const pos = POS_MAP[posY];

  drawGradientOverlay(ctx, size, "both");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (title.content.trim()) {
    const px = layerFontPx("title", title.fontSize);
    ctx.font = `bold ${px}px ${title.fontFamily}, sans-serif`;
    drawTextWithShadow(ctx, title.content.trim().toUpperCase(), size / 2, size * pos.title, "#FFFFFF");
  }
  if (subtitle.content.trim()) {
    const px = layerFontPx("subtitle", subtitle.fontSize);
    ctx.font = `500 ${px}px ${subtitle.fontFamily}, sans-serif`;
    drawTextWithShadow(ctx, subtitle.content.trim(), size / 2, size * pos.subtitle, "rgba(255,255,255,0.88)", "rgba(0,0,0,0.3)", 1);
  }
  if (cta.content.trim()) {
    const px = layerFontPx("cta", cta.fontSize);
    drawCTAButton(ctx, cta.content.trim().toUpperCase(), size / 2, size * pos.cta, accentColor, "#FFFFFF", px, cta.fontFamily);
  }
}

type RenderFn = (ctx: CanvasRenderingContext2D, size: number, layers: TextLayer[], accent: string, posY: PositionY) => void;
const RENDER_MAP: Record<TemplateId, RenderFn> = {
  oferta: renderOferta,
  escassez: renderEscassez,
  sazonal: renderSazonal,
};

/* ── Component ───────────────────────────────────────────── */

export function CampaignTextOverlayEditor({ open, onOpenChange, imageUrl, onSave, companyId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [template, setTemplate] = useState<TemplateId>("oferta");
  const [layers, setLayers] = useState<TextLayer[]>(TEMPLATES[0].layers.map((l) => ({ ...l })));
  const [accentColor, setAccentColor] = useState(COLOR_PRESETS[0].value);
  const [positionY, setPositionY] = useState<PositionY>("top");
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load base image
  useEffect(() => {
    if (!open || !imageUrl) return;
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; setImageLoaded(true); };
    img.onerror = () => toast.error("Erro ao carregar imagem base");
    img.src = imageUrl;
  }, [open, imageUrl]);

  // Load fonts
  useEffect(() => {
    if (!open) return;
    const weights = [
      { weight: "500", url: "https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCu173w5aXo.woff2" },
      { weight: "600", url: "https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM73w5aXo.woff2" },
      { weight: "700", url: "https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXo.woff2" },
    ];
    Promise.all(weights.map((w) => {
      const f = new FontFace("Montserrat", `url(${w.url})`, { weight: w.weight });
      return f.load().then((loaded) => document.fonts.add(loaded));
    })).catch(() => {});
  }, [open]);

  const switchTemplate = (id: TemplateId) => {
    setTemplate(id);
    const tpl = TEMPLATES.find((t) => t.id === id)!;
    setLayers(tpl.layers.map((l) => ({ ...l })));
  };

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = CANVAS_SIZE;
    canvas.width = size * DPR;
    canvas.height = size * DPR;
    canvas.style.width = "";
    canvas.style.height = "";
    ctx.scale(DPR, DPR);

    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

    RENDER_MAP[template](ctx, size, layers, accentColor, positionY);
  }, [layers, imageLoaded, template, accentColor, positionY]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

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
      toast.success("Arte profissional salva! 🎨");
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
      <DialogContent className="max-w-[90vw] md:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" />
            Editor de Arte Profissional
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Canvas preview */}
          <div className="flex-1 min-w-0">
            <div className="rounded-xl border overflow-hidden bg-muted/20">
              <canvas ref={canvasRef} className="w-full h-auto block" />
            </div>
          </div>

          {/* Controls sidebar */}
          <div className="md:w-80 shrink-0 space-y-4 overflow-y-auto md:max-h-[65vh] pr-1">
            {/* Template selector */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5" /> Template
              </p>
              <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => switchTemplate(tpl.id)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      template === tpl.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border/60 bg-muted/10 hover:border-primary/40"
                    }`}
                  >
                    <span className="text-[11px] font-bold block">{tpl.label}</span>
                    <span className="text-[10px] text-muted-foreground">{tpl.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5" /> Posição do texto
              </p>
              <div className="flex gap-1.5">
                {POSITION_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPositionY(p.value)}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-all ${
                      positionY === p.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent color */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Cor de destaque</p>
              <div className="flex gap-1.5 flex-wrap justify-start">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      accentColor === c.value ? "scale-125 border-primary ring-2 ring-primary/30" : "border-border/50 hover:scale-110"
                    }`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setAccentColor(c.value)}
                  />
                ))}
              </div>
            </div>

            {/* Text inputs with font controls */}
            <div className="space-y-4">
              {layers.map((layer) => (
                <div key={layer.id} className="space-y-2 p-3 rounded-xl border border-border/40 bg-muted/5">
                  <Badge variant="outline" className="text-[10px]">{layer.label}</Badge>
                  <Input
                    placeholder={layer.placeholder}
                    value={layer.content}
                    onChange={(e) => updateLayer(layer.id, { content: e.target.value })}
                    className="h-9 text-sm"
                  />

                  {/* Font family */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground shrink-0 w-10">Fonte</span>
                    <Select
                      value={layer.fontFamily}
                      onValueChange={(v) => updateLayer(layer.id, { fontFamily: v })}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value} className="text-xs">
                            <span style={{ fontFamily: f.value }}>{f.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Font size slider */}
                  <div className="flex items-center gap-2">
                    <ALargeSmall className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <Slider
                      value={[layer.fontSize]}
                      onValueChange={([v]) => updateLayer(layer.id, { fontSize: v })}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-[10px] text-muted-foreground w-8 text-right">
                      {layerFontPx(layer.id, layer.fontSize)}px
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSaveWithoutText} disabled={saving} className="gap-1.5">
            <X className="w-3.5 h-3.5" />
            Salvar sem texto
          </Button>
          <Button onClick={handleSaveWithText} disabled={saving || !hasAnyText} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar arte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
