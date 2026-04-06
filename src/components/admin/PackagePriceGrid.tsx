import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Settings2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DEFAULT_DAY_TYPES, DEFAULT_GUEST_TIERS, type DayTypeConfig } from "@/lib/brazilian-holidays";

interface PriceTier {
  guest_count: number;
  day_type: string;
  price: number;
}

interface PackagePriceGridProps {
  packageId: string;
  companyId: string;
  settings: Record<string, unknown> | null;
}

function formatCurrency(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  return (num / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrency(formatted: string): number {
  if (!formatted.trim()) return 0;
  const cleaned = formatted.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function PackagePriceGrid({ packageId, companyId, settings }: PackagePriceGridProps) {
  const [tiers, setTiers] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dayTypes: DayTypeConfig[] = (settings?.day_type_config as DayTypeConfig[]) || DEFAULT_DAY_TYPES;
  const guestTiers: number[] = (settings?.guest_tiers as number[]) || DEFAULT_GUEST_TIERS;

  const key = (guest: number, day: string) => `${guest}_${day}`;

  useEffect(() => {
    if (!packageId) return;
    setLoading(true);
    supabase
      .from("package_price_tiers" as any)
      .select("guest_count, day_type, price")
      .eq("package_id", packageId)
      .then(({ data }) => {
        const map = new Map<string, string>();
        ((data || []) as unknown as PriceTier[]).forEach((t) => {
          if (t.price > 0) {
            map.set(key(t.guest_count, t.day_type), t.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
          }
        });
        setTiers(map);
        setLoading(false);
      });
  }, [packageId]);

  const handleChange = (guest: number, day: string, value: string) => {
    const formatted = formatCurrency(value);
    setTiers((prev) => {
      const next = new Map(prev);
      if (formatted) {
        next.set(key(guest, day), formatted);
      } else {
        next.delete(key(guest, day));
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);

    // Delete existing tiers
    await supabase
      .from("package_price_tiers" as any)
      .delete()
      .eq("package_id", packageId);

    // Build rows to insert
    const rows: Array<{ package_id: string; company_id: string; guest_count: number; day_type: string; price: number }> = [];
    tiers.forEach((val, k) => {
      const price = parseCurrency(val);
      if (price > 0) {
        const [guestStr, ...dayParts] = k.split("_");
        const guest_count = parseInt(guestStr, 10);
        const day_type = dayParts.join("_");
        rows.push({ package_id: packageId, company_id: companyId, guest_count, day_type, price });
      }
    });

    if (rows.length > 0) {
      await supabase.from("package_price_tiers" as any).insert(rows as any);
    }

    toast({ title: "Grade de preços salva!" });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Grade de Preços por Faixa</span>
      </div>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 px-1.5 text-muted-foreground font-medium whitespace-nowrap">Convidados</th>
              {dayTypes.map((dt) => (
                <th key={dt.key} className="text-center py-2 px-1.5 text-muted-foreground font-medium whitespace-nowrap">
                  {dt.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guestTiers.map((guest) => (
              <tr key={guest} className="border-t border-border/30">
                <td className="py-1.5 px-1.5 font-medium text-foreground whitespace-nowrap">{guest} pessoas</td>
                {dayTypes.map((dt) => (
                  <td key={dt.key} className="py-1.5 px-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                      <Input
                        className="h-8 text-xs pl-7 pr-2 w-[110px]"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={tiers.get(key(guest, dt.key)) || ""}
                        onChange={(e) => handleChange(guest, dt.key, e.target.value.replace("R$ ", ""))}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Salvar Grade
        </Button>
      </div>
    </div>
  );
}
