import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, ClipboardList, UtensilsCrossed, Star, CheckCircle2, Clock, Eye, Loader2,
  User, MapPin, Phone, Mail, Calendar, Users, Baby, CreditCard, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface FormStatus {
  type: string;
  label: string;
  icon: React.ElementType;
  sent: boolean;
  hasResponse: boolean;
  responseCount: number;
  responses: Array<{ id: string; answers: any; respondent_name: string | null; created_at: string }>;
}

interface EventFormsStatusPanelProps {
  eventId: string;
  companyId: string;
  leadId?: string | null;
}

const FORM_TYPES = [
  { type: "prefesta", label: "Pré-Festa", icon: ClipboardList, responseTable: "prefesta_responses" },
  { type: "cardapio", label: "Cardápio", icon: UtensilsCrossed, responseTable: "cardapio_responses" },
  { type: "contrato", label: "Dados Complementares", icon: FileText, responseTable: "contrato_responses" },
  { type: "avaliacao", label: "Avaliação", icon: Star, responseTable: "evaluation_responses" },
];

const FIELD_LABELS: Record<string, string> = {
  nome: "Nome", name: "Nome", email: "E-mail", cpf: "CPF", rg: "RG",
  cep: "CEP", endereco: "Endereço", address: "Endereço", numero: "Número",
  complemento: "Complemento", bairro: "Bairro", cidade: "Cidade", city: "Cidade",
  estado: "Estado", state: "Estado", nascimento: "Nascimento", birthdate: "Nascimento",
  phone: "Telefone", telefone: "Telefone", whatsapp: "WhatsApp",
  responsaveis: "Responsáveis", birthday_children: "Aniversariante(s)",
  relation: "Parentesco", age: "Idade", pix_type: "Tipo PIX", pix_key: "Chave PIX",
};

const HIDDEN_FIELDS = new Set(["id", "event_id", "company_id", "template_id", "lead_id", "token", "status"]);

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return value;
}

function ResponsaveisCard({ data }: { data: any[] }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Users className="h-3.5 w-3.5 text-primary" />
        Responsáveis
      </div>
      <div className="grid gap-2">
        {data.map((resp, idx) => (
          <div key={idx} className="rounded-lg bg-muted/40 border border-border/30 p-2.5 space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{resp.name || "—"}</span>
              {resp.relation && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">{resp.relation}</Badge>
              )}
            </div>
            {resp.phone && (
              <div className="flex items-center gap-2 pl-5">
                <Phone className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{resp.phone}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BirthdayChildrenCard({ data }: { data: any[] }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Baby className="h-3.5 w-3.5 text-primary" />
        Aniversariante(s)
      </div>
      <div className="grid gap-2">
        {data.map((child, idx) => (
          <div key={idx} className="rounded-lg bg-primary/5 border border-primary/15 p-2.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">{child.name || "—"}</span>
              {child.age && (
                <Badge className="text-[9px] px-1.5 py-0 bg-primary/15 text-primary border-0">
                  {child.age} anos
                </Badge>
              )}
            </div>
            {child.birthdate && (
              <div className="flex items-center gap-2 pl-0">
                <Calendar className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{formatDate(child.birthdate)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getFieldIcon(key: string) {
  const k = key.toLowerCase();
  if (k === "email") return Mail;
  if (k === "cpf" || k === "rg") return CreditCard;
  if (k === "cep" || k === "endereco" || k === "bairro" || k === "cidade" || k === "estado" || k === "numero" || k === "complemento") return MapPin;
  if (k === "nascimento" || k === "birthdate") return Calendar;
  if (k === "phone" || k === "telefone" || k === "whatsapp") return Phone;
  if (k === "nome" || k === "name") return User;
  return Hash;
}

function FormattedResponseView({ answers, formType }: { answers: any; formType: string }) {
  if (!answers || typeof answers !== "object") {
    return <span className="text-xs text-muted-foreground italic">Sem dados</span>;
  }

  // For contrato (client data), render structured view
  if (formType === "contrato" && !Array.isArray(answers)) {
    const simpleFields: [string, any][] = [];
    let responsaveis: any[] = [];
    let birthdayChildren: any[] = [];

    Object.entries(answers).forEach(([key, value]) => {
      if (HIDDEN_FIELDS.has(key)) return;
      if (key === "responsaveis") {
        responsaveis = Array.isArray(value) ? value : typeof value === "string" ? tryParseJSON(value) : [];
      } else if (key === "birthday_children") {
        birthdayChildren = Array.isArray(value) ? value : typeof value === "string" ? tryParseJSON(value) : [];
      } else {
        simpleFields.push([key, value]);
      }
    });

    // Group address fields
    const addressFields = new Set(["cep", "endereco", "numero", "complemento", "bairro", "cidade", "estado"]);
    const personalFields = simpleFields.filter(([k]) => !addressFields.has(k));
    const addrFields = simpleFields.filter(([k]) => addressFields.has(k));

    return (
      <div className="space-y-4">
        {/* Personal info */}
        {personalFields.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dados Pessoais</p>
            <div className="grid gap-1">
              {personalFields.map(([key, value]) => (
                <FieldRow key={key} fieldKey={key} value={value} />
              ))}
            </div>
          </div>
        )}

        {/* Address */}
        {addrFields.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Endereço</p>
              <div className="grid gap-1">
                {addrFields.map(([key, value]) => (
                  <FieldRow key={key} fieldKey={key} value={value} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Responsáveis */}
        {responsaveis.length > 0 && (
          <>
            <Separator />
            <ResponsaveisCard data={responsaveis} />
          </>
        )}

        {/* Birthday Children */}
        {birthdayChildren.length > 0 && (
          <>
            <Separator />
            <BirthdayChildrenCard data={birthdayChildren} />
          </>
        )}
      </div>
    );
  }

  // For cardápio responses (sections-based)
  if (formType === "cardapio" && !Array.isArray(answers)) {
    return (
      <div className="space-y-2">
        {Object.entries(answers).map(([sectionName, items]) => (
          <div key={sectionName} className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{sectionName}</p>
            {Array.isArray(items) ? (
              <div className="flex flex-wrap gap-1.5">
                {(items as string[]).map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] font-normal">{item}</Badge>
                ))}
              </div>
            ) : (
              <span className="text-xs text-foreground">{String(items)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Generic rendering for prefesta / avaliação
  if (Array.isArray(answers)) {
    return (
      <div className="space-y-2">
        {answers.map((item: any, idx: number) => (
          <div key={idx} className="rounded-lg bg-muted/30 border border-border/30 p-2.5">
            {typeof item === "object" && item !== null ? (
              <div className="space-y-1">
                {Object.entries(item).filter(([k]) => !HIDDEN_FIELDS.has(k)).map(([k, v]) => (
                  <FieldRow key={k} fieldKey={k} value={v} />
                ))}
              </div>
            ) : (
              <span className="text-xs text-foreground">{String(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Object with flat key-value
  return (
    <div className="space-y-1">
      {Object.entries(answers).filter(([k]) => !HIDDEN_FIELDS.has(k)).map(([key, value]) => {
        if (Array.isArray(value)) {
          return (
            <div key={key} className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{getFieldLabel(key)}</p>
              {value.map((item, i) => (
                <div key={i} className="rounded bg-muted/30 p-2 text-xs">
                  {typeof item === "object" ? Object.entries(item).map(([ik, iv]) => (
                    <FieldRow key={ik} fieldKey={ik} value={iv} />
                  )) : String(item)}
                </div>
              ))}
            </div>
          );
        }
        return <FieldRow key={key} fieldKey={key} value={value} />;
      })}
    </div>
  );
}

function FieldRow({ fieldKey, value }: { fieldKey: string; value: any }) {
  const Icon = getFieldIcon(fieldKey);
  const displayValue = value == null || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value) : formatDate(String(value));

  return (
    <div className="flex items-start gap-2 py-0.5">
      <Icon className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
      <span className="text-[11px] text-muted-foreground min-w-[90px] shrink-0">{getFieldLabel(fieldKey)}</span>
      <span className="text-[11px] text-foreground font-medium break-all">{displayValue}</span>
    </div>
  );
}

function tryParseJSON(str: string): any[] {
  try { const p = JSON.parse(str); return Array.isArray(p) ? p : []; } catch { return []; }
}

export function EventFormsStatusPanel({ eventId, companyId, leadId }: EventFormsStatusPanelProps) {
  const [formStatuses, setFormStatuses] = useState<FormStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingResponses, setViewingResponses] = useState<FormStatus | null>(null);

  const fetchStatuses = useCallback(async () => {
    if (!eventId || !companyId) return;
    setLoading(true);

    try {
      const { data: historyData } = await supabase
        .from("lead_history")
        .select("details")
        .eq("action", "form_sent_whatsapp")
        .contains("details", JSON.stringify({ event_id: eventId }));

      const sentTypes = new Set<string>();
      (historyData || []).forEach((row: any) => {
        const d = typeof row.details === "string" ? JSON.parse(row.details) : row.details;
        if (d?.form_type) sentTypes.add(d.form_type);
      });

      const statuses: FormStatus[] = [];

      for (const ft of FORM_TYPES) {
        let responses: any[] = [];

        if (ft.responseTable === "prefesta_responses" || ft.responseTable === "evaluation_responses") {
          const { data } = await (supabase as any)
            .from(ft.responseTable)
            .select("id, answers, respondent_name, created_at")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });
          responses = data || [];
        } else if (ft.responseTable === "cardapio_responses") {
          const { data } = await supabase
            .from("cardapio_responses")
            .select("id, answers, respondent_name, created_at")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });
          responses = data || [];
        } else if (ft.responseTable === "contrato_responses") {
          const { data } = await (supabase as any)
            .from("client_data_requests")
            .select("id, client_data, completed_at, created_at, status")
            .eq("event_id", eventId)
            .eq("status", "completed")
            .order("created_at", { ascending: false });
          responses = (data || []).map((d: any) => ({
            id: d.id,
            answers: d.client_data,
            respondent_name: null,
            created_at: d.completed_at || d.created_at,
          }));
        }

        statuses.push({
          type: ft.type,
          label: ft.label,
          icon: ft.icon,
          sent: sentTypes.has(ft.type),
          hasResponse: responses.length > 0,
          responseCount: responses.length,
          responses,
        });
      }

      setFormStatuses(statuses);
    } finally {
      setLoading(false);
    }
  }, [eventId, companyId]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Formulários</p>
        </div>
        <div className="p-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Formulários</p>
        </div>
        <div className="p-3 space-y-1.5">
          {formStatuses.map((fs) => {
            const Icon = fs.icon;
            return (
              <div key={fs.type} className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  fs.hasResponse ? "bg-emerald-500/15" : fs.sent ? "bg-amber-500/15" : "bg-muted"
                )}>
                  <Icon className={cn(
                    "h-3.5 w-3.5",
                    fs.hasResponse ? "text-emerald-600" : fs.sent ? "text-amber-600" : "text-muted-foreground"
                  )} />
                </div>
                <span className="text-xs font-medium flex-1 text-foreground">{fs.label}</span>
                
                {fs.hasResponse ? (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-700 border-emerald-300 gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Respondido
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-primary hover:text-primary/80"
                      onClick={() => setViewingResponses(fs)}
                      title="Ver respostas"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : fs.sent ? (
                  <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-700 border-amber-300 gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    Enviado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] text-muted-foreground gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    Pendente
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Response Viewer Dialog */}
      <Dialog open={!!viewingResponses} onOpenChange={(o) => !o && setViewingResponses(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {viewingResponses && <viewingResponses.icon className="h-4 w-4 text-primary" />}
              Respostas — {viewingResponses?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewingResponses?.responses.map((resp) => (
              <div key={resp.id} className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  {resp.respondent_name && (
                    <span className="text-xs font-semibold text-foreground">{resp.respondent_name}</span>
                  )}
                  <Badge variant="outline" className="text-[9px] font-normal">
                    {format(new Date(resp.created_at), "dd/MM/yyyy 'às' HH:mm")}
                  </Badge>
                </div>
                <FormattedResponseView answers={resp.answers} formType={viewingResponses.type} />
              </div>
            ))}
            {viewingResponses?.responses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma resposta encontrada.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
