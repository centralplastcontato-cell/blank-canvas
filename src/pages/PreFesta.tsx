import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PartyPopper, Plus, Loader2, Menu, Pencil, Copy, Trash2, Link2, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logoCastelo from "@/assets/logo-castelo.png";

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
  // Etapa 1 – Dados do aniversariante
  { id: "pf1", type: "text", text: "Qual o nome do aniversariante?", step: 1, required: true },
  { id: "pf2", type: "text", text: "Qual a idade que vai completar?", step: 1, required: true },
  { id: "pf3", type: "text", text: "Qual o tema da festa?", step: 1, required: true },
  { id: "pf4", type: "text", text: "Personagens ou temas favoritos do aniversariante?", step: 1 },
  // Etapa 2 – Preferências e detalhes
  { id: "pf5", type: "text", text: "Cores preferidas para decoração?", step: 2 },
  { id: "pf6", type: "yesno", text: "Algum convidado possui alergia alimentar?", step: 2, required: true },
  { id: "pf7", type: "textarea", text: "Se sim, quais alergias? Descreva aqui:", step: 2 },
  { id: "pf8", type: "text", text: "Número estimado de convidados adultos:", step: 2, required: true },
  { id: "pf9", type: "text", text: "Número estimado de convidados crianças:", step: 2, required: true },
  // Etapa 3 – Logística e confirmações
  { id: "pf10", type: "text", text: "Horário previsto de chegada para organização:", step: 3 },
  { id: "pf11", type: "yesno", text: "Vai trazer bolo próprio?", step: 3 },
  { id: "pf12", type: "yesno", text: "Vai trazer decoração extra (ex: painel, balões)?", step: 3 },
  { id: "pf13", type: "textarea", text: "Alguma necessidade especial ou observação importante?", step: 3 },
  { id: "pf14", type: "textarea", text: "Alguma música ou playlist específica que deseja?", step: 3 },
];


export default function PreFesta() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [isAdmin, setIsAdmin] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; avatar?: string | null } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [templates, setTemplates] = useState<PreFestaTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PreFestaTemplate | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formThankYou, setFormThankYou] = useState("Obrigado por preencher! 🎉 Estamos preparando tudo para a sua festa!");
  const [formQuestions, setFormQuestions] = useState<PreFestaQuestion[]>(DEFAULT_QUESTIONS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const [profileResult, adminResult] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single(),
        supabase.rpc("is_admin", { _user_id: user.id }),
      ]);
      setCurrentUser({ id: user.id, name: profileResult.data?.full_name || "Usuário", email: user.email || "", avatar: profileResult.data?.avatar_url });
      setIsAdmin(adminResult.data === true);
      setPermLoading(false);
    }
    check();
  }, [navigate]);

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
    const { error } = await supabase.from("prefesta_templates").insert({
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
    const { error } = await supabase.from("prefesta_templates").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", variant: "destructive" }); return; }
    toast({ title: "Template excluído" });
    fetchTemplates();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await supabase.from("prefesta_templates").update({ is_active: active }).eq("id", id);
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

  const copyLink = (id: string) => {
    const domain = currentCompany?.custom_domain
      ? `https://${currentCompany.custom_domain}`
      : window.location.origin;
    const url = `${domain}/pre-festa/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };

  if (permLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar canManageUsers={isAdmin} isAdmin={isAdmin} currentUserName={currentUser?.name || ""} onRefresh={fetchTemplates} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="bg-card border-b border-border shrink-0 z-10 md:hidden">
            <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MobileMenu
                    isOpen={isMobileMenuOpen}
                    onOpenChange={setIsMobileMenuOpen}
                    trigger={<Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="w-5 h-5" /></Button>}
                    currentPage="prefesta"
                    userName={currentUser?.name || ""}
                    userEmail={currentUser?.email || ""}
                    userAvatar={currentUser?.avatar}
                    canManageUsers={isAdmin}
                    isAdmin={isAdmin}
                    onRefresh={fetchTemplates}
                    onLogout={handleLogout}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={logoCastelo} alt="Logo" className="h-8 w-auto shrink-0" />
                    <h1 className="font-display font-bold text-foreground text-sm truncate">Pré-Festa</h1>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="default" size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
                  <NotificationBell />
                </div>
              </div>
            </div>
          </header>

          <PullToRefresh onRefresh={async () => { await fetchTemplates(); }} className="flex-1 p-3 md:p-6 overflow-x-hidden overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Desktop header */}
              <div className="hidden md:flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PartyPopper className="h-7 w-7 text-primary" />
                  <div>
                    <h1 className="text-2xl font-bold">Pré-Festa</h1>
                    <p className="text-sm text-muted-foreground">Crie formulários para o anfitrião preencher antes da festa</p>
                  </div>
                </div>
                <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo Template</Button>
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
                  {templates.map((t) => (
                    <Card key={t.id} className="bg-card border-border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{t.name}</h3>
                              <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs shrink-0">
                                {t.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </div>
                            {t.description && <p className="text-sm text-muted-foreground line-clamp-1">{t.description}</p>}
                            <p className="text-xs text-muted-foreground mt-1">{(t.questions || []).length} perguntas · {Math.max(...(t.questions || []).map(q => q.step), 1)} etapas</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Switch checked={t.is_active} onCheckedChange={(v) => handleToggleActive(t.id, v)} />
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(t.id)} title="Copiar link">
                              <Link2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/pre-festa/${t.id}`, "_blank")} title="Visualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)} title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(t)} title="Duplicar">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </PullToRefresh>
        </div>
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
    </SidebarProvider>
  );
}
