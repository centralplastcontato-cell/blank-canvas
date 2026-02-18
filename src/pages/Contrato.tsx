import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

import { FileSignature, Plus, Loader2, Pencil, Copy, Trash2, Link2, Eye, MessageSquareText, User, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContratoQuestion {
  id: string;
  type: "text" | "yesno" | "select" | "textarea" | "date";
  text: string;
  step: number;
  required?: boolean;
  options?: string[];
}

interface ContratoTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  questions: ContratoQuestion[];
  thank_you_message: string | null;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_QUESTIONS: ContratoQuestion[] = [
  { id: "ct1", type: "text", text: "Nome completo", step: 1, required: true },
  { id: "ct2", type: "text", text: "CPF", step: 1, required: true },
  { id: "ct3", type: "text", text: "RG", step: 1, required: true },
  { id: "ct4", type: "date", text: "Data de nascimento", step: 1, required: true },
  { id: "ct5", type: "text", text: "CEP", step: 2, required: true },
  { id: "ct6", type: "text", text: "Número (endereço)", step: 2, required: true },
  { id: "ct7", type: "text", text: "E-mail", step: 2, required: true },
  { id: "ct8", type: "text", text: "Nome do aniversariante", step: 3, required: true },
  { id: "ct9", type: "date", text: "Data de nascimento do aniversariante", step: 3, required: true },
  { id: "ct10", type: "text", text: "Nome dos pais", step: 3, required: true },
  { id: "ct11", type: "text", text: "Telefone dos pais", step: 3, required: true },
  { id: "ct12", type: "date", text: "Data da festa", step: 4, required: true },
  { id: "ct13", type: "text", text: "Horário da festa", step: 4, required: true },
  { id: "ct14", type: "text", text: "Pacote escolhido", step: 4, required: true },
  { id: "ct15", type: "text", text: "Quantidade de convidados", step: 4, required: true },
  { id: "ct16", type: "text", text: "Forma de pagamento", step: 4, required: true },
];

function ResponseCards({ responses, template }: { responses: any[]; template: ContratoTemplate | null }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {responses.map((r) => {
        const isOpen = openId === r.id;
        const answersArr = Array.isArray(r.answers) ? r.answers : [];
        return (
          <div key={r.id}>
            <button
              onClick={() => setOpenId(isOpen ? null : r.id)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <User className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-sm truncate">{r.respondent_name || "Anônimo"}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(r.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </div>
            </button>
            {isOpen && (
              <Card className="mt-1 bg-card border-border overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                    <span className="font-semibold text-sm">{r.respondent_name || "Anônimo"}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {answersArr.map((a: any, idx: number) => {
                      const question = template?.questions.find(q => q.id === a.questionId);
                      let displayValue = a.value;
                      if (a.value === true) displayValue = "👍 Sim";
                      else if (a.value === false) displayValue = "👎 Não";
                      else if (typeof a.value === "object" && a.value !== null && "parent1" in a.value) {
                        displayValue = [a.value.parent1, a.value.parent2].filter(Boolean).join(" | ");
                      } else if (typeof a.value === "string" && a.value.match(/^\d{4}-\d{2}-\d{2}/)) {
                        try { displayValue = format(new Date(a.value), "dd/MM/yyyy", { locale: ptBR }); } catch {}
                      }
                      return (
                        <div key={idx} className="px-4 py-2.5">
                          <p className="text-muted-foreground text-xs mb-0.5">{question?.text || a.questionId}</p>
                          <p className="font-medium text-sm">{String(displayValue || "—")}</p>
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

export function ContratoContent() {
  const { currentCompany } = useCompany();
  const [templates, setTemplates] = useState<ContratoTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContratoTemplate | null>(null);

  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [selectedTemplateForResponses, setSelectedTemplateForResponses] = useState<ContratoTemplate | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formThankYou, setFormThankYou] = useState("Obrigado por preencher! 🎉 Seus dados foram enviados com sucesso.");
  const [formQuestions, setFormQuestions] = useState<ContratoQuestion[]>(DEFAULT_QUESTIONS);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("contrato_templates" as any)
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("created_at", { ascending: false });
    if (!error && data) setTemplates((data as any[]).map((t: any) => ({ ...t, questions: t.questions as ContratoQuestion[] })));
    setLoading(false);

    const { data: countData } = await supabase
      .from("contrato_responses" as any)
      .select("template_id")
      .eq("company_id", currentCompany.id);
    if (countData) {
      const counts: Record<string, number> = {};
      (countData as any[]).forEach((r: any) => { counts[r.template_id] = (counts[r.template_id] || 0) + 1; });
      setResponseCounts(counts);
    }
  };

  const toggleResponses = async (t: ContratoTemplate) => {
    if (expandedTemplateId === t.id) { setExpandedTemplateId(null); return; }
    setExpandedTemplateId(t.id);
    setSelectedTemplateForResponses(t);
    setLoadingResponses(true);
    const { data } = await supabase
      .from("contrato_responses" as any)
      .select("*")
      .eq("template_id", t.id)
      .order("created_at", { ascending: false });
    setResponses((data as any[]) || []);
    setLoadingResponses(false);
  };

  useEffect(() => { fetchTemplates(); }, [currentCompany?.id]);

  const openNew = () => {
    setEditingTemplate(null);
    setFormName("Formulário de Contrato");
    setFormDescription("Preencha os dados para a elaboração do contrato da sua festa!");
    setFormThankYou("Obrigado por preencher! 🎉 Seus dados foram enviados com sucesso.");
    setFormQuestions([...DEFAULT_QUESTIONS]);
    setDialogOpen(true);
  };

  const openEdit = (t: ContratoTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormDescription(t.description || "");
    setFormThankYou(t.thank_you_message || "");
    setFormQuestions([...(t.questions || [])]);
    setDialogOpen(true);
  };

  const handleDuplicate = async (t: ContratoTemplate) => {
    if (!currentCompany?.id) return;
    const newName = `${t.name} (cópia)`;
    const { error } = await supabase.from("contrato_templates" as any).insert({
      company_id: currentCompany.id,
      name: newName,
      slug: generateSlug(newName),
      description: t.description,
      questions: t.questions as any,
      thank_you_message: t.thank_you_message,
    } as any);
    if (error) { toast({ title: "Erro ao duplicar", variant: "destructive" }); return; }
    toast({ title: "Template duplicado!" });
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("contrato_templates" as any).delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", variant: "destructive" }); return; }
    toast({ title: "Template excluído" });
    if (expandedTemplateId === id) setExpandedTemplateId(null);
    fetchTemplates();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("contrato_templates" as any).update({ is_active: active } as any).eq("id", id);
    fetchTemplates();
  };

  const handleSave = async () => {
    if (!currentCompany?.id || !formName.trim()) return;
    setSaving(true);
    const slug = generateSlug(formName.trim());
    const payload = {
      company_id: currentCompany.id,
      name: formName.trim(),
      description: formDescription.trim() || null,
      questions: formQuestions as any,
      thank_you_message: formThankYou.trim() || null,
      slug,
    };

    if (editingTemplate) {
      const { error } = await supabase.from("contrato_templates" as any).update(payload as any).eq("id", editingTemplate.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Template atualizado!" });
    } else {
      const { error } = await supabase.from("contrato_templates" as any).insert(payload as any);
      if (error) { toast({ title: "Erro ao criar", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Template criado!" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchTemplates();
  };

  const addQuestion = () => {
    const maxStep = Math.max(...formQuestions.map(q => q.step), 1);
    setFormQuestions([...formQuestions, { id: `ct${Date.now()}`, type: "text", text: "", step: maxStep, required: false }]);
  };

  const updateQuestion = (idx: number, updates: Partial<ContratoQuestion>) => {
    setFormQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...updates } : q));
  };

  const removeQuestion = (idx: number) => {
    setFormQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const getTemplateUrl = (t: ContratoTemplate & { slug?: string | null }) => {
    const companySlug = currentCompany?.slug;
    if (companySlug && t.slug) return `/contrato/${companySlug}/${t.slug}`;
    return `/contrato/${t.id}`;
  };

  const copyLink = (t: ContratoTemplate & { slug?: string | null }) => {
    const domain = currentCompany?.custom_domain || '';
    const path = getTemplateUrl(t);
    const fullUrl = domain ? `${domain}${path}` : `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link copiado!" });
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground hidden md:block">Crie formulários para o cliente preencher os dados do contrato</p>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Template</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : templates.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center space-y-3">
              <FileSignature className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Nenhum template de contrato criado ainda.</p>
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
                            {(t.questions || []).length} perguntas · {Math.max(...(t.questions || []).map(q => q.step), 1)} etapas
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
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive ml-auto"><Trash2 className="h-3.5 w-3.5" /> Excluir</Button>
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
                        <div className="border-t border-border pt-4 mt-1 space-y-2">
                          {loadingResponses ? (
                            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                          ) : responses.length === 0 ? (
                            <div className="text-center py-6 space-y-2">
                              <MessageSquareText className="h-8 w-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">Nenhuma resposta recebida ainda.</p>
                            </div>
                          ) : (
                            <ResponseCards responses={responses} template={selectedTemplateForResponses} />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template de Contrato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label>Nome do template</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Formulário de Contrato" />
              </div>
              <div>
                <Label>Descrição (aparece no topo do formulário)</Label>
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Ex: Preencha os dados para o contrato" />
              </div>
              <div>
                <Label>Mensagem de agradecimento (final)</Label>
                <Input value={formThankYou} onChange={(e) => setFormThankYou(e.target.value)} placeholder="Obrigado por preencher! 🎉" />
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
                        <Input value={q.text} onChange={(e) => updateQuestion(idx, { text: e.target.value })} placeholder="Texto da pergunta..." className="text-sm" />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select value={q.type} onValueChange={(v) => updateQuestion(idx, { type: v as any })}>
                            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto curto</SelectItem>
                              <SelectItem value="textarea">Texto longo</SelectItem>
                              <SelectItem value="yesno">Sim / Não</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={String(q.step)} onValueChange={(v) => updateQuestion(idx, { step: parseInt(v) })}>
                            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
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

export default function Contrato() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/formularios?tab=contrato", { replace: true });
  }, [navigate]);
  return null;
}
