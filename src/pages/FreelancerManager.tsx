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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { HardHat, Plus, Loader2, Pencil, Copy, Trash2, Link2, Eye, MessageSquareText, User, ChevronDown, ChevronRight, MessageCircle, ShieldAlert } from "lucide-react";
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
      const { data: instance } = await supabase
        .from("wapi_instances")
        .select("instance_id, instance_token")
        .eq("company_id", companyId)
        .eq("status", "connected")
        .limit(1)
        .maybeSingle();
      if (!instance) {
        toast({ title: "WhatsApp não conectado", description: "Conecte uma instância antes de enviar.", variant: "destructive" });
        return;
      }
      const name = r.respondent_name || "freelancer";
      const message = `Olá ${name}! 📸\n\nPrecisamos da sua foto para completar seu cadastro na equipe. Pode nos enviar uma foto sua por aqui?\n\nObrigado!`;
      const { error } = await supabase.functions.invoke("wapi-send", {
        body: { action: "send-text", phone, message, instanceId: instance.instance_id, instanceToken: instance.instance_token },
      });
      if (error) throw error;
      toast({ title: "Solicitação enviada!", description: `Mensagem enviada para ${name}.` });
    } catch (err: any) {
      console.error("Error requesting photo:", err);
      toast({ title: "Erro ao enviar", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSendingPhotoRequest(null);
    }
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
      {responses.map((r) => {
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
                  <span className="font-semibold text-sm truncate block">
                    {r.respondent_name || "Sem nome"}
                    <FreelancerAvgBadge freelancerName={r.respondent_name || ""} companyId={companyId} />
                  </span>
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
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                    <span className="font-semibold text-sm">{r.respondent_name || "Sem nome"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => requestDelete(r.id)}
                          disabled={deletingId === r.id}
                        >
                          {deletingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
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
                      <div className="flex items-center gap-2 flex-wrap border-t border-border/50 pt-3">
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => copyLink(t)}>
                          <Link2 className="h-3.5 w-3.5" /> Link
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => window.open(getTemplateUrl(t), "_blank")}>
                          <Eye className="h-3.5 w-3.5" /> Ver
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all">
                            <MessageSquareText className="h-3.5 w-3.5" /> Respostas {count > 0 && `(${count})`}
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </Button>
                        </CollapsibleTrigger>
                        {isAdmin && (
                          <>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => openEdit(t)}>
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => handleDuplicate(t)}>
                              <Copy className="h-3.5 w-3.5" /> Duplicar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs rounded-full px-3.5 ml-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all"
                              onClick={() => requestDeleteTemplate(t.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Excluir
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
                              onDeleted={() => selectedTemplate && toggleResponses(selectedTemplate)}
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
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template de Freelancer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label>Nome do formulário *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Cadastro de Freelancer" />
              </div>
              <div>
                <Label>Descrição (aparece no topo do formulário)</Label>
                <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Texto exibido no topo do formulário" rows={2} />
              </div>
              <div>
                <Label>Mensagem de agradecimento (final)</Label>
                <Input value={formThankYou} onChange={(e) => setFormThankYou(e.target.value)} placeholder="Obrigado pelo seu cadastro! 🎉" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Perguntas</Label>
                <Button variant="outline" size="sm" onClick={addQuestion}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</Button>
              </div>

              {formQuestions.map((q, idx) => (
                <Card key={q.id} className="bg-muted/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={q.text}
                          onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                          placeholder="Texto da pergunta..."
                          className="text-sm"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select value={q.type} onValueChange={(v) => updateQuestion(idx, { type: v as any, ...(["select", "multiselect"].includes(v) && !q.options?.length ? { options: ["Opção 1"] } : {}) })}>
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                                <SelectItem key={val} value={val}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={String(q.step)} onValueChange={(v) => updateQuestion(idx, { step: parseInt(v) })}>
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map(s => (
                                <SelectItem key={s} value={String(s)}>Etapa {s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <label className="flex items-center gap-1.5 text-xs">
                            <input type="checkbox" checked={q.required !== false} onChange={(e) => updateQuestion(idx, { required: e.target.checked })} className="rounded" />
                            Obrigatória
                          </label>
                        </div>
                        {(q.type === "select" || q.type === "multiselect") && (
                          <div className="space-y-1.5 pl-1">
                            <p className="text-xs text-muted-foreground">Opções (uma por linha):</p>
                            <Textarea
                              value={(q.options || []).join("\n")}
                              onChange={(e) => updateQuestion(idx, { options: e.target.value.split("\n") })}
                              onBlur={() => updateQuestion(idx, { options: (q.options || []).filter(o => o.trim()) })}
                              placeholder={"Opção 1\nOpção 2\nOpção 3"}
                              className="text-xs min-h-[60px]"
                              rows={3}
                            />
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeQuestion(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
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
