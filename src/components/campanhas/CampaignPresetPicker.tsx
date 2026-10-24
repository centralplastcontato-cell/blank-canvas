// Primeira tela da "Nova Campanha": campanhas prontas (objetivo + público +
// mensagem gerada pela IA) ou começar do zero.

import { useEffect, useState } from "react";
import { ChevronRight, Loader2, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/fetchAllPages";
import {
  CAMPAIGN_PRESETS,
  type CampaignPreset,
  freeWeekendDates,
  shortDateBR,
  upcomingMonths,
} from "@/lib/campaignPresets";

export interface PresetPick {
  preset: CampaignPreset;
  month?: string;
  freeDates?: string[];
}

interface MonthAgenda {
  name: string;
  freeDates: string[];
}

function useFreeWeekends(companyId: string): MonthAgenda[] | null {
  const [agenda, setAgenda] = useState<MonthAgenda[] | null>(null);
  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const months = upcomingMonths(today);
    const first = `${months[0].year}-${String(months[0].monthIndex + 1).padStart(2, "0")}-01`;
    const lastM = months[months.length - 1];
    const last = new Date(Date.UTC(lastM.year, lastM.monthIndex + 1, 0)).toISOString().slice(0, 10);
    fetchAllPages<{ event_date: string }>((a, b) =>
      supabase.from("company_events").select("event_date").eq("company_id", companyId)
        .gte("event_date", first).lte("event_date", last).neq("status", "cancelado").order("id").range(a, b),
    )
      .catch(() => [])
      .then((rows) => {
        if (!alive) return;
        const booked = new Set(rows.map((r) => String(r.event_date).slice(0, 10)));
        setAgenda(months.map((m) => ({ name: m.name, freeDates: freeWeekendDates(m.year, m.monthIndex, booked, today) })));
      });
    return () => { alive = false; };
  }, [companyId]);
  return agenda;
}

export function CampaignPresetPicker({ companyId, onPick, onBlank }: {
  companyId: string;
  onPick: (pick: PresetPick) => void;
  onBlank: () => void;
}) {
  const agenda = useFreeWeekends(companyId);

  return (
    <div className="space-y-3 pb-2">
      <div>
        <p className="text-sm font-semibold">Campanhas prontas</p>
        <p className="text-xs text-muted-foreground">
          Escolha o objetivo: o público já vem separado e a IA escreve as mensagens. Você revisa tudo antes de enviar.
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {CAMPAIGN_PRESETS.map((p) =>
          p.id === "datas_livres" ? (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5 sm:col-span-2">
              <PresetHeader preset={p} />
              {!agenda ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Olhando a agenda...
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {agenda.map((m) => {
                    const n = m.freeDates.length;
                    return (
                      <button
                        key={m.name}
                        type="button"
                        disabled={n === 0}
                        onClick={() => onPick({ preset: p, month: m.name, freeDates: m.freeDates })}
                        className="text-left rounded-xl border border-border px-3 py-2 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-transparent"
                      >
                        <p className="text-sm font-semibold">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {n === 0
                            ? "Fins de semana já reservados"
                            : `${n} ${n === 1 ? "dia livre" : "dias livres"} no fim de semana: ${m.freeDates.slice(0, 3).map(shortDateBR).join(", ")}${n > 3 ? "..." : ""}`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick({ preset: p })}
              className="text-left rounded-2xl border border-border bg-card p-3.5 hover:border-primary hover:bg-primary/5 transition-colors flex items-start gap-2"
            >
              <div className="min-w-0 flex-1"><PresetHeader preset={p} /></div>
              <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
            </button>
          ),
        )}
        <button
          type="button"
          onClick={onBlank}
          className="text-left rounded-2xl border border-dashed border-border p-3.5 hover:border-primary hover:bg-primary/5 transition-colors flex items-start gap-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold flex items-center gap-1.5"><PenLine className="w-4 h-4 text-primary" /> Criar do zero</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Você escreve o objetivo, escolhe o público e a IA ajuda com as mensagens.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
        </button>
      </div>
    </div>
  );
}

function PresetHeader({ preset }: { preset: CampaignPreset }) {
  return (
    <>
      <p className="text-sm font-semibold"><span className="mr-1.5">{preset.emoji}</span>{preset.title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{preset.subtitle}</p>
    </>
  );
}
