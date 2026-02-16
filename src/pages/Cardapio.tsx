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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { UtensilsCrossed, Plus, Loader2, Pencil, Copy, Trash2, Link2, Eye, MessageSquareText, User, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CardapioSection {
  id: string;
  emoji: string;
  title: string;
  instruction: string;
  max_selections: number | null;
  options: string[];
}

interface CardapioTemplate {
  id: string;
  company_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  sections: CardapioSection[];
  thank_you_message: string | null;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_SECTIONS: CardapioSection[] = [
  {
    id: "fritos",
    emoji: "🍟",
    title: "FRITOS",
    instruction: "Escolha os fritos desejados",
    max_selections: null,
    options: ["Coxinha", "Coxinha de Brócolis", "Bolinha de Queijo", "Almofadinha de Calabresa", "Almofadinha de Presunto e Queijo", "Kibe", "Kibe com Queijo", "Casulo de Azeitona com Queijo", "Bolinho de Carne"],
  },
  {
    id: "assados",
    emoji: "🥟",
    title: "ASSADOS",
    instruction: "Escolha os assados desejados",
    max_selections: null,
    options: ["Esfirra de Carne", "Esfirra de Frango", "Empada de Palmito", "Empada de Frango", "Enroladinho de Calabresa"],
  },
  {
    id: "doces",
    emoji: "🍬",
    title: "DOCES",
    instruction: "Escolha 5 tipos de doce",
    max_selections: 5,
    options: ["Beijinho", "Brigadeiro", "Cajuzinho", "Moranguinho", "Olho de Sogra", "Casadinho", "Docinho de Maracujá"],
  },
  {
    id: "bolo",
    emoji: "🎂",
    title: "BOLO",
    instruction: "Escolha 1 sabor de bolo",
    max_selections: 1,
    options: ["Beijinho", "Brigadeiro", "Trufado de Chocolate com Brigadeiro", "Brigadeiro com Brigadeiro Branco", "Brigadeiro com Morango", "Doce de Leite com Abacaxi", "Doce de Leite com Ameixa", "Ouro Branco", "Ninho com Morango"],
  },
];

function CardapioResponseCards({ responses, template }: { responses: any[]; template: CardapioTemplate | null }) {
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
                      const section = template?.sections.find(s => s.id === a.sectionId);
                      return (
                        <div key={idx} className="px-4 py-2.5">
                          <p className="text-muted-foreground text-xs mb-0.5">
                            {section ? `${section.emoji} ${section.title}` : a.sectionId}
                          </p>
                          <p className="font-medium text-sm">
                            {Array.isArray(a.selected) ? a.selected.join(", ") : String(a.selected || "—")}
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

export function CardapioContent() {
  const { currentCompany } = useCompany();
  const [templates, setTemplates] = useState<CardapioTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CardapioTemplate | null>(null);

  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [selectedTemplateForResponses, setSelectedTemplateForResponses] = useState<CardapioTemplate | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formThankYou, setFormThankYou] = useState("Obrigado por enviar suas escolhas! 🎉");
  const [formSections, setFormSections] = useState<CardapioSection[]>(DEFAULT_SECTIONS);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cardapio_templates")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("created_at", { ascending: false });
    if (!error && data) setTemplates(data.map((t: any) => ({ ...t, sections: t.sections as CardapioSection[] })));
    setLoading(false);

    const { data: countData } = await supabase
      .from("cardapio_responses")
      .select("template_id")
      .eq("company_id", currentCompany.id);
    if (countData) {
      const counts: Record<string, number> = {};
      countData.forEach((r: any) => { counts[r.template_id] = (counts[r.template_id] || 0) + 1; });
      setResponseCounts(counts);
    }
  };

  const toggleResponses = async (t: CardapioTemplate) => {
    if (expandedTemplateId === t.id) { setExpandedTemplateId(null); return; }
    setExpandedTemplateId(t.id);
    setSelectedTemplateForResponses(t);
    setLoadingResponses(true);
    const { data } = await supabase
      .from("cardapio_responses")
      .select("*")
      .eq("template_id", t.id)
      .order("created_at", { ascending: false });
    setResponses(data || []);
    setLoadingResponses(false);
  };

  useEffect(() => { fetchTemplates(); }, [currentCompany?.id]);

  const openNew = () => {
    setEditingTemplate(null);
    setFormName("Cardápio da Festa");
    setFormDescription("Escolha os itens do cardápio para a sua festa!");
    setFormThankYou("Obrigado por enviar suas escolhas! 🎉");
    setFormSections([...DEFAULT_SECTIONS.map(s => ({ ...s, options: [...s.options] }))]);
    setDialogOpen(true);
  };

  const openEdit = (t: CardapioTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormDescription(t.description || "");
    setFormThankYou(t.thank_you_message || "");
    setFormSections([...(t.sections || []).map(s => ({ ...s, options: [...s.options] }))]);
    setDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleDuplicate = async (t: CardapioTemplate) => {
    if (!currentCompany?.id) return;
    const newName = `${t.name} (cópia)`;
    const { error } = await supabase.from("cardapio_templates").insert({
      company_id: currentCompany.id,
      name: newName,
      slug: generateSlug(newName),
      description: t.description,
      sections: t.sections as any,
      thank_you_message: t.thank_you_message,
    });
    if (error) { toast({ title: "Erro ao duplicar", variant: "destructive" }); return; }
    toast({ title: "Template duplicado!" });
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("cardapio_responses").delete().eq("template_id", id);
    const { error } = await supabase.from("cardapio_templates").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", variant: "destructive" }); return; }
    toast({ title: "Template excluído" });
    if (expandedTemplateId === id) setExpandedTemplateId(null);
    fetchTemplates();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("cardapio_templates").update({ is_active: active }).eq("id", id);
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
      sections: formSections as any,
      thank_you_message: formThankYou.trim() || null,
      slug,
    };

    if (editingTemplate) {
      const { error } = await supabase.from("cardapio_templates").update(payload).eq("id", editingTemplate.id);
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Template atualizado!" });
    } else {
      const { error } = await supabase.from("cardapio_templates").insert(payload);
      if (error) { toast({ title: "Erro ao criar", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Template criado!" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchTemplates();
  };

  const addSection = () => {
    setFormSections([...formSections, {
      id: `sec_${Date.now()}`,
      emoji: "📋",
      title: "",
      instruction: "",
      max_selections: null,
      options: [""],
    }]);
  };

  const updateSection = (idx: number, updates: Partial<CardapioSection>) => {
    setFormSections(prev => prev.map((s, i) => i === idx ? { ...s, ...updates } : s));
  };

  const removeSection = (idx: number) => {
    setFormSections(prev => prev.filter((_, i) => i !== idx));
  };

  const addOption = (sectionIdx: number) => {
    setFormSections(prev => prev.map((s, i) => i === sectionIdx ? { ...s, options: [...s.options, ""] } : s));
  };

  const updateOption = (sectionIdx: number, optIdx: number, value: string) => {
    setFormSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s;
      const opts = [...s.options];
      opts[optIdx] = value;
      return { ...s, options: opts };
    }));
  };

  const removeOption = (sectionIdx: number, optIdx: number) => {
    setFormSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s;
      return { ...s, options: s.options.filter((_, oi) => oi !== optIdx) };
    }));
  };

  const getTemplateUrl = (t: CardapioTemplate) => {
    const companySlug = currentCompany?.slug;
    if (companySlug && t.slug) {
      return `/cardapio/${companySlug}/${t.slug}`;
    }
    return `/cardapio/${t.id}`;
  };

  const copyLink = (t: CardapioTemplate) => {
    const domain = currentCompany?.custom_domain
      ? `https://${currentCompany.custom_domain}`
      : window.location.origin;
    const path = getTemplateUrl(t);
    const ogUrl = `https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/og-preview?domain=${encodeURIComponent(domain.replace(/^https?:\/\//, ''))}&path=${encodeURIComponent(path)}`;
    navigator.clipboard.writeText(ogUrl);
    toast({ title: "Link copiado!" });
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground hidden md:block">Crie formulários de cardápio para os clientes escolherem</p>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Template</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : templates.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center space-y-3">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Nenhum template de cardápio criado ainda.</p>
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
                            {(t.sections || []).length} seções · {(t.sections || []).reduce((acc, s) => acc + s.options.length, 0)} opções
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
                        <div className="border-t border-border pt-4 mt-1 space-y-3">
                          {loadingResponses ? (
                            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                          ) : responses.length === 0 ? (
                            <div className="text-center py-6 space-y-2">
                              <MessageSquareText className="h-8 w-8 text-muted-foreground mx-auto" />
                              <p className="text-sm text-muted-foreground">Nenhuma resposta recebida ainda.</p>
                            </div>
                          ) : (
                            <CardapioResponseCards responses={responses} template={selectedTemplateForResponses} />
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
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template de Cardápio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div>
                <Label>Nome do template</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Cardápio da Festa" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Ex: Escolha os itens do cardápio!" />
              </div>
              <div>
                <Label>Mensagem de agradecimento</Label>
                <Input value={formThankYou} onChange={(e) => setFormThankYou(e.target.value)} placeholder="Obrigado! 🎉" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Seções do Cardápio</Label>
                <Button variant="outline" size="sm" onClick={addSection}><Plus className="h-3.5 w-3.5 mr-1" /> Seção</Button>
              </div>

              {formSections.map((sec, sIdx) => (
                <Card key={sec.id} className="bg-muted/50">
                  <CardContent className="p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Input value={sec.emoji} onChange={(e) => updateSection(sIdx, { emoji: e.target.value })} placeholder="🍟" className="text-center text-sm w-14 shrink-0" />
                        <Input value={sec.title} onChange={(e) => updateSection(sIdx, { title: e.target.value })} placeholder="Nome da seção" className="text-sm font-semibold" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeSection(sIdx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Instrução</Label>
                        <Input value={sec.instruction} onChange={(e) => updateSection(sIdx, { instruction: e.target.value })} placeholder="Ex: Escolha os fritos" className="text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Máx. seleções</Label>
                        <Input
                          type="number"
                          value={sec.max_selections ?? ""}
                          onChange={(e) => updateSection(sIdx, { max_selections: e.target.value ? Number(e.target.value) : null })}
                          placeholder="Ilimitado"
                          className="text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Opções:</p>
                      {sec.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1.5">
                          <Input
                            value={opt}
                            onChange={(e) => updateOption(sIdx, oIdx, e.target.value)}
                            placeholder="Nome da opção"
                            className="text-xs h-8"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeOption(sIdx, oIdx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addOption(sIdx)}>
                        <Plus className="h-3 w-3 mr-1" /> Opção
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

export default function Cardapio() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/formularios?tab=cardapio", { replace: true });
  }, [navigate]);
  return null;
}
