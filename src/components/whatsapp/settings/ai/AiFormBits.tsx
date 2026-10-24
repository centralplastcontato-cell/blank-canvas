// Peças comuns das páginas da IA: cartão de seção, dias da semana, horário e
// a barra "Salvar" que aparece quando há alteração.

import { useEffect, type ReactNode } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setUnsavedChanges } from "@/lib/unsavedChanges";
import { cn } from "@/lib/utils";

export const DAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const TIME_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const h = String(Math.floor(i / 2) + 8).padStart(2, "0");
  return `${h}:${i % 2 === 0 ? "00" : "30"}`;
});

export function AiCard({ icon, title, description, children, action, className }: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">{icon}{title}</h3>
          {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DayPicker({ value, onToggle }: { value: number[]; onToggle: (day: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DAY_SHORT.map((d, idx) => {
        const on = value.includes(idx);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(idx)}
            className={cn(
              "min-w-[44px] h-9 px-2 rounded-lg text-xs font-bold transition-all border",
              on ? "bg-violet-600 text-white border-violet-600 shadow-sm" : "bg-card text-muted-foreground border-border",
            )}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

export function TimeSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <Label className="text-xs font-bold">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 bg-card border-border shadow-sm" aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

/** Dias + das/até + sábado diferente (visitas e horário da equipe) */
export function WeekHoursEditor(p: {
  days: number[];
  setDays: (fn: (prev: number[]) => number[]) => void;
  start: string; setStart: (v: string) => void;
  end: string; setEnd: (v: string) => void;
  satDifferent: boolean; setSatDifferent: (v: boolean) => void;
  satStart: string; setSatStart: (v: string) => void;
  satEnd: string; setSatEnd: (v: string) => void;
  children?: ReactNode;
}) {
  const toggle = (day: number) => {
    // Sábado saiu da seleção: o horário diferente dele não faz mais sentido
    if (day === 5 && p.days.includes(5)) p.setSatDifferent(false);
    p.setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };
  return (
    <div className="space-y-3">
      <DayPicker value={p.days} onToggle={toggle} />
      <div className="grid grid-cols-2 gap-3">
        <TimeSelect label="Das" value={p.start} onChange={p.setStart} />
        <TimeSelect label="Até" value={p.end} onChange={p.setEnd} />
      </div>
      {p.children}
      {p.days.includes(5) && (
        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs font-bold">Sábado tem horário diferente</Label>
            <Switch checked={p.satDifferent} onCheckedChange={p.setSatDifferent} aria-label="Sábado tem horário diferente" />
          </div>
          {p.satDifferent && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <TimeSelect label="Das (sábado)" value={p.satStart} onChange={p.setSatStart} />
              <TimeSelect label="Até (sábado)" value={p.satEnd} onChange={p.setSatEnd} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Barra de salvar da página: fica presa no rodapé enquanto há alteração e
 * avisa ao fechar a aba ou trocar de item sem salvar.
 */
export function SaveBar({ dirty, saving, busyText, onSave, onDiscard }: {
  dirty: boolean;
  saving: boolean;
  busyText?: string | null;
  onSave: () => void;
  onDiscard: () => void;
}) {
  useEffect(() => {
    setUnsavedChanges(dirty);
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => () => setUnsavedChanges(false), []);

  if (!dirty && !saving) return null;
  return (
    <div className="sticky bottom-3 z-20 mt-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 shadow-lg dark:border-amber-500/40 dark:bg-amber-950/60">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Alterações não salvas</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>Desfazer</Button>
          <Button size="sm" onClick={onSave} disabled={saving || !!busyText} className="gap-1.5">
            {saving || busyText ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {busyText || "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
