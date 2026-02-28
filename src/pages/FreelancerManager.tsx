import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { HardHat, Plus, Loader2, Pencil, Copy, Trash2, Link2, Eye, MessageSquareText, User, ChevronDown, ChevronRight, MessageCircle, ShieldAlert, Search, X, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FreelancerEvaluationHistory, FreelancerAvgBadge } from "@/components/freelancer/FreelancerEvaluationHistory";

interface FreelancerQuestion {
  id: string;
  type: "text" | "textarea" | "yesno" | "select" | "multiselect" | "photo" | "date";
  text: string;
  step: number;
  required?: boolean;
  options?: string[];
}

interface FreelancerTemplate {
  id: string;
  company_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  questions: FreelancerQuestion[];
  thank_you_message: string | null;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_QUESTIONS: FreelancerQuestion[] = [
  { id: "nome", type: "text", text: "Como você se chama?", step: 1, required: true },
  { id: "foto", type: "photo", text: "Foto", step: 1, required: true },
  { id: "data_nascimento", type: "date", text: "Data de nascimento", step: 1, required: true },
  { id: "telefone", type: "text", text: "Telefone", step: 1, required: true },
  { id: "endereco", type: "text", text: "Endereço", step: 1, required: true },
  { id: "ja_trabalha", type: "yesno", text: "Já trabalha no buffet?", step: 2, required: true },
  { id: "tempo_trabalho", type: "text", text: "Há quanto tempo?", step: 2 },
  { id: "pix_tipo", type: "select", text: "Tipo de chave PIX", step: 1, options: ["CPF", "CNPJ", "E-mail", "Telefone", "Chave aleatória"] },
  { id: "pix_chave", type: "text", text: "Chave PIX", step: 1 },
  { id: "funcao", type: "multiselect", text: "Qual é a sua função?", step: 2, required: true, options: ["Gerente", "Segurança", "Garçom", "Monitor", "Cozinha"] },
  { id: "sobre", type: "textarea", text: "Fale um pouco sobre você", step: 3 },
];

const generateSlug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Reusable password confirmation dialog
function PasswordConfirmDialog({
  open,
  onOpenChange,
  onConfirmed,
  title = "Confirmar exclusão",
  description = "Esta ação é irreversível. Digite sua senha para confirmar.",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirmed: () => void;
  title?: string;
  description?: string;
}) {
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!password.trim()) { setError("Digite sua senha"); return; }
    setChecking(true);
    setError("");
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("Usuário não identificado");
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError("Senha incorreta. Tente novamente."); setChecking(false); return; }
      onOpenChange(false);
      setPassword("");
      onConfirmed();
    } catch (e: any) {
      setError(e.message || "Erro ao verificar senha");
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setPassword(""); setError(""); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Sua senha de acesso</Label>
            <Input
              id="confirm-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Digite sua senha..."
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={checking || !password.trim()}>
            {checking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Exclusão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OptionChipsEditor({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
  const [newOption, setNewOption] = useState("");

  const addOption = () => {
    const val = newOption.trim();
    if (!val || options.includes(val)) return;
    onChange([...options, val]);
    setNewOption("");
  };

  const removeOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  return (
    <div className="rounded-lg border border-border/50 bg-muted/15 p-2.5 space-y-2">
      <p className="text-[10px] text-muted-foreground font-medium">Opções:</p>
      <div className="flex flex-wrap gap-1.5">
        {options.filter(o => o.trim()).map((opt, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
          >
            {opt}
            <button
              type="button"
              onClick={() => removeOption(idx)}
              className="h-4 w-4 rounded-full hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
          placeholder="Nova opção..."
          className="h-7 text-xs flex-1"
        />
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2.5 shrink-0" onClick={addOption} disabled={!newOption.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function ApprovalBadge({ status }: { status: string }) {
  if (status === "aprovado") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/20"><CheckCircle2 className="h-3 w-3" />Aprovado</span>;
  if (status === "rejeitado") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/15 text-destructive border border-destructive/20"><XCircle className="h-3 w-3" />Rejeitado</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 border border-amber-500/20"><Clock className="h-3 w-3" />Pendente</span>;
}

function EditFreelancerDialog({ open, onOpenChange, response, template, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  response: any;
  template: FreelancerTemplate | null;
  onSaved: () => void;
}) {
  const [answers, setAnswers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && response) {
      setAnswers(Array.isArray(response.answers) ? JSON.parse(JSON.stringify(response.answers)) : []);
    }
  }, [open, response]);

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers(prev => prev.map(a => a.questionId === questionId ? { ...a, value } : a));
  };

  const handleSave = async () => {
    setSaving(true);
    const respondentName = answers.find((a: any) => a.questionId === "nome")?.value || response.respondent_name;
    const pixType = answers.find((a: any) => a.questionId === "pix_tipo")?.value || null;
    const pixKey = answers.find((a: any) => a.questionId === "pix_chave")?.value || null;
    
    const { error } = await supabase
      .from("freelancer_responses")
      .update({ answers, respondent_name: respondentName, pix_type: pixType, pix_key: pixKey })
      .eq("id", response.id);
    
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cadastro atualizado!" });
      onOpenChange(false);
      onSaved();
    }
  };

  if (!template) return null;

  const formatDateDisplay = (val: string) => {
    if (!val) return "";
    // If it's yyyy-mm-dd, convert to dd/mm/yyyy
    const match = String(val).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return String(val);
  };

  const handleDateInput = (qId: string, display: string) => {
    // Allow typing in dd/mm/yyyy format
    const clean = display.replace(/\D/g, "").slice(0, 8);
    let formatted = clean;
    if (clean.length > 2) formatted = clean.slice(0, 2) + "/" + clean.slice(2);
    if (clean.length > 4) formatted = clean.slice(0, 2) + "/" + clean.slice(2, 4) + "/" + clean.slice(4);
    // If complete, store as yyyy-mm-dd
    if (clean.length === 8) {
      const iso = `${clean.slice(4)}-${clean.slice(2, 4)}-${clean.slice(0, 2)}`;
      updateAnswer(qId, iso);
    } else {
      updateAnswer(qId, formatted);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cadastro</DialogTitle>
          <DialogDescription>Corrija os dados do freelancer conforme necessário.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {template.questions.filter(q => q.type !== "photo").map((q) => {
            const answer = answers.find((a: any) => a.questionId === q.id);
            const value = answer?.value ?? "";
            return (
              <div key={q.id} className="rounded-xl border border-border p-4 space-y-2">
                <Label className="text-sm font-medium">{q.text}</Label>
                {q.type === "date" ? (
                  <Input
                    value={formatDateDisplay(String(value || ""))}
                    onChange={(e) => handleDateInput(q.id, e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className="text-sm"
                    maxLength={10}
                  />
                ) : q.type === "text" ? (
                  <Input value={String(value || "")} onChange={(e) => updateAnswer(q.id, e.target.value)} className="text-sm" />
                ) : q.type === "textarea" ? (
                  <Textarea value={String(value || "")} onChange={(e) => updateAnswer(q.id, e.target.value)} className="text-sm" rows={2} />
                ) : q.type === "yesno" ? (
                  <Select value={value === true ? "sim" : value === false ? "nao" : ""} onValueChange={(v) => updateAnswer(q.id, v === "sim")}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                ) : q.type === "select" ? (
                  <Select value={String(value || "")} onValueChange={(v) => updateAnswer(q.id, v)}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(q.options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : q.type === "multiselect" ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(q.options || []).map(opt => {
                      const selected = Array.isArray(value) && value.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            const arr = Array.isArray(value) ? [...value] : [];
                            updateAnswer(q.id, selected ? arr.filter(v => v !== opt) : [...arr, opt]);
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            selected ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// UnitSelectDialog: lets admin pick which WhatsApp instance to send from
function UnitSelectDialog({
  open,
  onOpenChange,
  instances,
  onSelect,
  title = "Enviar por qual unidade?",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  instances: { instance_id: string; unit: string | null; phone_number: string | null }[];
  onSelect: (instance: { instance_id: string; unit: string | null; phone_number: string | null }) => void;
  title?: string;
}) {
  const [sending, setSending] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Selecione a unidade que enviará a mensagem via WhatsApp.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {instances.map((inst) => (
            <button
              key={inst.instance_id}
              disabled={!!sending}
              onClick={async () => {
                setSending(inst.instance_id);
                await onSelect(inst);
                setSending(null);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors text-left disabled:opacity-50"
            >
              {sending === inst.instance_id ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
              ) : (
                <MessageCircle className="h-5 w-5 text-primary shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{inst.unit || "Sem nome"}</p>
                {inst.phone_number && (
                  <p className="text-xs text-muted-foreground">{inst.phone_number}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FreelancerResponseCards({ responses, template, companyId, onDeleted, isAdmin }: {
  responses: any[];
  template: FreelancerTemplate | null;
  companyId: string;
  onDeleted?: () => void;
  isAdmin: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [sendingPhotoRequest, setSendingPhotoRequest] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFuncao, setSelectedFuncao] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingResponse, setEditingResponse] = useState<any>(null);
  const [updatingApproval, setUpdatingApproval] = useState<string | null>(null);
  const PAGE_SIZE = 10;

  // Unit selection dialog state
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [connectedInstances, setConnectedInstances] = useState<{ instance_id: string; unit: string | null; phone_number: string | null }[]>([]);
  const [pendingUnitAction, setPendingUnitAction] = useState<{ type: "approval" | "photo"; response: any; phone: string; name: string } | null>(null);

  // Extract all unique functions from responses + template options
  const allFuncoes = Array.from(new Set([
    // From template options
    ...(template?.questions.find(q => q.id === "funcao")?.options || []),
    // From actual responses
    ...responses.flatMap((r) => {
      const answersArr = Array.isArray(r.answers) ? r.answers : [];
      const funcao = answersArr.find((a: any) => a.questionId === "funcao")?.value;
      return Array.isArray(funcao) ? funcao : funcao ? [String(funcao)] : [];
    }),
  ].filter(f => f && f.trim()))).sort();

  const filteredResponses = responses
    .filter((r) => {
      const name = (r.respondent_name || "").toLowerCase();
      const answersArr = Array.isArray(r.answers) ? r.answers : [];
      const funcao = answersArr.find((a: any) => a.questionId === "funcao")?.value;
      const funcaoArr: string[] = Array.isArray(funcao) ? funcao : funcao ? [String(funcao)] : [];

      const matchesName = !searchQuery.trim() || name.includes(searchQuery.toLowerCase().trim());
      const matchesFuncao = !selectedFuncao || funcaoArr.some(f => f.toLowerCase() === selectedFuncao.toLowerCase());

      return matchesName && matchesFuncao;
    })
    .sort((a, b) => (a.respondent_name || "").localeCompare(b.respondent_name || "", "pt-BR", { sensitivity: "base" }));

  const totalPages = Math.ceil(filteredResponses.length / PAGE_SIZE);
  const paginatedResponses = filteredResponses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleDeleteResponse = async (id: string) => {
    setDeletingId(id);
    try {
      await (supabase as any).from("freelancer_evaluations").delete().eq("freelancer_response_id", id);
      const { error } = await supabase.from("freelancer_responses").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Cadastro excluído com sucesso" });
      setOpenId(null);
      onDeleted?.();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setPasswordDialogOpen(true);
  };

  // Helper: fetch all connected instances for the company
  const fetchConnectedInstances = async () => {
    const { data } = await supabase
      .from("wapi_instances")
      .select("instance_id, unit, phone_number")
      .eq("company_id", companyId)
      .in("status", ["connected", "degraded"]);
    return (data || []) as { instance_id: string; unit: string | null; phone_number: string | null }[];
  };

  // Helper: send approval message via a specific instance
  const sendApprovalMessage = async (
    instance: { instance_id: string },
    phone: string,
    freelancerName: string,
  ) => {
    // Load custom message template (fallback to default)
    const { DEFAULT_FREELANCER_APPROVAL_MESSAGE } = await import("@/components/whatsapp/settings/FreelancerApprovalMessageCard");
    let messageTemplate = DEFAULT_FREELANCER_APPROVAL_MESSAGE;

    const { data: companyData } = await supabase
      .from("companies")
      .select("settings")
      .eq("id", companyId)
      .single();

    const settings = companyData?.settings as Record<string, any> | null;
    if (settings?.freelancer_approval_message) {
      messageTemplate = settings.freelancer_approval_message;
    }

    const message = messageTemplate.replace(/\{nome\}/g, freelancerName);

    await supabase.functions.invoke("wapi-send", {
      body: {
        action: "send-text",
        phone,
        message,
        instanceId: instance.instance_id,
      },
    });

    // Update conversation: tag as freelancer+equipe, disable bot
    const { data: convData } = await (supabase as any)
      .from("wapi_conversations")
      .select("id, lead_id")
      .eq("company_id", companyId)
      .eq("contact_phone", phone)
      .limit(1)
      .maybeSingle();

    if (convData) {
      await (supabase as any)
        .from("wapi_conversations")
        .update({ is_freelancer: true, is_equipe: true, bot_enabled: false, bot_step: null })
        .eq("id", convData.id);

      if (convData.lead_id) {
        await supabase
          .from("campaign_leads")
          .update({ status: "trabalhe_conosco" })
          .eq("id", convData.lead_id);
      }
    }

    toast({ title: "Freelancer aprovado! ✅", description: "Mensagem enviada via WhatsApp." });
  };

  // Helper: send photo request via a specific instance
  const sendPhotoRequest = async (
    instance: { instance_id: string },
    phone: string,
    name: string,
  ) => {
    const message = `Olá ${name}! 📸\n\nPrecisamos da sua foto para completar seu cadastro na equipe. Pode nos enviar uma foto sua por aqui?\n\nObrigado!`;
    const { error } = await supabase.functions.invoke("wapi-send", {
      body: { action: "send-text", phone, message, instanceId: instance.instance_id },
    });
    if (error) throw error;
    toast({ title: "Solicitação enviada!", description: `Mensagem enviada para ${name}.` });
  };

  // Resolves which instance to use (direct or via dialog)
  const resolveInstanceAndSend = async (
    actionType: "approval" | "photo",
    response: any,
    phone: string,
    name: string,
  ) => {
    const instances = await fetchConnectedInstances();

    if (instances.length === 0) {
      if (actionType === "approval") {
        toast({ title: "Freelancer aprovado! ✅", description: "WhatsApp não conectado — mensagem não enviada." });
      } else {
        toast({ title: "WhatsApp não conectado", description: "Conecte uma instância antes de enviar.", variant: "destructive" });
      }
      return;
    }

    if (instances.length === 1) {
      if (actionType === "approval") {
        await sendApprovalMessage(instances[0], phone, name);
      } else {
        await sendPhotoRequest(instances[0], phone, name);
      }
      return;
    }

    // 2+ instances: open dialog
    setConnectedInstances(instances);
    setPendingUnitAction({ type: actionType, response, phone, name });
    setUnitDialogOpen(true);
  };

  const handleUnitSelected = async (instance: { instance_id: string; unit: string | null; phone_number: string | null }) => {
    if (!pendingUnitAction) return;
    try {
      if (pendingUnitAction.type === "approval") {
        await sendApprovalMessage(instance, pendingUnitAction.phone, pendingUnitAction.name);
      } else {
        await sendPhotoRequest(instance, pendingUnitAction.phone, pendingUnitAction.name);
      }
    } catch (err: any) {
      console.error("Error sending via selected unit:", err);
      toast({ title: "Erro ao enviar", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setUnitDialogOpen(false);
      setPendingUnitAction(null);
      if (pendingUnitAction.type === "photo") setSendingPhotoRequest(null);
      if (pendingUnitAction.type === "approval") { setUpdatingApproval(null); onDeleted?.(); }
    }
  };

  const handleRequestPhoto = async (r: any) => {
    const answersArr = Array.isArray(r.answers) ? r.answers : [];
    const phoneRaw = answersArr.find((a: any) => a.questionId === "telefone")?.value;
    if (!phoneRaw) {
      toast({ title: "Sem telefone", description: "Este freelancer não tem telefone cadastrado.", variant: "destructive" });
      return;
    }
    const phone = String(phoneRaw).replace(/\D/g, "");
    if (phone.length < 10) {
      toast({ title: "Telefone inválido", variant: "destructive" });
      return;
    }
    setSendingPhotoRequest(r.id);
    try {
      await resolveInstanceAndSend("photo", r, phone, r.respondent_name || "freelancer");
    } catch (err: any) {
      console.error("Error requesting photo:", err);
      toast({ title: "Erro ao enviar", description: err.message || "Tente novamente.", variant: "destructive" });
      setSendingPhotoRequest(null);
    }
  };

  const handleApproval = async (response: any, status: "aprovado" | "rejeitado") => {
    const id = response.id;
    setUpdatingApproval(id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error, data: updatedData } = await supabase
      .from("freelancer_responses")
      .update({ approval_status: status, approved_by: user?.id, approved_at: new Date().toISOString() } as any)
      .eq("id", id)
      .select();
    
    if (error || !updatedData || updatedData.length === 0) {
      console.error("Update freelancer response failed:", error, "data:", updatedData);
      setUpdatingApproval(null);
      toast({ title: "Erro ao atualizar status", description: error?.message || "Sem permissão para atualizar", variant: "destructive" });
      return;
    }

    if (status === "aprovado") {
      try {
        const answersArr = Array.isArray(response.answers) ? response.answers : [];
        const phoneRaw = answersArr.find((a: any) => a.questionId === "telefone")?.value;
        const freelancerName = response.respondent_name || "freelancer";

        if (phoneRaw) {
          const phone = String(phoneRaw).replace(/\D/g, "");
          if (phone.length >= 10) {
            await resolveInstanceAndSend("approval", response, phone, freelancerName);
            // For direct send (0 or 1 instance), cleanup here; dialog path cleans up in handleUnitSelected
            if (!unitDialogOpen) { setUpdatingApproval(null); onDeleted?.(); }
            return;
          } else {
            toast({ title: "Freelancer aprovado! ✅", description: "Telefone inválido — mensagem não enviada." });
          }
        } else {
          toast({ title: "Freelancer aprovado! ✅", description: "Sem telefone cadastrado — mensagem não enviada." });
        }
      } catch (err: any) {
        console.error("Error in approval flow:", err);
        toast({ title: "Freelancer aprovado! ✅", description: "Erro ao enviar mensagem, mas aprovação foi salva." });
      }
    } else {
      toast({ title: "Freelancer rejeitado" });
    }

    setUpdatingApproval(null);
    onDeleted?.(); // refresh
  };

  return (
    <div className="space-y-2">
      <PasswordConfirmDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        title="Excluir cadastro de freelancer"
        description="Esta ação é irreversível e excluirá o cadastro permanentemente. Digite sua senha de acesso para confirmar."
        onConfirmed={() => { if (pendingDeleteId) handleDeleteResponse(pendingDeleteId); }}
      />
      <EditFreelancerDialog
        open={!!editingResponse}
        onOpenChange={(v) => { if (!v) setEditingResponse(null); }}
        response={editingResponse}
        template={template}
        onSaved={() => onDeleted?.()}
      />
      <UnitSelectDialog
        open={unitDialogOpen}
        onOpenChange={(v) => { if (!v) { setUnitDialogOpen(false); setPendingUnitAction(null); } }}
        instances={connectedInstances}
        onSelect={handleUnitSelected}
      />
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="pl-9 h-9 text-sm"
        />
      </div>
      {allFuncoes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={() => { setSelectedFuncao(null); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              !selectedFuncao
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/60"
            }`}
          >
            Todos
          </button>
          {allFuncoes.map((f) => (
            <button
              key={f}
              onClick={() => { setSelectedFuncao(selectedFuncao === f ? null : f); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedFuncao === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 text-muted-foreground border-border hover:bg-muted/60"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}
      {paginatedResponses.length === 0 && (searchQuery.trim() || selectedFuncao) && (
        <p className="text-center text-sm text-muted-foreground py-6">Nenhum resultado encontrado</p>
      )}
      {paginatedResponses.map((r) => {
        const isOpen = openId === r.id;
        const answersArr = Array.isArray(r.answers) ? r.answers : [];
        return (
          <div key={r.id}>
            <button
              onClick={() => setOpenId(isOpen ? null : r.id)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                {r.photo_url ? (
                  <img src={r.photo_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">
                      {r.respondent_name || "Sem nome"}
                    </span>
                    <FreelancerAvgBadge freelancerName={r.respondent_name || ""} companyId={companyId} />
                    <ApprovalBadge status={(r as any).approval_status || "pendente"} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(r.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`} />
            </button>
            {isOpen && (
              <Card className="mt-1 bg-card border-border overflow-hidden">
                <CardContent className="p-0">
                  <div className="px-4 py-2.5 bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm truncate">{r.respondent_name || "Sem nome"}</span>
                        <ApprovalBadge status={(r as any).approval_status || "pendente"} />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {(r as any).approval_status !== "aprovado" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                            onClick={() => handleApproval(r, "aprovado")}
                            disabled={updatingApproval === r.id}
                          >
                            {updatingApproval === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Aprovar
                          </Button>
                        )}
                        {(r as any).approval_status !== "rejeitado" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleApproval(r, "rejeitado")}
                            disabled={updatingApproval === r.id}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Rejeitar
                          </Button>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingResponse(r)}
                            title="Editar cadastro"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => requestDelete(r.id)}
                            disabled={deletingId === r.id}
                          >
                            {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  {r.photo_url ? (
                    <div className="px-4 py-3 flex justify-center bg-muted/10">
                      <img src={r.photo_url} alt="" className="h-24 w-24 rounded-full object-cover" />
                    </div>
                  ) : (
                    <div className="px-4 py-3 flex flex-col items-center gap-2 bg-muted/10">
                      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        disabled={sendingPhotoRequest === r.id}
                        onClick={() => handleRequestPhoto(r)}
                      >
                        {sendingPhotoRequest === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageCircle className="h-3.5 w-3.5" />
                        )}
                        Solicitar foto via WhatsApp
                      </Button>
                    </div>
                  )}
                  <div className="divide-y divide-border">
                    {answersArr.map((a: any, idx: number) => {
                      const question = template?.questions.find(q => q.id === a.questionId);
                      if (a.value === null || a.value === undefined) return null;
                      if (question?.type === "photo") return null;
                      let displayValue: string;
                      if (a.value === true) displayValue = "👍 Sim";
                      else if (a.value === false) displayValue = "👎 Não";
                      else if (Array.isArray(a.value)) displayValue = a.value.join(", ");
                      else displayValue = String(a.value || "—");
                      return (
                        <div key={idx} className="px-4 py-2.5">
                          <p className="text-muted-foreground text-xs mb-0.5">{question?.text || a.questionId}</p>
                          <p className="font-medium text-sm">{displayValue}</p>
                        </div>
                      );
                    })}
                  </div>
                  {r.respondent_name && (
                    <div className="px-4 py-3 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">⭐ Avaliações</p>
                      <FreelancerEvaluationHistory freelancerName={r.respondent_name} companyId={companyId} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        );
      })}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 px-1">
          <span className="text-xs text-muted-foreground">
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredResponses.length)} de {filteredResponses.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FreelancerManagerContent() {
  const { currentCompany, isCompanyAdmin } = useCompany();
  const isAdmin = isCompanyAdmin();
  const [templates, setTemplates] = useState<FreelancerTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FreelancerTemplate | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formThankYou, setFormThankYou] = useState("Obrigado pelo seu cadastro! 🎉");
  const [formQuestions, setFormQuestions] = useState<FreelancerQuestion[]>(DEFAULT_QUESTIONS);
  const [saving, setSaving] = useState(false);

  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FreelancerTemplate | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [templatePasswordDialogOpen, setTemplatePasswordDialogOpen] = useState(false);
  const [pendingDeleteTemplateId, setPendingDeleteTemplateId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("freelancer_templates")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("created_at", { ascending: false });
    if (data) setTemplates(data.map((t: any) => ({ ...t, questions: Array.isArray(t.questions) ? t.questions : [] })));
    setLoading(false);

    const { data: countData } = await supabase
      .from("freelancer_responses")
      .select("template_id")
      .eq("company_id", currentCompany.id);
    if (countData) {
      const counts: Record<string, number> = {};
      countData.forEach((r: any) => { counts[r.template_id] = (counts[r.template_id] || 0) + 1; });
      setResponseCounts(counts);
    }
  };

  const toggleResponses = async (t: FreelancerTemplate) => {
    if (expandedTemplateId === t.id) { setExpandedTemplateId(null); return; }
    setExpandedTemplateId(t.id);
    setSelectedTemplate(t);
    setLoadingResponses(true);
    const { data } = await supabase
      .from("freelancer_responses")
      .select("*")
      .eq("template_id", t.id)
      .order("created_at", { ascending: false });
    setResponses(data || []);
    setLoadingResponses(false);
  };

  const refreshResponses = async (t: FreelancerTemplate) => {
    setLoadingResponses(true);
    const { data } = await supabase
      .from("freelancer_responses")
      .select("*")
      .eq("template_id", t.id)
      .order("created_at", { ascending: false });
    setResponses(data || []);
    setLoadingResponses(false);
  };

  useEffect(() => { fetchTemplates(); }, [currentCompany?.id]);

  const openNew = () => {
    setEditingTemplate(null);
    setFormName("Cadastro de Freelancer");
    setFormDescription("Preencha seus dados para se cadastrar na nossa equipe!");
    setFormThankYou("Obrigado pelo seu cadastro! 🎉");
    setFormQuestions([...DEFAULT_QUESTIONS]);
    setDialogOpen(true);
  };

  const openEdit = (t: FreelancerTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormDescription(t.description || "");
    setFormThankYou(t.thank_you_message || "");
    setFormQuestions([...(t.questions.length > 0 ? t.questions : DEFAULT_QUESTIONS)]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentCompany?.id || !formName.trim()) return;
    setSaving(true);
    const slug = generateSlug(formName.trim());
    const payload = {
      company_id: currentCompany.id,
      name: formName.trim(),
      description: formDescription.trim() || null,
      thank_you_message: formThankYou.trim() || null,
      slug,
      questions: formQuestions as any,
    };
    if (editingTemplate) {
      const { error } = await supabase.from("freelancer_templates").update(payload).eq("id", editingTemplate.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Template atualizado!" });
    } else {
      const { error } = await supabase.from("freelancer_templates").insert(payload);
      if (error) { toast({ title: "Erro ao criar", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Template criado!" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchTemplates();
  };

  const handleDuplicate = async (t: FreelancerTemplate) => {
    if (!currentCompany?.id) return;
    const newName = `${t.name} (cópia)`;
    const { error } = await supabase.from("freelancer_templates").insert({
      company_id: currentCompany.id,
      name: newName,
      slug: generateSlug(newName),
      description: t.description,
      questions: t.questions as any,
      thank_you_message: t.thank_you_message,
    });
    if (error) { toast({ title: "Erro ao duplicar", variant: "destructive" }); return; }
    toast({ title: "Template duplicado!" });
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("freelancer_templates").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", variant: "destructive" }); return; }
    toast({ title: "Template excluído" });
    if (expandedTemplateId === id) setExpandedTemplateId(null);
    fetchTemplates();
  };

  const requestDeleteTemplate = (id: string) => {
    setPendingDeleteTemplateId(id);
    setTemplatePasswordDialogOpen(true);
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("freelancer_templates").update({ is_active: active }).eq("id", id);
    fetchTemplates();
  };

  const getTemplateUrl = (t: FreelancerTemplate) => {
    const companySlug = currentCompany?.slug;
    if (companySlug && t.slug) return `/freelancer/${companySlug}/${t.slug}`;
    return `/freelancer/${t.id}`;
  };

  const copyLink = (t: FreelancerTemplate) => {
    let domain: string;
    if (currentCompany?.custom_domain) {
      domain = currentCompany.custom_domain;
    } else {
      domain = window.location.origin;
    }
    const path = getTemplateUrl(t);
    const fullUrl = `${domain}${path}`;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link copiado!" });
  };

  const addQuestion = () => {
    const maxStep = Math.max(...formQuestions.map(q => q.step), 1);
    setFormQuestions([...formQuestions, {
      id: `fl${Date.now()}`,
      type: "text",
      text: "",
      step: maxStep,
      required: false,
    }]);
  };

  const updateQuestion = (idx: number, updates: Partial<FreelancerQuestion>) => {
    setFormQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...updates } : q));
  };

  const removeQuestion = (idx: number) => {
    setFormQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const TYPE_LABELS: Record<string, string> = {
    text: "Texto curto",
    textarea: "Texto longo",
    yesno: "Sim / Não",
    select: "Seleção única",
    multiselect: "Seleção múltipla",
    photo: "Foto",
    date: "Data",
  };

  return (
    <>
      <PasswordConfirmDialog
        open={templatePasswordDialogOpen}
        onOpenChange={setTemplatePasswordDialogOpen}
        title="Excluir template de freelancer"
        description="Esta ação é irreversível e excluirá o template e todas as respostas vinculadas. Digite sua senha de acesso para confirmar."
        onConfirmed={() => { if (pendingDeleteTemplateId) handleDelete(pendingDeleteTemplateId); }}
      />

      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground hidden md:block">Crie formulários de cadastro para freelancers</p>
          {isAdmin && (
            <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Template</Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : templates.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center space-y-3">
              <HardHat className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Nenhum template de freelancer criado ainda.</p>
              {isAdmin && <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Criar Primeiro Template</Button>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {templates.map((t) => {
              const isExpanded = expandedTemplateId === t.id;
              const count = responseCounts[t.id] || 0;
              return (
                <Collapsible key={t.id} open={isExpanded} onOpenChange={() => toggleResponses(t)}>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold truncate">{t.name}</h3>
                            <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs shrink-0">
                              {t.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          {t.description && <p className="text-sm text-muted-foreground line-clamp-1">{t.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {t.questions.length} perguntas · {Math.max(...t.questions.map(q => q.step), 1)} etapas
                            {(t as any).view_count > 0 && <> · <Eye className="h-3 w-3 inline-block mb-0.5" /> {(t as any).view_count} visualizações</>}
                          </p>
                        </div>
                        {isAdmin && (
                          <Switch checked={t.is_active} onCheckedChange={(v) => handleToggleActive(t.id, v)} className="shrink-0" />
                        )}
                      </div>
                      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 border-t border-border/50 pt-3">
                        <Button variant="outline" size="sm" className="h-8 gap-1 sm:gap-1.5 text-[11px] sm:text-xs rounded-full px-2.5 sm:px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => copyLink(t)}>
                          <Link2 className="h-3.5 w-3.5 shrink-0" /> Link
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1 sm:gap-1.5 text-[11px] sm:text-xs rounded-full px-2.5 sm:px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => window.open(getTemplateUrl(t), "_blank")}>
                          <Eye className="h-3.5 w-3.5 shrink-0" /> Ver
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1 sm:gap-1.5 text-[11px] sm:text-xs rounded-full px-2.5 sm:px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all">
                            <MessageSquareText className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Respostas{count > 0 ? ` (${count})` : ""}</span>
                            <ChevronDown className={`h-3 w-3 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                          </Button>
                        </CollapsibleTrigger>
                        {isAdmin && (
                          <>
                            <Button variant="outline" size="sm" className="h-8 gap-1 sm:gap-1.5 text-[11px] sm:text-xs rounded-full px-2.5 sm:px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => openEdit(t)}>
                              <Pencil className="h-3.5 w-3.5 shrink-0" /> Editar
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 gap-1 sm:gap-1.5 text-[11px] sm:text-xs rounded-full px-2.5 sm:px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => handleDuplicate(t)}>
                              <Copy className="h-3.5 w-3.5 shrink-0" /> Duplicar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 sm:gap-1.5 text-[11px] sm:text-xs rounded-full px-2.5 sm:px-3.5 col-span-3 sm:col-span-1 sm:ml-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all"
                              onClick={() => requestDeleteTemplate(t.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 shrink-0" /> Excluir
                            </Button>
                          </>
                        )}
                      </div>

                      <CollapsibleContent>
                        <div className="border-t border-border pt-4 mt-1">
                          {loadingResponses ? (
                            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                          ) : responses.length === 0 ? (
                            <div className="text-center py-6 space-y-2">
                              <MessageSquareText className="h-8 w-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">Nenhum cadastro recebido ainda.</p>
                            </div>
                          ) : (
                            <FreelancerResponseCards
                              responses={responses}
                              template={selectedTemplate}
                              companyId={currentCompany?.id || ""}
                              onDeleted={() => selectedTemplate && refreshResponses(selectedTemplate)}
                              isAdmin={isAdmin}
                            />
                          )}
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{editingTemplate ? "Editar Template" : "Novo Template de Freelancer"}</DialogTitle>
            <DialogDescription className="text-xs">Configure as informações e perguntas do formulário de cadastro.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* --- Informações gerais --- */}
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">Informações gerais</p>
              <div>
                <Label className="text-xs">Nome do formulário *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Cadastro de Freelancer" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Texto exibido no topo do formulário" rows={2} className="mt-1 resize-none" />
              </div>
              <div>
                <Label className="text-xs">Mensagem de agradecimento</Label>
                <Input value={formThankYou} onChange={(e) => setFormThankYou(e.target.value)} placeholder="Obrigado pelo seu cadastro! 🎉" className="mt-1" />
              </div>
            </div>

            {/* --- Perguntas --- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Perguntas</p>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 rounded-full px-3" onClick={addQuestion}>
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>

              <div className="space-y-2">
                {formQuestions.map((q, idx) => (
                  <div key={q.id} className="rounded-xl border border-border/60 bg-card p-3 space-y-2.5 shadow-sm">
                    <div className="flex items-start gap-2">
                      <Input
                        value={q.text}
                        onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                        placeholder="Texto da pergunta..."
                        className="text-sm font-medium border-0 bg-transparent px-0 h-8 shadow-none focus-visible:ring-0"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive shrink-0" onClick={() => removeQuestion(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={q.type} onValueChange={(v) => updateQuestion(idx, { type: v as any, ...(["select", "multiselect"].includes(v) && !q.options?.length ? { options: ["Opção 1"] } : {}) })}>
                        <SelectTrigger className="w-[130px] h-7 text-[11px] rounded-lg bg-muted/40 border-border/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={String(q.step)} onValueChange={(v) => updateQuestion(idx, { step: parseInt(v) })}>
                        <SelectTrigger className="w-[100px] h-7 text-[11px] rounded-lg bg-muted/40 border-border/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(s => (
                            <SelectItem key={s} value={String(s)}>Etapa {s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none ml-1">
                        <input type="checkbox" checked={q.required !== false} onChange={(e) => updateQuestion(idx, { required: e.target.checked })} className="rounded h-3.5 w-3.5 accent-primary" />
                        Obrigatória
                      </label>
                    </div>
                    {(q.type === "select" || q.type === "multiselect") && (
                      <OptionChipsEditor
                        options={q.options || []}
                        onChange={(newOptions) => updateQuestion(idx, { options: newOptions })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? "Salvar" : "Criar Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function FreelancerManager() {
  return null;
}
