import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Thermometer, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

interface WapiInstanceRow {
  id: string;
  unit: string | null;
  phone_number: string | null;
  status: string | null;
  warmup_enabled: boolean;
  warmup_started_at: string | null;
  warmup_days_total: number;
  warmup_reason: string | null;
  warmup_curve_per_hour: number[];
  queue_max_per_hour: number;
}

function curveLabel(curve: number[]): string {
  return curve.map((n, i) => `D${i + 1}: ${n}/h`).join(" • ");
}

function currentDay(startedAt: string | null): number {
  if (!startedAt) return 0;
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / (24 * 60 * 60_000)) + 1;
}

export function WarmupManagerDialog({ companyId: propCompanyId }: { companyId?: string } = {}) {
  const { currentCompany } = useCompany();
  const [open, setOpen] = useState(false);
  const [instances, setInstances] = useState<WapiInstanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<Record<string, string>>({});

  const resolvedCompanyId = propCompanyId ?? currentCompany?.id;

  const load = async () => {
    if (!resolvedCompanyId) return;
    setLoading(true);
    const { data } = await supabase
      .from("wapi_instances")
      .select("id, unit, phone_number, status, warmup_enabled, warmup_started_at, warmup_days_total, warmup_reason, warmup_curve_per_hour, queue_max_per_hour")
      .eq("company_id", resolvedCompanyId)
      .order("unit");
    setInstances((data ?? []) as WapiInstanceRow[]);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, resolvedCompanyId]);

  const toggleWarmup = async (inst: WapiInstanceRow, enabled: boolean) => {
    const update: Record<string, unknown> = { warmup_enabled: enabled };
    if (enabled) {
      update.warmup_started_at = new Date().toISOString();
      update.warmup_reason = reason[inst.id] || inst.warmup_reason || "Reativação manual";
    } else {
      update.warmup_started_at = null;
    }
    const { error } = await supabase.from("wapi_instances").update(update).eq("id", inst.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: enabled ? "🔥 Aquecimento iniciado" : "Aquecimento desligado",
        description: enabled
          ? `${inst.unit}: começa em ${inst.warmup_curve_per_hour[0]} msg/h hoje, subindo até voltar ao normal em ${inst.warmup_days_total} dias.`
          : `${inst.unit}: limites voltaram ao normal (${inst.queue_max_per_hour}/h).`,
      });
      load();
    }
  };

  const updateDays = async (inst: WapiInstanceRow, days: number) => {
    if (days < 1 || days > 30) return;
    await supabase.from("wapi_instances").update({ warmup_days_total: days }).eq("id", inst.id);
    load();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100">
          <Flame className="w-4 h-4" />
          <span className="hidden sm:inline">Aquecimento</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-600" />
            Modo aquecimento de instâncias
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Ative o aquecimento depois de um bloqueio temporário, ban ou reconexão de número novo. Os envios automáticos
            ficam com cap reduzido por dia, subindo aos poucos até voltar ao volume normal. Ações manuais não são afetadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {loading && <p className="text-sm text-muted-foreground text-center py-6">Carregando…</p>}
          {!loading && instances.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma instância encontrada.</p>
          )}
          {instances.map((inst) => {
            const day = inst.warmup_enabled ? currentDay(inst.warmup_started_at) : 0;
            const finished = inst.warmup_enabled && day > inst.warmup_days_total;
            const todayCap = inst.warmup_enabled && !finished
              ? inst.warmup_curve_per_hour[Math.min(day - 1, inst.warmup_curve_per_hour.length - 1)] ?? inst.queue_max_per_hour
              : inst.queue_max_per_hour;

            return (
              <div key={inst.id} className="border rounded-xl p-4 space-y-3 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{inst.unit || "Instância"}</span>
                      <Badge variant="outline" className="text-xs">{inst.phone_number || "—"}</Badge>
                      {inst.warmup_enabled ? (
                        finished ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Aquecimento concluído</Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200 gap-1">
                            <Flame className="w-3 h-3" />
                            Dia {day} / {inst.warmup_days_total}
                          </Badge>
                        )
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Thermometer className="w-3 h-3" />
                          Normal
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Limite efetivo hoje: <b className="text-foreground">{todayCap} msg/h</b>
                      {inst.warmup_enabled && !finished && <span> • Curva: {curveLabel(inst.warmup_curve_per_hour)}</span>}
                    </p>
                    {inst.warmup_reason && inst.warmup_enabled && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">Motivo: {inst.warmup_reason}</p>
                    )}
                  </div>
                  <Switch checked={inst.warmup_enabled} onCheckedChange={(v) => toggleWarmup(inst, v)} />
                </div>

                {!inst.warmup_enabled && (
                  <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end pt-1">
                    <div>
                      <Label className="text-xs">Motivo (opcional)</Label>
                      <Input
                        placeholder="Ex: bloqueio temporário, número novo, reconexão após ban…"
                        value={reason[inst.id] ?? ""}
                        onChange={(e) => setReason({ ...reason, [inst.id]: e.target.value })}
                        className="bg-white h-9 text-sm"
                      />
                    </div>
                    <Button size="sm" className="gap-2 bg-orange-600 hover:bg-orange-700 h-9" onClick={() => toggleWarmup(inst, true)}>
                      <Flame className="w-3.5 h-3.5" /> Iniciar
                    </Button>
                  </div>
                )}

                {inst.warmup_enabled && !finished && (
                  <div className="flex items-center gap-2 pt-1">
                    <Label className="text-xs">Duração (dias)</Label>
                    <Input
                      type="number" min={1} max={30}
                      value={inst.warmup_days_total}
                      onChange={(e) => updateDays(inst, parseInt(e.target.value || "7", 10))}
                      className="bg-white h-8 w-20 text-sm"
                    />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Curva é fixa por padrão — fale com o suporte para customizar.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
