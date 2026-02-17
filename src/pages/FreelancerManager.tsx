import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { HardHat, Plus, Loader2, Pencil, Copy, Trash2, Link2, Eye, MessageSquareText, User, Calendar, ChevronDown, ChevronRight, Phone, MapPin, Briefcase, Camera } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FreelancerTemplate {
  id: string;
  company_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  questions: any[];
  thank_you_message: string | null;
  is_active: boolean;
  created_at: string;
}

const generateSlug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function FreelancerResponseCards({ responses }: { responses: any[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const ROLE_LABELS: Record<string, string> = {
    gerente: "Gerente", seguranca: "Segurança", garcom: "Garçom", monitor: "Monitor", cozinha: "Cozinha",
  };

  return (
    <div className="space-y-2">
      {responses.map((r) => {
        const isOpen = openId === r.id;
        const answers = Array.isArray(r.answers) ? r.answers : [];
        const getAnswer = (key: string) => answers.find((a: any) => a.questionId === key)?.value;
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
                    {ROLE_LABELS[getAnswer("funcao")] || getAnswer("funcao") || "—"}
                  </span>
                </div>
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
                    {[
                      { icon: Phone, label: "Telefone", value: getAnswer("telefone") },
                      { icon: MapPin, label: "Endereço", value: getAnswer("endereco") },
                      { icon: Briefcase, label: "Função", value: ROLE_LABELS[getAnswer("funcao")] || getAnswer("funcao") },
                      { icon: HardHat, label: "Já trabalha no buffet?", value: getAnswer("ja_trabalha") === true ? "Sim" : getAnswer("ja_trabalha") === false ? "Não" : "—" },
                      ...(getAnswer("ja_trabalha") === true ? [{ icon: Calendar, label: "Há quanto tempo?", value: getAnswer("tempo_trabalho") }] : []),
                      { icon: User, label: "Sobre", value: getAnswer("sobre") },
                    ].map((item, idx) => (
                      <div key={idx} className="px-4 py-2.5 flex items-start gap-2">
                        <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <p className="text-muted-foreground text-xs">{item.label}</p>
                          <p className="font-medium text-sm">{item.value || "—"}</p>
                        </div>
                      </div>
                    ))}
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
  const [saving, setSaving] = useState(false);

  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
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
    if (data) setTemplates(data as any);
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
    setDialogOpen(true);
  };

  const openEdit = (t: FreelancerTemplate) => {
    setEditingTemplate(t);
    setFormName(t.name);
    setFormDescription(t.description || "");
    setFormThankYou(t.thank_you_message || "");
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
      questions: [] as any,
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
                            <FreelancerResponseCards responses={responses} />
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template de Freelancer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Nome do formulário *</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Cadastro de Freelancer" />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Texto exibido no topo do formulário" rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium">Mensagem de agradecimento</label>
              <Input value={formThankYou} onChange={(e) => setFormThankYou(e.target.value)} placeholder="Obrigado pelo seu cadastro! 🎉" />
            </div>
            <div className="bg-muted/40 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Campos fixos do formulário:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Nome completo</li>
                <li>Foto (opcional)</li>
                <li>Telefone</li>
                <li>Endereço</li>
                <li>Já trabalha no buffet? + Há quanto tempo?</li>
                <li>Função (Gerente, Segurança, Garçom, Monitor, Cozinha)</li>
                <li>Fale um pouco sobre você</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
