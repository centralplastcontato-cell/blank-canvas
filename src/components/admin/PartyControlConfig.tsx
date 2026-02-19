import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  CheckSquare, Users, Wrench, ClipboardCheck,
  UserCheck, Info, Star, UtensilsCrossed, PartyPopper, Loader2
} from "lucide-react";

interface PartyControlModules {
  checklist: boolean;
  staff: boolean;
  maintenance: boolean;
  monitoring: boolean;
  attendance: boolean;
  info: boolean;
  prefesta: boolean;
  cardapio: boolean;
  avaliacao: boolean;
}

const MODULE_DEFINITIONS = [
  { key: "checklist",   label: "Checklist",            description: "Itens a concluir antes e durante a festa", icon: CheckSquare,    color: "#22c55e", essential: true },
  { key: "staff",       label: "Equipe",                description: "Lista de colaboradores escalados",          icon: Users,          color: "#3b82f6", essential: true },
  { key: "maintenance", label: "Manutenção",            description: "Registro de ocorrências e infraestrutura",  icon: Wrench,         color: "#f59e0b", essential: true },
  { key: "monitoring",  label: "Acompanhamento",        description: "Monitoramento em tempo real da festa",      icon: ClipboardCheck, color: "#a78bfa", essential: true },
  { key: "attendance",  label: "Presença de Convidados",description: "Controle de entrada e número de presentes", icon: UserCheck,      color: "#06b6d4", essential: true },
  { key: "info",        label: "Informações da Festa",  description: "Blocos de orientação para a equipe",        icon: Info,           color: "#ec4899", essential: true },
  { key: "prefesta",    label: "Pré-Festa",             description: "Formulário de checklist pré-evento",        icon: PartyPopper,    color: "#f97316", essential: false },
  { key: "cardapio",    label: "Cardápio",              description: "Escolhas de cardápio do cliente",           icon: UtensilsCrossed,color: "#84cc16", essential: false },
  { key: "avaliacao",   label: "Avaliação",             description: "Link para avaliação pós-festa",             icon: Star,           color: "#fbbf24", essential: false },
] as const;

const DEFAULTS: PartyControlModules = {
  checklist: true, staff: true, maintenance: true, monitoring: true,
  attendance: true, info: true, prefesta: false, cardapio: false, avaliacao: false,
};

export function PartyControlConfig() {
  const companyId = useCurrentCompanyId();
  const [modules, setModules] = useState<PartyControlModules>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("settings")
        .eq("id", companyId)
        .single();
      if (data?.settings && typeof data.settings === "object" && !Array.isArray(data.settings)) {
        const s = data.settings as Record<string, unknown>;
        const pcm = s.party_control_modules;
        if (pcm && typeof pcm === "object" && !Array.isArray(pcm)) {
          const m = pcm as Record<string, unknown>;
          setModules({
            checklist:   m.checklist   !== false,
            staff:       m.staff       !== false,
            maintenance: m.maintenance !== false,
            monitoring:  m.monitoring  !== false,
            attendance:  m.attendance  !== false,
            info:        m.info        !== false,
            prefesta:    m.prefesta    === true,
            cardapio:    m.cardapio    === true,
            avaliacao:   m.avaliacao   === true,
          });
        }
      }
      setLoading(false);
    })();
  }, [companyId]);

  const handleToggle = async (key: keyof PartyControlModules, value: boolean) => {
    if (!companyId) return;
    const updated = { ...modules, [key]: value };
    setModules(updated);
    setSaving(true);

    // Merge with existing settings
    const { data: current } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .single();

    const existingSettings = (current?.settings && typeof current.settings === "object" && !Array.isArray(current.settings))
      ? current.settings as Record<string, unknown>
      : {};

    const { error } = await supabase
      .from("companies")
      .update({ settings: { ...existingSettings, party_control_modules: updated } })
      .eq("id", companyId);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      setModules(modules); // revert
    } else {
      toast({ title: "Configuração salva!", description: `Módulo "${MODULE_DEFINITIONS.find(m => m.key === key)?.label}" ${value ? "ativado" : "desativado"}.` });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const essential = MODULE_DEFINITIONS.filter(m => m.essential);
  const optional  = MODULE_DEFINITIONS.filter(m => !m.essential);

  return (
    <div className="space-y-6">
      {saving && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
        </div>
      )}

      {/* Essential modules */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Módulos principais
        </p>
        <div className="space-y-2">
          {essential.map(mod => {
            const Icon = mod.icon;
            const active = modules[mod.key as keyof PartyControlModules];
            return (
              <div key={mod.key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: active ? `${mod.color}20` : "transparent", border: `1px solid ${active ? mod.color + "40" : "transparent"}` }}>
                    <Icon className="h-4 w-4" style={{ color: active ? mod.color : "#64748b" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{mod.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                  </div>
                </div>
                <Switch
                  checked={active}
                  onCheckedChange={v => handleToggle(mod.key as keyof PartyControlModules, v)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional modules */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Módulos opcionais
        </p>
        <div className="space-y-2">
          {optional.map(mod => {
            const Icon = mod.icon;
            const active = modules[mod.key as keyof PartyControlModules];
            return (
              <div key={mod.key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: active ? `${mod.color}20` : "transparent", border: `1px solid ${active ? mod.color + "40" : "transparent"}` }}>
                    <Icon className="h-4 w-4" style={{ color: active ? mod.color : "#64748b" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{mod.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                  </div>
                </div>
                <Switch
                  checked={active}
                  onCheckedChange={v => handleToggle(mod.key as keyof PartyControlModules, v)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
