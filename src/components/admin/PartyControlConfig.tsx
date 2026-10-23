import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_SCHEDULE, parseSchedule, type ScheduleStep } from "@/lib/partyDay";
import { toast } from "@/hooks/use-toast";
import {
  CheckSquare, Users, Wrench, ClipboardCheck,
  UserCheck, Info, Star, UtensilsCrossed, PartyPopper, Loader2, Plus, Trash2, Clock
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
  { key: "prefesta",    label: "Pré-Festa",             description: "Formulário que o cliente preenche antes da festa",        icon: PartyPopper,    color: "#f97316", essential: false },
  { key: "cardapio",    label: "Cardápio",              description: "Escolhas de cardápio do cliente",           icon: UtensilsCrossed,color: "#84cc16", essential: false },
  { key: "avaliacao",   label: "Avaliação",             description: "Link para o cliente avaliar a festa depois",             icon: Star,           color: "#fbbf24", essential: false },
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
  const [schedule, setSchedule] = useState<ScheduleStep[]>(DEFAULT_SCHEDULE);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

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
        setSchedule(parseSchedule(s));
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

  const saveSchedule = async () => {
    if (!companyId) return;
    const clean = schedule.map((st) => ({ ...st, label: st.label.trim() })).filter((st) => st.label);
    setSavingSchedule(true);
    const { data: current } = await supabase.from("companies").select("settings").eq("id", companyId).single();
    const existingSettings = (current?.settings && typeof current.settings === "object" && !Array.isArray(current.settings))
      ? current.settings as Record<string, unknown>
      : {};
    const { error } = await supabase
      .from("companies")
      .update({ settings: { ...existingSettings, party_schedule: clean } })
      .eq("id", companyId);
    setSavingSchedule(false);
    if (error) {
      toast({ title: "Erro ao salvar o roteiro", description: error.message, variant: "destructive" });
    } else {
      setSchedule(clean.length ? clean : DEFAULT_SCHEDULE);
      setScheduleDirty(false);
      toast({ title: "Roteiro salvo", description: "Vale para a página de todas as festas." });
    }
  };

  const editStep = (i: number, patch: Partial<ScheduleStep>) => {
    setSchedule((prev) => prev.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
    setScheduleDirty(true);
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
      {/* O que esta tela controla (antes não dizia, e o nome prometia "checklists") */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        Escolha o que aparece na <strong className="text-foreground">página do dia da festa</strong>: o link que a equipe abre pela Agenda
        (botão da festa) para acompanhar tudo no dia. Ligou, aparece; desligou, some da página. Vale para todas as festas e salva na hora.
      </div>
      {saving && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
        </div>
      )}

      {/* Essential modules */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Partes principais
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
                    <p className="text-xs text-muted-foreground line-clamp-2">{mod.description}</p>
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
          Extras (opcionais)
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
                    <p className="text-xs text-muted-foreground line-clamp-2">{mod.description}</p>
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

      {/* Roteiro da festa (aparece na página com os horários de cada festa) */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Roteiro da festa
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Os momentos do dia, contados a partir do horário de cada festa. Ex.: "Equipe chega" 60 min antes do início; "Parabéns" 60 min antes do fim.
        </p>
        <div className="space-y-2">
          {schedule.map((st, i) => {
            const when = st.anchor === "end" ? (st.offset < 0 ? "before_end" : "at_end") : st.offset < 0 ? "before_start" : "after_start";
            return (
              <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={st.label}
                    onChange={(e) => editStep(i, { label: e.target.value })}
                    placeholder="Nome do momento"
                    aria-label="Nome do momento"
                    className="h-9"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground"
                    aria-label="Remover momento"
                    onClick={() => { setSchedule((prev) => prev.filter((_, idx) => idx !== i)); setScheduleDirty(true); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {when !== "at_end" && (
                    <>
                      <Input
                        type="number"
                        min={0}
                        step={5}
                        value={Math.abs(st.offset)}
                        onChange={(e) => {
                          const n = Math.max(0, Math.round(Number(e.target.value) || 0));
                          editStep(i, { offset: when === "after_start" ? n : -n });
                        }}
                        aria-label="Minutos"
                        className="h-9 w-20"
                      />
                      <span className="text-muted-foreground">min</span>
                    </>
                  )}
                  <select
                    value={when}
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = Math.abs(st.offset);
                      if (v === "before_start") editStep(i, { anchor: "start", offset: -n });
                      else if (v === "after_start") editStep(i, { anchor: "start", offset: n });
                      else if (v === "before_end") editStep(i, { anchor: "end", offset: -(n || 30) });
                      else editStep(i, { anchor: "end", offset: 0 });
                    }}
                    aria-label="Quando"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="before_start">antes do início</option>
                    <option value="after_start">depois do início</option>
                    <option value="before_end">antes do fim</option>
                    <option value="at_end">no fim da festa</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => { setSchedule((prev) => [...prev, { label: "", anchor: "start", offset: 0 }]); setScheduleDirty(true); }}
          >
            <Plus className="h-4 w-4" /> Adicionar momento
          </Button>
          <Button type="button" size="sm" disabled={!scheduleDirty || savingSchedule} onClick={saveSchedule} className="gap-1.5">
            {savingSchedule && <Loader2 className="h-4 w-4 animate-spin" />} Salvar roteiro
          </Button>
        </div>
      </div>
    </div>
  );
}
