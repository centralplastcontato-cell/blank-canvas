import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Palette, Check, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PRESET_COLORS = [
  "#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
];

export function UnitColorManager() {
  const { units, refetch } = useCompanyUnits();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localColors, setLocalColors] = useState<Record<string, string>>({});

  const getColor = (unit: typeof units[0]) =>
    localColors[unit.id] ?? unit.color ?? "#3b82f6";

  const handleColorChange = (unitId: string, color: string) => {
    setLocalColors((prev) => ({ ...prev, [unitId]: color }));
  };

  const saveColor = async (unitId: string) => {
    const color = localColors[unitId];
    if (!color) return;

    setSavingId(unitId);
    const { error } = await supabase
      .from("company_units")
      .update({ color })
      .eq("id", unitId);

    if (error) {
      toast({ title: "Erro ao salvar cor", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cor atualizada" });
      refetch();
      setLocalColors((prev) => {
        const next = { ...prev };
        delete next[unitId];
        return next;
      });
    }
    setSavingId(null);
  };

  if (units.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Cores das Unidades
        </CardTitle>
        <CardDescription>
          Personalize a cor de identificação de cada unidade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {units.map((unit) => {
          const currentColor = getColor(unit);
          const hasChange = localColors[unit.id] !== undefined;

          return (
            <div key={unit.id} className="flex items-center gap-3">
              {/* Color preview */}
              <div
                className="w-8 h-8 rounded-lg border border-border shrink-0 shadow-sm"
                style={{ backgroundColor: currentColor }}
              />

              {/* Unit name */}
              <Label className="min-w-[100px] font-medium">{unit.name}</Label>

              {/* Preset colors */}
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColorChange(unit.id, c)}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                    style={{
                      backgroundColor: c,
                      borderColor: currentColor === c ? "hsl(var(--foreground))" : "transparent",
                    }}
                  >
                    {currentColor === c && (
                      <Check className="w-3 h-3 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>

              {/* Custom color input */}
              <Input
                type="color"
                value={currentColor}
                onChange={(e) => handleColorChange(unit.id, e.target.value)}
                className="w-9 h-9 p-0.5 cursor-pointer border-border"
              />

              {/* Save button */}
              {hasChange && (
                <Button
                  size="sm"
                  onClick={() => saveColor(unit.id)}
                  disabled={savingId === unit.id}
                >
                  {savingId === unit.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
