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
import { ClipboardCheck, Plus, Loader2, Pencil, Copy, Trash2, Link2, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

/**
 * Content-only component for use inside the Formularios page tabs.
 * No sidebar/header shell — that's handled by the parent.
 */
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
    const { error } = await supabase.from("evaluation_templates").insert({
      company_id: currentCompany.id,
      name: `${t.name} (cópia)`,
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
    fetchTemplates();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("evaluation_templates").update({ is_active: active }).eq("id", id);
    fetchTemplates();
  };

  const handleSave = async () => {
    if (!currentCompany?.id || !formName.trim()) return;
    setSaving(true);
    const payload = {
      company_id: currentCompany.id,
      name: formName.trim(),
      description: formDescription.trim() || null,
      questions: formQuestions as any,
      thank_you_message: formThankYou.trim() || null,
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

  const copyLink = (id: string) => {
    const domain = currentCompany?.custom_domain
      ? `https://${currentCompany.custom_domain}`
      : window.location.origin;
    const url = `${domain}/avaliacao/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

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
            {templates.map((t) => (
              <Card key={t.id} className="bg-card border-border">
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
                      <p className="text-xs text-muted-foreground mt-1">{(t.questions || []).length} perguntas · {Math.max(...(t.questions || []).map(q => q.step), 1)} etapas</p>
                    </div>
                    <Switch checked={t.is_active} onCheckedChange={(v) => handleToggleActive(t.id, v)} className="shrink-0" />
                  </div>
                  <div className="flex items-center gap-1 flex-wrap border-t border-border pt-2">
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => copyLink(t.id)}>
                      <Link2 className="h-3.5 w-3.5" /> Link
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => window.open(`/avaliacao/${t.id}`, "_blank")}>
                      <Eye className="h-3.5 w-3.5" /> Ver
                    </Button>
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
                </CardContent>
              </Card>
            ))}
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
