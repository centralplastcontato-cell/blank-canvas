import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, ChevronDown, ChevronUp, FileDown, Trash2, Check, MessageSquare, Pencil, Save } from "lucide-react";
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
}

export function ScheduleCard({
  schedule, isExpanded, events, availability, assignments, savingAssignment, roles,
  onToggleExpand, onCopyLink, onGeneratePDF, onDelete, onToggleAssignment, onUpdateRole, onUpdateNotes,
}: ScheduleCardProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(schedule.notes || "");
  const startStr = format(parseISO(schedule.start_date), "dd/MM", { locale: ptBR });
  const endStr = format(parseISO(schedule.end_date), "dd/MM", { locale: ptBR });
  const availCount = availability.filter(a => a.schedule_id === schedule.id).length;
  const assignCount = assignments.filter(a => a.schedule_id === schedule.id).length;

  return (
    <Card>
      <CardHeader className="cursor-pointer pb-3" onClick={onToggleExpand}>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              {schedule.title}
              {schedule.is_active && <Badge variant="secondary" className="text-xs">Ativa</Badge>}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {startStr} a {endStr} · {schedule.event_ids.length} festa(s)
              {isExpanded && availCount > 0 && ` · ${availCount} resposta(s)`}
              {isExpanded && assignCount > 0 && ` · ${assignCount} escalado(s)`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); onCopyLink(); }}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); onGeneratePDF(); }}>
              <FileDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Notes section */}
          <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Observações
              </label>
              {editingNotes ? (
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1" onClick={() => {
                  onUpdateNotes(schedule.id, notesValue);
                  setEditingNotes(false);
                }}>
                  <Save className="h-3 w-3" /> Salvar
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1" onClick={() => {
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
                className="min-h-[60px] resize-none text-sm"
                maxLength={500}
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {schedule.notes || "Nenhuma observação adicionada."}
              </p>
            )}
          </div>

          {schedule.event_ids.map(eventId => {
            const ev = events[eventId];
            if (!ev) return null;

            const dateObj = parseISO(ev.event_date);
            const dayName = format(dateObj, "EEE", { locale: ptBR });
            const availForEvent = availability.filter(a => a.schedule_id === schedule.id && a.available_event_ids.includes(eventId));
            const assignedForEvent = assignments.filter(a => a.schedule_id === schedule.id && a.event_id === eventId);

            return (
              <div key={eventId} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {dayName} {format(dateObj, "dd/MM")}
                      {ev.start_time && ` · ${ev.start_time.slice(0, 5)}`}
                      {ev.package_name && ` · ${ev.package_name}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {availForEvent.length} disponível(is)
                  </Badge>
                </div>

                {availForEvent.length > 0 && (
                  <div className="space-y-2">
                    {availForEvent.map(av => {
                      const assigned = assignedForEvent.find(a => a.freelancer_name === av.freelancer_name);
                      return (
                        <div key={av.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                          <Checkbox
                            checked={!!assigned}
                            onCheckedChange={() => onToggleAssignment(schedule.id, eventId, av.freelancer_name, assigned?.role || "")}
                            disabled={savingAssignment}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{av.freelancer_name}</p>
                            <p className="text-xs text-muted-foreground">{av.freelancer_phone}</p>
                          </div>
                          {assigned && (
                            <Select value={assigned.role || "none"} onValueChange={v => onUpdateRole(assigned.id, v === "none" ? "" : v)}>
                              <SelectTrigger className="w-32 h-8 text-xs">
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
                  <p className="text-xs text-muted-foreground">Nenhum freelancer disponível ainda.</p>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
