// Por qual número a campanha sai: usado no "Revisar" do assistente (criar já
// começa o envio) e na janela de "Continuar envio".

import { useEffect, useState } from "react";
import { Smartphone, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInstancePermissions } from "@/hooks/useInstancePermissions";

export interface SendInstanceOption {
  id: string;
  instance_id: string;
  unit: string | null;
  phone_number: string | null;
}

export type SendMode = "single" | "smart";

/** Números conectados que a pessoa pode usar */
export function useSendInstances(companyId: string, enabled = true) {
  const [instances, setInstances] = useState<SendInstanceOption[] | null>(null);
  const { canViewAllInstances, allowedInstanceIds } = useInstancePermissions();
  const allowedKey = allowedInstanceIds.join(",");

  useEffect(() => {
    if (!enabled || !companyId) return;
    let alive = true;
    supabase
      .from("wapi_instances")
      .select("id, instance_id, unit, phone_number")
      .eq("company_id", companyId)
      .eq("status", "connected")
      .order("unit", { ascending: true })
      .then(({ data }) => {
        if (!alive) return;
        let list = (data as SendInstanceOption[]) || [];
        if (!canViewAllInstances) {
          const allowed = new Set(allowedKey.split(",").filter(Boolean));
          list = list.filter((i) => allowed.has(i.id));
        }
        setInstances(list);
      });
    return () => { alive = false; };
  }, [companyId, enabled, canViewAllInstances, allowedKey]);

  return instances;
}

export function SendNumberPicker({ instances, mode, onModeChange, instanceId, onInstanceChange }: {
  instances: SendInstanceOption[];
  mode: SendMode;
  onModeChange: (m: SendMode) => void;
  instanceId: string;
  onInstanceChange: (id: string) => void;
}) {
  if (instances.length === 0) {
    return <p className="text-xs text-destructive">Nenhum WhatsApp conectado. Conecte um número em Configurações → WhatsApp.</p>;
  }
  if (instances.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 text-xs text-muted-foreground">
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">
          Sai pelo número: <strong className="text-foreground">{instances[0].unit || "WhatsApp"}</strong>
          {instances[0].phone_number ? ` (${instances[0].phone_number})` : ""}
        </span>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Por qual número sai</Label>
      <RadioGroup value={mode} onValueChange={(v) => onModeChange(v as SendMode)} className="space-y-2">
        {([
          { v: "smart", icon: Sparkles, title: "Disparo inteligente", text: "Cada pessoa recebe pelo número onde já conversou. Quem nunca conversou recebe pelo número escolhido abaixo." },
          { v: "single", icon: Smartphone, title: "Tudo por um número", text: "Todas as mensagens saem pelo número escolhido abaixo." },
        ] as const).map((o) => (
          <label key={o.v} htmlFor={`mode-${o.v}`}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${mode === o.v ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/30"}`}>
            <RadioGroupItem value={o.v} id={`mode-${o.v}`} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold"><o.icon className="w-3.5 h-3.5 text-primary" />{o.title}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{o.text}</p>
            </div>
          </label>
        ))}
      </RadioGroup>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5" />
          {mode === "smart" ? "Número para quem nunca conversou" : "Número"}
        </Label>
        <Select value={instanceId} onValueChange={onInstanceChange}>
          <SelectTrigger className="w-full bg-card" aria-label="Número da campanha"><SelectValue placeholder="Escolha o número" /></SelectTrigger>
          <SelectContent>
            {instances.map((inst) => (
              <SelectItem key={inst.instance_id} value={inst.instance_id}>
                {inst.unit || "Sem unidade"}{inst.phone_number ? ` — ${inst.phone_number}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
