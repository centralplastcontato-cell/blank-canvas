import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Palette, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

interface AppearanceSettings {
  brand_color: string;
  accent_color: string;
}

const DEFAULTS: AppearanceSettings = {
  brand_color: "#3b82f6",
  accent_color: "#f97316",
};

const PRESETS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
];

export function PartnerAppearanceCard() {
  const { currentCompany, refreshCompanies } = useCompany();
  const [settings, setSettings] = useState<AppearanceSettings>(DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (currentCompany?.settings) {
      const s = currentCompany.settings as Record<string, unknown>;
      const app = s.partner_appearance as AppearanceSettings | undefined;
      if (app) setSettings({ ...DEFAULTS, ...app });
    }
  }, [currentCompany]);

  const updateColor = (key: keyof AppearanceSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!currentCompany) return;
    setIsSaving(true);
    try {
      const currentSettings = (currentCompany.settings || {}) as Record<string, unknown>;
      const newSettings = JSON.parse(JSON.stringify({ ...currentSettings, partner_appearance: settings }));
      const { error } = await supabase
        .from("companies")
        .update({ settings: newSettings })
        .eq("id", currentCompany.id);
      if (error) throw error;
      await refreshCompanies();
      setHasChanges(false);
      toast.success("Aparência atualizada!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <Palette className="h-5 w-5 text-emerald-500" />
        </div>
        <CardTitle className="text-base">Aparência</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Brand Color */}
        <div>
          <Label className="text-xs text-muted-foreground">Cor Principal</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex gap-1.5 flex-wrap">
              {PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateColor("brand_color", color)}
                  className="h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: color,
                    borderColor: settings.brand_color === color ? "hsl(var(--foreground))" : "transparent",
                  }}
                >
                  {settings.brand_color === color && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
            <Input
              type="color"
              value={settings.brand_color}
              onChange={(e) => updateColor("brand_color", e.target.value)}
              className="h-7 w-10 p-0.5 cursor-pointer"
            />
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <Label className="text-xs text-muted-foreground">Cor de Destaque</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex gap-1.5 flex-wrap">
              {PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateColor("accent_color", color)}
                  className="h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: color,
                    borderColor: settings.accent_color === color ? "hsl(var(--foreground))" : "transparent",
                  }}
                >
                  {settings.accent_color === color && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
            <Input
              type="color"
              value={settings.accent_color}
              onChange={(e) => updateColor("accent_color", e.target.value)}
              className="h-7 w-10 p-0.5 cursor-pointer"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg border p-3 space-y-2">
          <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md" style={{ backgroundColor: settings.brand_color }} />
            <div className="h-8 w-8 rounded-md" style={{ backgroundColor: settings.accent_color }} />
            <div className="flex-1 h-3 rounded-full" style={{ backgroundColor: settings.brand_color, opacity: 0.2 }}>
              <div className="h-3 w-2/3 rounded-full" style={{ backgroundColor: settings.brand_color }} />
            </div>
          </div>
        </div>

        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
            Salvar Aparência
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
