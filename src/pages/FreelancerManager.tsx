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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { HardHat, Plus, Loader2, Pencil, Copy, Trash2, Link2, Eye, MessageSquareText, User, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FreelancerQuestion {
  id: string;
  type: "text" | "textarea" | "yesno" | "select" | "multiselect" | "photo";
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
  { id: "foto", type: "photo", text: "Foto (opcional)", step: 1 },
  { id: "telefone", type: "text", text: "Telefone", step: 1, required: true },
  { id: "endereco", type: "text", text: "Endereço", step: 1, required: true },
  { id: "ja_trabalha", type: "yesno", text: "Já trabalha no buffet?", step: 2, required: true },
  { id: "tempo_trabalho", type: "text", text: "Há quanto tempo?", step: 2 },
  { id: "funcao", type: "multiselect", text: "Qual é a sua função?", step: 2, required: true, options: ["Gerente", "Segurança", "Garçom", "Monitor", "Cozinha"] },
  { id: "sobre", type: "textarea", text: "Fale um pouco sobre você", step: 3 },
];

const generateSlug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function FreelancerResponseCards({ responses, template }: { responses: any[]; template: FreelancerTemplate | null }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {responses.map((r) => {
        const isOpen = openId === r.id;
        const answersArr = Array.isArray(r.answers) ? r.answers : [];
        const getAnswer = (key: string) => answersArr.find((a: any) => a.questionId === key)?.value;
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
                  <span className="font-semibold text-sm truncate block">{r.respondent_name || "Sem nome"}</span>
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
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {r.photo_url && (
                    <div className="px-4 py-3 flex justify-center bg-muted/10">
                      <img src={r.photo_url} alt="" className="h-24 w-24 rounded-full object-cover" />
                    </div>
                  )}
                  <div className="divide-y divide-border">
                    {answersArr.map((a: any, idx: number) => {
                      const question = template?.questions.find(q => q.id === a.questionId);
                      if (a.value === null || a.value === undefined) return null;
                      // Skip photo type (shown above)
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
  const { currentCompany } = useCompany();
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
    const domain = currentCompany?.custom_domain
      ? `https://${currentCompany.custom_domain}`
      : window.location.origin;
    const path = getTemplateUrl(t);
    const ogUrl = `https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/og-preview?domain=${encodeURIComponent(domain.replace(/^https?:\/\//, ''))}&path=${encodeURIComponent(path)}`;
    navigator.clipboard.writeText(ogUrl);
    toast({ title: "Link copiado!" });
  };

  // Question editor helpers
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
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground hidden md:block">Crie formulários de cadastro para freelancers</p>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Template</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : templates.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center space-y-3">
              <HardHat className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Nenhum template de freelancer criado ainda.</p>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Criar Primeiro Template</Button>
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
                          </p>
                        </div>
                        <Switch checked={t.is_active} onCheckedChange={(v) => handleToggleActive(t.id, v)} className="shrink-0" />
                      </div>
                      <div className="flex items-center gap-1 flex-wrap border-t border-border pt-2">
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => copyLink(t)}>
                          <Link2 className="h-3.5 w-3.5" /> Link
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => window.open(getTemplateUrl(t), "_blank")}>
                          <Eye className="h-3.5 w-3.5" /> Ver
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                            <MessageSquareText className="h-3.5 w-3.5" /> Respostas {count > 0 && `(${count})`}
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleDuplicate(t)}>
                          <Copy className="h-3.5 w-3.5" /> Duplicar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive ml-auto">
                              <Trash2 className="h-3.5 w-3.5" /> Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                              <AlertDialogDescription>Essa ação não pode ser desfeita. Todas as respostas vinculadas também serão excluídas.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
                            <FreelancerResponseCards responses={responses} template={selectedTemplate} />
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
                              onChange={(e) => updateQuestion(idx, { options: e.target.value.split("\n").filter(o => o.trim()) })}
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
