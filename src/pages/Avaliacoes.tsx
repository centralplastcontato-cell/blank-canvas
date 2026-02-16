import { useEffect, useState, useMemo } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ClipboardCheck, Plus, Loader2, Pencil, Copy, Trash2, Link2, Eye, MessageSquareText, Star, User, Calendar, BarChart3, ThumbsUp, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function EvalResponseCards({ responses, template }: { responses: any[]; template: EvaluationTemplate | null }) {
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
                {r.overall_score != null && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {Number(r.overall_score).toFixed(1)}
                  </span>
                )}
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
                  {r.overall_score != null && (
                    <div className="px-4 py-2 bg-primary/5 flex items-center gap-2 text-sm">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-medium">Nota geral: {Number(r.overall_score).toFixed(1)}</span>
                    </div>
                  )}
                  <div className="divide-y divide-border">
                    {answersArr.map((a: any, idx: number) => {
                      const question = template?.questions.find(q => q.id === a.questionId);
                      const renderValue = () => {
                        if (a.value === true) return "👍 Sim";
                        if (a.value === false) return "👎 Não";
                        if (question?.type === "stars" && typeof a.value === "number") return "⭐".repeat(a.value);
                        if (question?.type === "nps" && typeof a.value === "number") return `${a.value}/10`;
                        return String(a.value || "—");
                      };
                      return (
                        <div key={idx} className="px-4 py-2.5">
                          <p className="text-muted-foreground text-xs mb-0.5">{question?.text || a.questionId}</p>
                          <p className="font-medium text-sm">{renderValue()}</p>
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

interface EvaluationQuestion {
  id: string;
  type: "nps" | "text" | "stars" | "yesno";
  text: string;
  step: number;
  required?: boolean;
}

interface EvaluationTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  questions: EvaluationQuestion[];
  thank_you_message: string | null;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_QUESTIONS: EvaluationQuestion[] = [
  { id: "q1", type: "nps", text: "De 0 a 10, qual nota você dá para a experiência geral da festa?", step: 1, required: true },
  { id: "q2", type: "stars", text: "Como você avalia o atendimento da nossa equipe antes da festa (planejamento, contato, agilidade)?", step: 1, required: true },
  { id: "q3", type: "stars", text: "Como você avalia o atendimento da equipe durante a festa?", step: 1, required: true },
  { id: "q4", type: "stars", text: "Como você avalia a pontualidade e cumprimento dos horários?", step: 1, required: true },
  { id: "q5", type: "stars", text: "Como você avalia a limpeza e organização do espaço?", step: 2, required: true },
  { id: "q6", type: "stars", text: "Como você avalia a decoração e ambientação?", step: 2, required: true },
  { id: "q7", type: "stars", text: "Como você avalia a qualidade e variedade da alimentação servida?", step: 2, required: true },
  { id: "q8", type: "stars", text: "Como você avalia as bebidas oferecidas?", step: 2, required: true },
  { id: "q9", type: "stars", text: "Como você avalia as atividades e recreação para as crianças?", step: 2, required: true },
  { id: "q10", type: "stars", text: "O evento atendeu às suas expectativas em relação ao que foi contratado?", step: 3, required: true },
  { id: "q11", type: "yesno", text: "Você indicaria nosso buffet para amigos e familiares?", step: 3, required: true },
  { id: "q12", type: "yesno", text: "Você faria outra festa conosco?", step: 3, required: true },
  { id: "q13", type: "text", text: "O que mais te surpreendeu positivamente na festa?", step: 3 },
  { id: "q14", type: "text", text: "Teve algo que não atendeu suas expectativas? O quê?", step: 3 },
  { id: "q15", type: "text", text: "Tem alguma sugestão de melhoria para nós?", step: 3 },
];

export function AvaliacoesContent() {
  const { currentCompany } = useCompany();
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EvaluationTemplate | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formThankYou, setFormThankYou] = useState("Obrigado pela sua avaliação! 🎉");
  const [formQuestions, setFormQuestions] = useState<EvaluationQuestion[]>(DEFAULT_QUESTIONS);
  const [saving, setSaving] = useState(false);

  // Responses state - inline
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [selectedTemplateForResponses, setSelectedTemplateForResponses] = useState<EvaluationTemplate | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const fetchTemplates = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("evaluation_templates")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("created_at", { ascending: false });
    if (!error && data) setTemplates(data.map((t: any) => ({ ...t, questions: t.questions as EvaluationQuestion[] })));
    setLoading(false);

    const { data: countData } = await supabase
      .from("evaluation_responses")
      .select("template_id")
      .eq("company_id", currentCompany.id);
    if (countData) {
      const counts: Record<string, number> = {};
      countData.forEach((r: any) => { counts[r.template_id] = (counts[r.template_id] || 0) + 1; });
      setResponseCounts(counts);
    }
  };

  const toggleResponses = async (t: EvaluationTemplate) => {
    if (expandedTemplateId === t.id) {
      setExpandedTemplateId(null);
      return;
    }
    setExpandedTemplateId(t.id);
    setSelectedTemplateForResponses(t);
    setLoadingResponses(true);
    const { data } = await supabase
      .from("evaluation_responses")
      .select("*")
      .eq("template_id", t.id)
      .order("created_at", { ascending: false });
    setResponses(data || []);
    setLoadingResponses(false);
  };

  useEffect(() => { fetchTemplates(); }, [currentCompany?.id]);

  const openNew = () => {
    setEditingTemplate(null);
    setFormName("Avaliação Pós-Festa");
    setFormDescription("Queremos saber como foi a sua experiência!");
    setFormThankYou("Obrigado pela sua avaliação! 🎉");
    setFormQuestions([...DEFAULT_QUESTIONS]);
    setDialogOpen(true);
  };

  const openEdit = (t: EvaluationTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormDescription(t.description || "");
    setFormThankYou(t.thank_you_message || "");
    setFormQuestions([...(t.questions || [])]);
    setDialogOpen(true);
  };

  const handleDuplicate = async (t: EvaluationTemplate) => {
    if (!currentCompany?.id) return;
    const newName = `${t.name} (cópia)`;
    const { error } = await supabase.from("evaluation_templates").insert({
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
    const { error } = await supabase.from("evaluation_templates").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", variant: "destructive" }); return; }
    toast({ title: "Template excluído" });
    if (expandedTemplateId === id) setExpandedTemplateId(null);
    fetchTemplates();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("evaluation_templates").update({ is_active: active }).eq("id", id);
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
      const { error } = await supabase.from("evaluation_templates").update(payload).eq("id", editingTemplate.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Template atualizado!" });
    } else {
      const { error } = await supabase.from("evaluation_templates").insert(payload);
      if (error) { toast({ title: "Erro ao criar", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Template criado!" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchTemplates();
  };

  const addQuestion = () => {
    const maxStep = Math.max(...formQuestions.map(q => q.step), 1);
    setFormQuestions([...formQuestions, {
      id: `q${Date.now()}`,
      type: "stars",
      text: "",
      step: maxStep,
      required: false,
    }]);
  };

  const updateQuestion = (idx: number, updates: Partial<EvaluationQuestion>) => {
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

  const getTemplateUrl = (t: EvaluationTemplate & { slug?: string | null }) => {
    const companySlug = currentCompany?.slug;
    if (companySlug && t.slug) return `/avaliacao/${companySlug}/${t.slug}`;
    return `/avaliacao/${t.id}`;
  };

  const copyLink = (t: EvaluationTemplate & { slug?: string | null }) => {
    const domain = currentCompany?.custom_domain
      ? `https://${currentCompany.custom_domain}`
      : window.location.origin;
    const path = getTemplateUrl(t);
    const ogUrl = `https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/og-preview?domain=${encodeURIComponent(domain.replace(/^https?:\/\//, ''))}&path=${encodeURIComponent(path)}`;
    navigator.clipboard.writeText(ogUrl);
    toast({ title: "Link copiado!" });
  };

  // Compute metrics from responses
  const metrics = useMemo(() => {
    if (!responses.length || !selectedTemplateForResponses) return null;
    const questions = selectedTemplateForResponses.questions || [];
    
    const scores = responses.filter(r => r.overall_score != null).map(r => Number(r.overall_score));
    const avgOverall = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    const questionMetrics = questions
      .filter(q => q.type !== "text")
      .map(q => {
        const values: any[] = [];
        responses.forEach(r => {
          const arr = Array.isArray(r.answers) ? r.answers : [];
          const answer = arr.find((a: any) => a.questionId === q.id);
          if (answer && answer.value !== undefined && answer.value !== null && answer.value !== "") {
            values.push(answer.value);
          }
        });

        if (q.type === "nps" || q.type === "stars") {
          const nums = values.filter(v => typeof v === "number");
          const avg = nums.length ? nums.reduce((a: number, b: number) => a + b, 0) / nums.length : null;
          return { question: q, type: q.type, avg, count: nums.length, max: q.type === "nps" ? 10 : 5 };
        }
        if (q.type === "yesno") {
          const total = values.length;
          const yes = values.filter(v => v === true).length;
          return { question: q, type: "yesno" as const, yesPercent: total ? (yes / total) * 100 : 0, yes, total };
        }
        return null;
      })
      .filter(Boolean);

    return { avgOverall, total: responses.length, questionMetrics };
  }, [responses, selectedTemplateForResponses]);

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground hidden md:block">Crie formulários de avaliação para enviar aos anfitriões</p>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Template</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : templates.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center space-y-3">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Nenhum template de avaliação criado ainda.</p>
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

                      {/* Inline Responses */}
                      <CollapsibleContent>
                        <div className="border-t border-border pt-4 mt-1 space-y-4">
                          {loadingResponses ? (
                            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                          ) : responses.length === 0 ? (
                            <div className="text-center py-6 space-y-2">
                              <MessageSquareText className="h-8 w-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">Nenhuma resposta recebida ainda.</p>
                            </div>
                          ) : (
                            <Tabs defaultValue="metricas">
                              <TabsList className="w-full grid grid-cols-2">
                                <TabsTrigger value="metricas" className="gap-1.5">
                                  <BarChart3 className="h-3.5 w-3.5" /> Métricas
                                </TabsTrigger>
                                <TabsTrigger value="respostas" className="gap-1.5">
                                  <MessageSquareText className="h-3.5 w-3.5" /> Respostas ({responses.length})
                                </TabsTrigger>
                              </TabsList>

                              <TabsContent value="metricas" className="mt-3 space-y-3">
                                {metrics?.avgOverall != null && (
                                  <Card className="bg-primary/5 border-primary/20">
                                    <CardContent className="p-4 text-center space-y-1">
                                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Nota Geral Média</p>
                                      <p className="text-4xl font-bold text-primary">{metrics.avgOverall.toFixed(1)}</p>
                                      <p className="text-xs text-muted-foreground">{metrics.total} avaliações recebidas</p>
                                    </CardContent>
                                  </Card>
                                )}
                                <div className="space-y-2">
                                  {metrics?.questionMetrics.map((m: any, idx: number) => {
                                    if (!m) return null;
                                    if (m.type === "nps" || m.type === "stars") {
                                      const pct = m.avg != null ? (m.avg / m.max) * 100 : 0;
                                      return (
                                        <Card key={idx} className="bg-card border-border">
                                          <CardContent className="p-3 space-y-2">
                                            <p className="text-xs text-muted-foreground leading-snug">{m.question.text}</p>
                                            <div className="flex items-center gap-3">
                                              <Progress value={pct} className="flex-1 h-2" />
                                              <span className="text-sm font-semibold tabular-nums shrink-0">
                                                {m.avg != null ? m.avg.toFixed(1) : "—"}/{m.max}
                                              </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">{m.count} respostas</p>
                                          </CardContent>
                                        </Card>
                                      );
                                    }
                                    if (m.type === "yesno") {
                                      return (
                                        <Card key={idx} className="bg-card border-border">
                                          <CardContent className="p-3 space-y-2">
                                            <p className="text-xs text-muted-foreground leading-snug">{m.question.text}</p>
                                            <div className="flex items-center gap-3">
                                              <Progress value={m.yesPercent} className="flex-1 h-2" />
                                              <div className="flex items-center gap-1 shrink-0">
                                                <ThumbsUp className="h-3.5 w-3.5 text-primary" />
                                                <span className="text-sm font-semibold tabular-nums">{m.yesPercent.toFixed(0)}%</span>
                                              </div>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">{m.yes} de {m.total} disseram sim</p>
                                          </CardContent>
                                        </Card>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              </TabsContent>

                              <TabsContent value="respostas" className="mt-3 space-y-2">
                                <EvalResponseCards responses={responses} template={selectedTemplateForResponses} />
                              </TabsContent>
                            </Tabs>
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
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template de Avaliação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label>Nome do template</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Avaliação Pós-Festa" />
              </div>
              <div>
                <Label>Descrição (aparece no topo do formulário)</Label>
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Ex: Queremos saber como foi a sua experiência!" />
              </div>
              <div>
                <Label>Mensagem de agradecimento (final)</Label>
                <Input value={formThankYou} onChange={(e) => setFormThankYou(e.target.value)} placeholder="Obrigado pela sua avaliação! 🎉" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Perguntas</Label>
                <Button variant="outline" size="sm" onClick={addQuestion}><Plus className="h-3 w-3 mr-1" /> Pergunta</Button>
              </div>
              {formQuestions.map((q, idx) => (
                <Card key={q.id} className="bg-muted/50 border-border">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground font-mono mt-2 shrink-0">#{idx + 1}</span>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={q.text}
                          onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                          placeholder="Texto da pergunta..."
                          className="text-sm"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select value={q.type} onValueChange={(v) => updateQuestion(idx, { type: v as EvaluationQuestion["type"] })}>
                            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nps">Nota (0-10)</SelectItem>
                              <SelectItem value="stars">Estrelas (1-5)</SelectItem>
                              <SelectItem value="text">Texto livre</SelectItem>
                              <SelectItem value="yesno">Sim / Não</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={String(q.step)} onValueChange={(v) => updateQuestion(idx, { step: parseInt(v) })}>
                            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Etapa 1</SelectItem>
                              <SelectItem value="2">Etapa 2</SelectItem>
                              <SelectItem value="3">Etapa 3</SelectItem>
                            </SelectContent>
                          </Select>
                          <label className="flex items-center gap-1 text-xs">
                            <Switch checked={q.required !== false} onCheckedChange={(v) => updateQuestion(idx, { required: v })} className="scale-75" />
                            Obrigatória
                          </label>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeQuestion(idx)}>
                        <Trash2 className="h-3 w-3" />
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

// Keep default export for backward compatibility with direct route access
export default function Avaliacoes() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/formularios?tab=avaliacoes", { replace: true });
  }, [navigate]);
  return null;
}
