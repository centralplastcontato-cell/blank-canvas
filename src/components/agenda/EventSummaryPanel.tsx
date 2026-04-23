import { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Cake, Users2, Package, Users, Clock, MapPin, Star, StickyNote } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BirthdayChild {
  name?: string;
  age?: string;
  birthdate?: string;
}

interface EventOptional {
  name?: string;
  value?: number;
  id?: string;
}

interface EventSummaryData {
  id: string;
  child_name?: string | null;
  child_age?: string | null;
  birthday_children?: BirthdayChild[] | null;
  parent_names?: string | null;
  package_name?: string | null;
  guest_count?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  unit?: string | null;
  event_optionals?: EventOptional[] | null;
  notes?: string | null;
  internal_notes?: string | null;
  gifts?: string | null;
}

interface EventSummaryPanelProps {
  event: EventSummaryData;
  leadName?: string | null;
  companyId: string;
}

export function EventSummaryPanel({ event, leadName, companyId }: EventSummaryPanelProps) {
  const [internalNotes, setInternalNotes] = useState(event.internal_notes || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(event.internal_notes || "");

  useEffect(() => {
    setInternalNotes(event.internal_notes || "");
    lastSavedRef.current = event.internal_notes || "";
  }, [event.id, event.internal_notes]);

  const saveNotes = useCallback(async (value: string) => {
    if (value === lastSavedRef.current) return;
    lastSavedRef.current = value;
    const { error } = await supabase
      .from("company_events")
      .update({ internal_notes: value || null })
      .eq("id", event.id);
    if (error) {
      toast({ title: "Erro ao salvar anotações", description: error.message, variant: "destructive" });
    }
  }, [event.id]);

  const handleNotesChange = (value: string) => {
    setInternalNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotes(value), 2000);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Build birthday children list
  const children: { name: string; age: string }[] = [];
  if (event.birthday_children && Array.isArray(event.birthday_children) && event.birthday_children.length > 0) {
    for (const c of event.birthday_children) {
      if (c.name) children.push({ name: c.name, age: c.age || "" });
    }
  } else if (event.child_name) {
    children.push({ name: event.child_name, age: event.child_age || "" });
  }

  const optionals = Array.isArray(event.event_optionals) ? event.event_optionals.filter((o) => o?.name) : [];
  const contractorName = event.parent_names || leadName || null;

  const InfoRow = ({ icon: Icon, label, value, className }: { icon: any; label: string; value: string; className?: string }) => (
    <div className="flex items-start gap-2.5">
      <div className="p-1 rounded-md bg-primary/10 mt-0.5 shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className={`text-xs text-foreground ${className || ""}`}>{value}</p>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Resumo da Festa</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Aniversariante(s) */}
        {children.length > 0 && (
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-primary/10 mt-0.5 shrink-0">
              <Cake className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {children.length > 1 ? "Aniversariantes" : "Aniversariante"}
              </p>
              {children.map((c, i) => (
                <p key={i} className="text-xs text-foreground">
                  {c.name}{c.age ? ` — ${c.age} anos` : ""}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Pais / Contratante */}
        {contractorName && (
          <InfoRow icon={Users2} label="Pais / Contratante" value={contractorName} />
        )}

        {/* Pacote */}
        {event.package_name && (
          <InfoRow icon={Package} label="Pacote" value={event.package_name} />
        )}

        {/* Convidados */}
        {event.guest_count && (
          <InfoRow icon={Users} label="Convidados" value={`${event.guest_count} pessoas`} />
        )}

        {/* Horário */}
        {(event.start_time || event.end_time) && (
          <InfoRow
            icon={Clock}
            label="Horário"
            value={`${event.start_time?.slice(0, 5) || "–"} até ${event.end_time?.slice(0, 5) || "–"}`}
          />
        )}

        {/* Unidade */}
        {event.unit && (
          <InfoRow icon={MapPin} label="Unidade" value={event.unit} />
        )}

        {/* Opcionais */}
        {optionals.length > 0 && (
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-primary/10 mt-0.5 shrink-0">
              <Star className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Opcionais</p>
              {optionals.map((opt, i) => (
                <p key={i} className="text-xs text-foreground">
                  {opt.name}
                  {opt.value ? ` — ${Number(opt.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Observações do evento */}
        {event.notes && (
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded-md bg-primary/10 mt-0.5 shrink-0">
              <StickyNote className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Observações</p>
              <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">{event.notes}</p>
            </div>
          </div>
        )}

        {/* Anotações internas (editável) */}
        <div className="pt-1 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Anotações Internas</p>
          <Textarea
            value={internalNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            onBlur={() => {
              if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
              }
              saveNotes(internalNotes);
            }}
            placeholder="Escreva anotações rápidas sobre esta festa..."
            className="min-h-[60px] text-xs resize-none bg-muted/20 border-border/30 focus-visible:ring-1"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
