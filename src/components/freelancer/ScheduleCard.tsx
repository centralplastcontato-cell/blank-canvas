import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, ChevronDown, ChevronUp, FileDown, Trash2, Check, MessageSquare, Pencil, Save, X, Send } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EventData, Availability, Assignment } from "./FreelancerSchedulesTab";

interface Schedule {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  event_ids: string[];
  slug: string | null;
  is_active: boolean;
  created_at: string;
  notes: string | null;
  event_display_names?: Record<string, string>;
}

interface ScheduleCardProps {
  schedule: Schedule;
  isExpanded: boolean;
  events: Record<string, EventData>;
  availability: Availability[];
  assignments: Assignment[];
  savingAssignment: boolean;
  roles: string[];
  onToggleExpand: () => void;
  onCopyLink: () => void;
  onGeneratePDF: () => void;
  onDelete: () => void;
  onToggleAssignment: (scheduleId: string, eventId: string, freelancerName: string, role: string) => void;
  onUpdateRole: (assignmentId: string, newRole: string) => void;
  onUpdateNotes: (scheduleId: string, notes: string) => void;
  onRemoveEvent?: (scheduleId: string, eventId: string) => void;
  onUpdateDisplayName?: (scheduleId: string, eventId: string, displayName: string) => void;
  onSendToGroups?: () => void;
}

export function ScheduleCard({
  schedule, isExpanded, events, availability, assignments, savingAssignment, roles,
  onToggleExpand, onCopyLink, onGeneratePDF, onDelete, onToggleAssignment, onUpdateRole, onUpdateNotes,
  onRemoveEvent, onUpdateDisplayName, onSendToGroups,
}: ScheduleCardProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(schedule.notes || "");
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const startStr = format(parseISO(schedule.start_date), "dd/MM", { locale: ptBR });
  const endStr = format(parseISO(schedule.end_date), "dd/MM", { locale: ptBR });
  const availCount = availability.filter(a => a.schedule_id === schedule.id).length;
  const assignCount = assignments.filter(a => a.schedule_id === schedule.id).length;
  const displayNames = schedule.event_display_names || {};

  const getGenericName = (ev: EventData) => {
    const dateObj = parseISO(ev.event_date);
    const dateStr = format(dateObj, "dd/MM");
    const timeStr = ev.start_time ? ` às ${ev.start_time.slice(0, 5)}` : "";
    return `Festa ${dateStr}${timeStr}`;
  };

  const getDisplayName = (eventId: string, ev: EventData) => {
    const custom = displayNames[eventId];
    if (custom) return custom;
    return ev.title; // default: show host name
  };

  const isGenericMode = (eventId: string, ev: EventData) => {
    const custom = displayNames[eventId];
    return custom === getGenericName(ev);
  };

  return (
    <Card className={`transition-all duration-200 ${isExpanded ? "shadow-md border-primary/20 ring-1 ring-primary/5" : "hover:shadow-sm"}`}>
      <CardHeader className="cursor-pointer pb-3" onClick={onToggleExpand}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
              {schedule.title}
              {schedule.is_active && (
                <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                  Ativa
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 pl-4">
              {startStr} a {endStr} · {schedule.event_ids.length} festa(s)
              {isExpanded && availCount > 0 && (
                <span className="text-primary font-medium"> · {availCount} resposta(s)</span>
              )}
              {isExpanded && assignCount > 0 && (
                <span className="text-emerald-600 font-medium"> · {assignCount} escalado(s)</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            {onSendToGroups && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-emerald-600 hover:text-emerald-700" onClick={e => { e.stopPropagation(); onSendToGroups(); }}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={e => { e.stopPropagation(); onCopyLink(); }}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={e => { e.stopPropagation(); onGeneratePDF(); }}>
              <FileDown className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <div className="ml-1 h-6 w-6 rounded-full bg-muted/60 flex items-center justify-center">
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </div>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-5">
          {/* Notes section */}
          <div className="border-l-4 border-l-amber-400/60 rounded-r-xl bg-amber-50/50 dark:bg-amber-950/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold tracking-[0.18em] uppercase text-amber-700/70 dark:text-amber-400/70 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Observações
              </label>
              {editingNotes ? (
                <Button variant="secondary" size="sm" className="h-7 text-xs px-3 gap-1.5 rounded-full" onClick={() => {
                  onUpdateNotes(schedule.id, notesValue);
                  setEditingNotes(false);
                }}>
                  <Save className="h-3 w-3" /> Salvar
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2.5 gap-1.5 rounded-full" onClick={() => {
                  setNotesValue(schedule.notes || "");
                  setEditingNotes(true);
                }}>
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
              )}
            </div>
            {editingNotes ? (
              <Textarea
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
                placeholder="Ex: Chegar 30min antes, usar camiseta preta..."
                className="min-h-[60px] resize-none text-sm bg-background"
                maxLength={500}
              />
            ) : (
              <p className={`text-sm whitespace-pre-wrap ${schedule.notes ? "text-foreground/80" : "text-muted-foreground/50 italic"}`}>
                {schedule.notes || "Nenhuma observação adicionada."}
              </p>
            )}
          </div>

          {/* Divider label */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              Festas da escala
            </span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          {schedule.event_ids.map(eventId => {
            const ev = events[eventId];
            if (!ev) return null;

            const dateObj = parseISO(ev.event_date);
            const dayName = format(dateObj, "EEE", { locale: ptBR });
            const availForEvent = availability.filter(a => a.schedule_id === schedule.id && a.available_event_ids.includes(eventId));
            const assignedForEvent = assignments.filter(a => a.schedule_id === schedule.id && a.event_id === eventId);
            const displayName = getDisplayName(eventId, ev);
            const genericMode = isGenericMode(eventId, ev);

            return (
              <div key={eventId} className="border rounded-xl p-4 space-y-3 bg-card shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/8 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary uppercase leading-none">{dayName}</span>
                      <span className="text-sm font-extrabold text-primary leading-tight">{format(dateObj, "dd")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(dateObj, "dd/MM")}
                        {ev.start_time && ` · ${ev.start_time.slice(0, 5)}`}
                        {ev.package_name && ` · ${ev.package_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Display name toggle */}
                    {onUpdateDisplayName && (
                      <Select
                        value={genericMode ? "generic" : "host"}
                        onValueChange={v => {
                          const newName = v === "generic" ? getGenericName(ev) : "";
                          onUpdateDisplayName(schedule.id, eventId, newName);
                        }}
                      >
                        <SelectTrigger className="w-28 h-7 text-[10px] rounded-lg border-dashed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="host">Anfitrião</SelectItem>
                          <SelectItem value="generic">Festa genérica</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Badge
                      variant={availForEvent.length > 0 ? "default" : "outline"}
                      className={`text-[10px] font-semibold ${availForEvent.length > 0 ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : ""}`}
                    >
                      {availForEvent.length} disponível(is)
                    </Badge>
                    {/* Remove event button */}
                    {onRemoveEvent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setRemoveConfirm(eventId)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {availForEvent.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {availForEvent.map(av => {
                      const assigned = assignedForEvent.find(a => a.freelancer_name === av.freelancer_name);
                      return (
                        <div key={av.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${assigned ? "bg-primary/5 border-primary/15" : "bg-muted/30 border-transparent"}`}>
                          <Checkbox
                            checked={!!assigned}
                            onCheckedChange={() => onToggleAssignment(schedule.id, eventId, av.freelancer_name, assigned?.role || "")}
                            disabled={savingAssignment}
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${assigned ? "font-semibold" : "font-medium"}`}>{av.freelancer_name}</p>
                            <p className="text-[11px] text-muted-foreground">{av.freelancer_phone}</p>
                          </div>
                          {assigned && (
                            <Select value={assigned.role || "none"} onValueChange={v => onUpdateRole(assigned.id, v === "none" ? "" : v)}>
                              <SelectTrigger className="w-32 h-8 text-xs rounded-lg">
                                <SelectValue placeholder="Função" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem função</SelectItem>
                                {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                          {assigned && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {availForEvent.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 italic pl-1">Nenhum freelancer disponível ainda.</p>
                )}
              </div>
            );
          })}
        </CardContent>
      )}

      {/* Remove event confirmation dialog */}
      <AlertDialog open={!!removeConfirm} onOpenChange={open => !open && setRemoveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover festa da escala?</AlertDialogTitle>
            <AlertDialogDescription>
              {schedule.event_ids.length <= 1
                ? "Esta é a última festa da escala. Ao removê-la, a escala inteira será excluída."
                : "A festa será removida desta escala. Disponibilidades e escalações relacionadas também serão removidas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeConfirm && onRemoveEvent) {
                  if (schedule.event_ids.length <= 1) {
                    onDelete();
                  } else {
                    onRemoveEvent(schedule.id, removeConfirm);
                  }
                }
                setRemoveConfirm(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
