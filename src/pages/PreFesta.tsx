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

import { PartyPopper, Plus, Loader2, Pencil, Copy, Trash2, Link2, Eye, MessageSquareText, User, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function PreFestaResponseCards({ responses, template }: { responses: any[]; template: PreFestaTemplate | null }) {
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
                      return (
                        <div key={idx} className="px-4 py-2.5">
                          <p className="text-muted-foreground text-xs mb-0.5">{question?.text || a.questionId}</p>
                          <p className="font-medium text-sm">
                            {a.value === true ? "👍 Sim" : a.value === false ? "👎 Não" : String(a.value || "—")}
                          </p>
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

interface PreFestaQuestion {
  id: string;
  type: "text" | "yesno" | "select" | "textarea";
  text: string;
  step: number;
  required?: boolean;
  options?: string[];
}

interface PreFestaTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  questions: PreFestaQuestion[];
  thank_you_message: string | null;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_QUESTIONS: PreFestaQuestion[] = [
  { id: "pf1", type: "text", text: "Qual o nome do aniversariante?", step: 1, required: true },
  { id: "pf2", type: "text", text: "Qual a idade que vai completar?", step: 1, required: true },
  { id: "pf3", type: "text", text: "Data de nascimento do aniversariante:", step: 1, required: true },
  { id: "pf4", type: "text", text: "Qual o tema da festa?", step: 1, required: true },
  { id: "pf5", type: "text", text: "Personagens ou temas favoritos do aniversariante?", step: 1 },
  { id: "pf6", type: "text", text: "Cores preferidas para decoração?", step: 1 },
  { id: "pf7", type: "yesno", text: "Algum convidado possui alergia alimentar?", step: 2, required: true },
  { id: "pf8", type: "textarea", text: "Se sim, quais alergias? Descreva aqui:", step: 2 },
  { id: "pf9", type: "yesno", text: "Há convidados vegetarianos ou veganos?", step: 2 },
  { id: "pf10", type: "textarea", text: "Alguma restrição alimentar adicional (intolerância, dieta especial)?", step: 2 },
  { id: "pf11", type: "text", text: "Sabor do bolo preferido:", step: 2 },
  { id: "pf12", type: "yesno", text: "Vai trazer bolo próprio?", step: 2 },
  { id: "pf13", type: "textarea", text: "Algum doce ou alimento especial que gostaria no cardápio?", step: 2 },
  { id: "pf14", type: "text", text: "Número estimado de convidados adultos:", step: 3, required: true },
  { id: "pf15", type: "text", text: "Número estimado de convidados crianças:", step: 3, required: true },
  { id: "pf16", type: "text", text: "Faixa etária predominante das crianças:", step: 3 },
  { id: "pf17", type: "yesno", text: "Haverá convidados com necessidades especiais (acessibilidade)?", step: 3 },
  { id: "pf18", type: "textarea", text: "Se sim, quais necessidades?", step: 3 },
  { id: "pf19", type: "text", text: "Horário previsto de chegada para organização:", step: 3, required: true },
  { id: "pf20", type: "yesno", text: "Vai trazer decoração extra (ex: painel, balões, faixas)?", step: 4 },
  { id: "pf21", type: "textarea", text: "Descreva os itens de decoração que trará:", step: 4 },
  { id: "pf22", type: "yesno", text: "Vai contratar algum serviço externo (DJ, fotógrafo, animador)?", step: 4 },
  { id: "pf23", type: "textarea", text: "Quais serviços externos? Informe nome e contato:", step: 4 },
  { id: "pf24", type: "textarea", text: "Alguma música ou playlist específica que deseja?", step: 4 },
  { id: "pf25", type: "yesno", text: "Deseja algum tipo de brincadeira ou atividade especial?", step: 4 },
  { id: "pf26", type: "textarea", text: "Quais brincadeiras ou atividades?", step: 4 },
  { id: "pf27", type: "textarea", text: "Há algo que o aniversariante NÃO gosta ou quer evitar?", step: 5 },
  { id: "pf28", type: "yesno", text: "A festa é surpresa?", step: 5 },
  { id: "pf29", type: "textarea", text: "Alguma necessidade especial ou observação importante?", step: 5 },
  { id: "pf30", type: "textarea", text: "Mensagem ou recado adicional para nossa equipe:", step: 5 },
];

export function PreFestaContent() {
  const { currentCompany } = useCompany();
  const [templates, setTemplates] = useState<PreFestaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PreFestaTemplate | null>(null);

  // Responses state - inline
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [selectedTemplateForResponses, setSelectedTemplateForResponses] = useState<PreFestaTemplate | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formThankYou, setFormThankYou] = useState("Obrigado por preencher! 🎉 Estamos preparando tudo para a sua festa!");
  const [formQuestions, setFormQuestions] = useState<PreFestaQuestion[]>(DEFAULT_QUESTIONS);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("prefesta_templates")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("created_at", { ascending: false });
    if (!error && data) setTemplates(data.map((t: any) => ({ ...t, questions: t.questions as PreFestaQuestion[] })));
    setLoading(false);

    const { data: countData } = await supabase
      .from("prefesta_responses")
      .select("template_id")
      .eq("company_id", currentCompany.id);
    if (countData) {
      const counts: Record<string, number> = {};
      countData.forEach((r: any) => { counts[r.template_id] = (counts[r.template_id] || 0) + 1; });
      setResponseCounts(counts);
    }
  };

  const toggleResponses = async (t: PreFestaTemplate) => {
    if (expandedTemplateId === t.id) {
      setExpandedTemplateId(null);
      return;
    }
    setExpandedTemplateId(t.id);
    setSelectedTemplateForResponses(t);
    setLoadingResponses(true);
    const { data } = await supabase
      .from("prefesta_responses")
      .select("*")
      .eq("template_id", t.id)
      .order("created_at", { ascending: false });
    setResponses(data || []);
    setLoadingResponses(false);
  };

  useEffect(() => { fetchTemplates(); }, [currentCompany?.id]);

  const openNew = () => {
    setEditingTemplate(null);
    setFormName("Formulário Pré-Festa");
    setFormDescription("Preencha as informações para prepararmos tudo para a sua festa!");
    setFormThankYou("Obrigado por preencher! 🎉 Estamos preparando tudo para a sua festa!");
    setFormQuestions([...DEFAULT_QUESTIONS]);
    setDialogOpen(true);
  };

  const openEdit = (t: PreFestaTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormDescription(t.description || "");
    setFormThankYou(t.thank_you_message || "");
    setFormQuestions([...(t.questions || [])]);
    setDialogOpen(true);
  };

  const handleDuplicate = async (t: PreFestaTemplate) => {
    if (!currentCompany?.id) return;
    const newName = `${t.name} (cópia)`;
    const { error } = await supabase.from("prefesta_templates").insert({
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
    const { error } = await supabase.from("prefesta_templates").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", variant: "destructive" }); return; }
    toast({ title: "Template excluído" });
    if (expandedTemplateId === id) setExpandedTemplateId(null);
    fetchTemplates();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("prefesta_templates").update({ is_active: active }).eq("id", id);
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
      const { error } = await supabase.from("prefesta_templates").update(payload).eq("id", editingTemplate.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Template atualizado!" });
    } else {
      const { error } = await supabase.from("prefesta_templates").insert(payload);
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
      id: `pf${Date.now()}`,
      type: "text",
      text: "",
      step: maxStep,
      required: false,
    }]);
  };

  const updateQuestion = (idx: number, updates: Partial<PreFestaQuestion>) => {
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

  const getTemplateUrl = (t: PreFestaTemplate & { slug?: string | null }) => {
    const companySlug = currentCompany?.slug;
    if (companySlug && t.slug) return `/pre-festa/${companySlug}/${t.slug}`;
    return `/pre-festa/${t.id}`;
  };

  const copyLink = (t: PreFestaTemplate & { slug?: string | null }) => {
    const domain = currentCompany?.custom_domain || '';
    const path = getTemplateUrl(t);
    const fullUrl = domain ? `${domain}${path}` : `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    toast({ title: "Link copiado!" });
  };

  return (
    <>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground hidden md:block">Crie formulários para o anfitrião preencher antes da festa</p>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Template</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : templates.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center space-y-3">
              <PartyPopper className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Nenhum template de pré-festa criado ainda.</p>
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
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => handleDuplicate(t)}>
                          <Copy className="h-3.5 w-3.5" /> Duplicar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 ml-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all"><Trash2 className="h-3.5 w-3.5" /> Excluir</Button>
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
                        <div className="border-t border-border pt-4 mt-1 space-y-3">
                          {loadingResponses ? (
                            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                          ) : responses.length === 0 ? (
                            <div className="text-center py-6 space-y-2">
                              <MessageSquareText className="h-8 w-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">Nenhuma resposta recebida ainda.</p>
                            </div>
                          ) : (
                            <PreFestaResponseCards responses={responses} template={selectedTemplateForResponses} />
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
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template Pré-Festa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label>Nome do template</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Formulário Pré-Festa" />
              </div>
              <div>
                <Label>Descrição (aparece no topo do formulário)</Label>
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Ex: Preencha as informações para prepararmos tudo!" />
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
                        <Input
                          value={q.text}
                          onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                          placeholder="Texto da pergunta..."
                          className="text-sm"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select value={q.type} onValueChange={(v) => updateQuestion(idx, { type: v as any })}>
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto curto</SelectItem>
                              <SelectItem value="textarea">Texto longo</SelectItem>
                              <SelectItem value="yesno">Sim / Não</SelectItem>
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

// Keep default export for backward compatibility
export default function PreFesta() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/formularios?tab=prefesta", { replace: true });
  }, [navigate]);
  return null;
}
