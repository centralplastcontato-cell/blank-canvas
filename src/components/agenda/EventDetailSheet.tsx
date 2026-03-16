import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, Users, MapPin, Package, DollarSign, Pencil, Trash2, AlertTriangle, UserCheck, Gamepad2, Copy, Check, ExternalLink, Briefcase, CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EventChecklist } from "./EventChecklist";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface TeamMember {
  user_id: string;
  full_name: string;
}

interface EventData {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string | null;
  guest_count: number | null;
  unit: string | null;
  status: string;
  package_name: string | null;
  total_value: number | null;
  notes: string | null;
  lead_id?: string | null;
  company_id?: string;
  data_fechamento_venda?: string | null;
  vendedor_responsavel_id?: string | null;
}

interface EventDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventData | null;
  onEdit: (event: EventData) => void;
  onDelete: (id: string) => void;
  conflicts?: EventData[];
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  confirmado: { label: "Confirmado", variant: "default" },
  pendente: { label: "Pendente", variant: "secondary" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export function EventDetailSheet({ open, onOpenChange, event, onEdit, onDelete, conflicts = [] }: EventDetailSheetProps) {
  const [leadName, setLeadName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [localFechamento, setLocalFechamento] = useState<string | null>(null);
  const [localVendedor, setLocalVendedor] = useState<string | null>(null);

  // Sync local state with event prop
  useEffect(() => {
    setLocalFechamento(event?.data_fechamento_venda || null);
    setLocalVendedor(event?.vendedor_responsavel_id || null);
  }, [event?.data_fechamento_venda, event?.vendedor_responsavel_id, event?.id]);

  const getControlUrl = () => `${window.location.origin}/festa/${event?.id}`;

  const handleCopyControlLink = () => {
    navigator.clipboard.writeText(getControlUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getControlUrl();
    const text = `🎉 Painel de controle da festa *${event?.title}*:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  useEffect(() => {
    if (!event?.lead_id) { setLeadName(null); return; }
    supabase.from("campaign_leads").select("name").eq("id", event.lead_id).single()
      .then(({ data }) => setLeadName(data?.name || null));
  }, [event?.lead_id]);

  // Fetch team members for vendedor selector
  useEffect(() => {
    if (!event?.company_id) return;
    supabase
      .from("user_companies")
      .select("user_id, profiles!inner(full_name)")
      .eq("company_id", event.company_id)
      .then(({ data }) => {
        if (data) {
          const members = (data as any[])
            .filter(d => d.profiles?.full_name)
            .map(d => ({ user_id: d.user_id, full_name: d.profiles.full_name }));
          setTeamMembers(members);
        }
      });
  }, [event?.company_id]);

  const saveCommercialField = async (field: string, value: string | null) => {
    if (!event) return;
    // Optimistic update
    if (field === 'data_fechamento_venda') setLocalFechamento(value);
    if (field === 'vendedor_responsavel_id') setLocalVendedor(value);

    setSavingField(field);
    console.log('[EventDetail:CommercialUpdate]', { eventId: event.id, field, value });
    const { error } = await supabase
      .from("company_events")
      .update({ [field]: value })
      .eq("id", event.id);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      // Revert on error
      if (field === 'data_fechamento_venda') setLocalFechamento(event.data_fechamento_venda || null);
      if (field === 'vendedor_responsavel_id') setLocalVendedor(event.vendedor_responsavel_id || null);
    } else {
      toast({ title: "Dados comerciais atualizados!" });
    }
    setSavingField(null);
  };

  if (!event) return null;

  const statusInfo = STATUS_MAP[event.status] || STATUS_MAP.pendente;
  const dateFormatted = format(new Date(event.event_date + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left text-lg">{event.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>

          {conflicts.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Conflito de horário!</p>
                <p>{conflicts.map(c => c.title).join(", ")} no mesmo horário/unidade.</p>
              </div>
            </div>
          )}

          <div className="space-y-3 text-sm bg-muted/30 rounded-xl p-4">
            <div className="flex items-center gap-3 text-foreground">
              <div className="p-1.5 rounded-lg bg-primary/10"><CalendarDays className="h-4 w-4 text-primary" /></div>
              <span className="capitalize">{dateFormatted}</span>
            </div>

            {(event.start_time || event.end_time) && (
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-1.5 rounded-lg bg-primary/10"><Clock className="h-4 w-4 text-primary" /></div>
                <span>
                  {event.start_time?.slice(0, 5) || "–"} até {event.end_time?.slice(0, 5) || "–"}
                </span>
              </div>
            )}

            {event.event_type && (
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-1.5 rounded-lg bg-secondary/20"><Package className="h-4 w-4 text-secondary-foreground" /></div>
                <span className="capitalize">{event.event_type}</span>
              </div>
            )}

            {event.guest_count && (
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-1.5 rounded-lg bg-accent/10"><Users className="h-4 w-4 text-accent" /></div>
                <span>{event.guest_count} convidados</span>
              </div>
            )}

            {event.unit && (
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-1.5 rounded-lg bg-accent/10"><MapPin className="h-4 w-4 text-accent" /></div>
                <span>{event.unit}</span>
              </div>
            )}

            {event.total_value != null && (
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-1.5 rounded-lg bg-accent/10"><DollarSign className="h-4 w-4 text-accent" /></div>
                <span>{event.total_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            )}

            {event.package_name && (
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-1.5 rounded-lg bg-secondary/20"><Package className="h-4 w-4 text-secondary-foreground" /></div>
                <span>{event.package_name}</span>
              </div>
            )}
          </div>

          {event.lead_id && leadName && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                <UserCheck className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Lead vinculado</p>
                  <p className="font-medium">{leadName}</p>
                </div>
              </div>
            </>
          )}

          {event.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
              </div>
            </>
          )}

          {/* Dados Comerciais */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground pb-2 border-b border-border/40">
              <div className="p-1.5 rounded-md bg-primary/10 ring-1 ring-primary/15">
                <Briefcase className="h-3.5 w-3.5 text-primary" />
              </div>
              Dados Comerciais
            </div>
            <div className="space-y-2 text-sm">
              {(!event.data_fechamento_venda || !event.vendedor_responsavel_id) && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Dados comerciais incompletos</p>
                    <ul className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5 space-y-0.5">
                      {!event.data_fechamento_venda && <li>• Data de fechamento não definida</li>}
                      {!event.vendedor_responsavel_id && <li>• Vendedor não definido</li>}
                    </ul>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Data de fechamento</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 text-xs gap-1.5 rounded-lg px-2",
                        event.data_fechamento_venda ? "font-medium" : "text-muted-foreground/60"
                      )}
                      disabled={savingField === 'data_fechamento_venda'}
                    >
                      {savingField === 'data_fechamento_venda' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CalendarIcon className="h-3 w-3" />
                      )}
                      {event.data_fechamento_venda
                        ? format(new Date(event.data_fechamento_venda + "T12:00:00"), "dd/MM/yyyy")
                        : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl shadow-lg" align="end">
                    <Calendar
                      mode="single"
                      selected={event.data_fechamento_venda ? new Date(event.data_fechamento_venda + "T12:00:00") : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const formatted = format(date, "yyyy-MM-dd");
                          saveCommercialField('data_fechamento_venda', formatted);
                        }
                      }}
                      locale={ptBR}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Vendedor</span>
                <Select
                  value={event.vendedor_responsavel_id || "none"}
                  onValueChange={(v) => saveCommercialField('vendedor_responsavel_id', v === "none" ? null : v)}
                  disabled={savingField === 'vendedor_responsavel_id'}
                >
                  <SelectTrigger className={cn(
                    "h-7 w-auto min-w-[120px] max-w-[180px] text-xs rounded-lg border-0 bg-transparent hover:bg-muted/50 gap-1.5 px-2",
                    event.vendedor_responsavel_id ? "font-medium" : "text-muted-foreground/60"
                  )}>
                    {savingField === 'vendedor_responsavel_id' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <SelectValue placeholder="Selecionar" />
                    )}
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">Nenhum</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Checklist */}
          {event.company_id && (
            <EventChecklist eventId={event.id} companyId={event.company_id} />
          )}

          <Separator />

          {/* Controle da Festa link */}
          <div
            className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(96,165,250,0.2)" }}
          >
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
            >
              <Gamepad2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "#93c5fd" }}>Controle da Festa</p>
              <p className="text-xs" style={{ color: "#64748b" }}>Copiar ou compartilhar link do painel</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Open link */}
              <button
                onClick={() => window.open(getControlUrl(), "_blank")}
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: "rgba(168,85,247,0.15)" }}
                title="Abrir painel"
              >
                <ExternalLink className="h-4 w-4" style={{ color: "#c084fc" }} />
              </button>
              {/* WhatsApp share */}
              <button
                onClick={handleShareWhatsApp}
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: "rgba(37,211,102,0.15)" }}
                title="Compartilhar no WhatsApp"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" style={{ color: "#25d366" }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
              {/* Copy link */}
              <button
                onClick={handleCopyControlLink}
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: "rgba(96,165,250,0.15)" }}
                title="Copiar link"
              >
                {copied
                  ? <Check className="h-4 w-4" style={{ color: "#34d399" }} />
                  : <Copy className="h-4 w-4" style={{ color: "#93c5fd" }} />
                }
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onEdit(event)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
            <Button variant="destructive" size="icon" className="rounded-xl" onClick={() => onDelete(event.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
