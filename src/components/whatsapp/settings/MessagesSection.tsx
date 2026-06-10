import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Plus, Pencil, Trash2, GripVertical, Loader2, Copy, ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import { CaptionsCard } from "./CaptionsCard";

const DEFAULT_TEMPLATES = [
  { name: "Primeiro contato", template: "Oi {{nome}}! Aqui é do {{empresa}}! Vi seu pedido para festa em {{mes}} com {{convidados}}. Vou te enviar as opções e valores!!" },
  { name: "Follow-up", template: "Oi {{nome}}! Tudo bem? Passando pra ver se você conseguiu avaliar o orçamento. Posso te ajudar a garantir sua data?" },
  { name: "Envio de Orçamento", template: "Oi {{nome}}! Segue seu orçamento com a promoção da campanha {{campanha}}." },
  { name: "Convite para visita", template: "Gostaria de vir conhecer pessoalmente?" },
  { name: "Convite para visita (completo)", template: "Oi {{nome}}! Que legal que você está interessado(a) no {{empresa}}! Gostaria de agendar uma visita para conhecer nosso espaço? Temos horários disponíveis e seria um prazer receber você!" },
];

interface MessageTemplate {
  id: string;
  name: string;
  template: string;
  is_active: boolean;
  sort_order: number;
  media_url?: string | null;
}

interface MessagesSectionProps {
  userId: string;
  isAdmin: boolean;
}

export function MessagesSection({ userId, isAdmin }: MessagesSectionProps) {
  const { currentCompanyId } = useCompany();
  // Any user who can see this section has permission to manage templates
  const canManage = true;
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    template: "",
    is_active: true,
    media_url: null as string | null,
  });
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentCompanyId) {
      fetchTemplates();
    }
  }, [currentCompanyId]);

  const seedDefaultTemplates = async (companyId: string) => {
    const defaults = DEFAULT_TEMPLATES.map((t, i) => ({
      name: t.name,
      template: t.template,
      is_active: true,
      sort_order: i,
      company_id: companyId,
    }));

    const { data, error } = await supabase
      .from("message_templates")
      .insert(defaults)
      .select();

    if (error) {
      console.error("Error seeding default templates:", error);
      return [];
    }
    return data || [];
  };

  const fetchTemplates = async () => {
    if (!currentCompanyId) return;
    setIsLoading(true);

    const { data } = await supabase
      .from("message_templates")
      .select("*")
      .eq("company_id", currentCompanyId)
      .order("sort_order", { ascending: true });

    if (data && data.length > 0) {
      setTemplates(data);
    } else {
      // Auto-populate defaults for this company
      const seeded = await seedDefaultTemplates(currentCompanyId);
      setTemplates(seeded);
    }
    setIsLoading(false);
  };

  const handleSaveTemplate = async () => {
    if (!formData.name || !formData.template) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from("message_templates")
          .update({
            name: formData.name,
            template: formData.template,
            is_active: formData.is_active,
            media_url: formData.media_url,
          } as any)
          .eq("id", editingTemplate.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Template atualizado com sucesso!",
        });
      } else {
        const maxOrder = templates.length > 0 
          ? Math.max(...templates.map(t => t.sort_order)) + 1 
          : 0;

        const { error } = await supabase
          .from("message_templates")
          .insert({
            name: formData.name,
            template: formData.template,
            is_active: formData.is_active,
            sort_order: maxOrder,
            company_id: currentCompanyId,
            media_url: formData.media_url,
          } as any);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Template criado com sucesso!",
        });
      }

      setIsDialogOpen(false);
      setEditingTemplate(null);
      setFormData({ name: "", template: "", is_active: true, media_url: null });
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar template.",
        variant: "destructive",
      });
    }

    setIsSaving(false);
  };

  const handleDeleteTemplate = async (template: MessageTemplate) => {
    if (!confirm(`Tem certeza que deseja excluir o template "${template.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("id", template.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Template excluído com sucesso.",
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir template.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (template: MessageTemplate) => {
    try {
      const { error } = await supabase
        .from("message_templates")
        .update({ is_active: !template.is_active })
        .eq("id", template.id);

      if (error) throw error;

      setTemplates(templates.map(t => 
        t.id === template.id ? { ...t, is_active: !t.is_active } : t
      ));
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar template.",
        variant: "destructive",
      });
    }
  };

  const handleSeedDefaults = async () => {
    if (!currentCompanyId) return;
    setIsSeeding(true);
    try {
      const seeded = await seedDefaultTemplates(currentCompanyId);
      setTemplates(seeded);
      toast({ title: "Sucesso", description: "Templates padrão carregados com sucesso!" });
    } catch {
      toast({ title: "Erro", description: "Erro ao carregar templates padrão.", variant: "destructive" });
    }
    setIsSeeding(false);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentCompanyId) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Envie uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10MB.", variant: "destructive" });
      return;
    }
    setIsUploadingMedia(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${currentCompanyId}/templates/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("whatsapp-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("whatsapp-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5); // 5 anos
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error("URL inválida");
      setFormData((p) => ({ ...p, media_url: signed.signedUrl }));
      toast({ title: "Foto adicionada", description: "A imagem será enviada junto com a mensagem." });
    } catch (err: any) {
      toast({ title: "Erro ao enviar foto", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleOpenDialog = (template?: MessageTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        template: template.template,
        is_active: template.is_active,
        media_url: template.media_url ?? null,
      });
    } else {
      setEditingTemplate(null);
      setFormData({ name: "", template: "", is_active: true, media_url: null });
    }
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Templates de Resposta Rápida */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
              <MessageSquare className="w-5 h-5" />
              Templates<span className="hidden sm:inline"> de Resposta Rápida</span>
            </CardTitle>
            <CardDescription className="hidden sm:block">
              Crie mensagens pré-definidas para agilizar o atendimento
            </CardDescription>
          </div>
          {canManage && (
            <Button onClick={() => handleOpenDialog()} size="sm" className="w-full sm:w-auto sm:size-default">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="sm:inline hidden">Novo Template</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Nenhum template criado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie templates para enviar mensagens rapidamente.
              </p>
                {canManage && (
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button onClick={handleSeedDefaults} disabled={isSeeding}>
                    {isSeeding ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    Carregar Templates Padrão
                  </Button>
                  <Button variant="outline" onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar do Zero
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div 
                  key={template.id} 
                  className={`p-3 sm:p-4 border rounded-lg ${!template.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="text-muted-foreground cursor-grab hidden sm:block">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm sm:text-base">{template.name}</p>
                        {!template.is_active && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">Inativo</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2">
                        {template.template}
                      </p>
                    </div>
                    {/* Desktop: actions inline */}
                    {canManage && (
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <Switch
                          checked={template.is_active}
                          onCheckedChange={() => handleToggleActive(template)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(template)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* Mobile: actions below */}
                  {canManage && (
                    <div className="flex sm:hidden items-center justify-end gap-1.5 mt-2 pt-2 border-t">
                      <Switch
                        checked={template.is_active}
                        onCheckedChange={() => handleToggleActive(template)}
                      />
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenDialog(template)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteTemplate(template)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legendas de Materiais - Collapsible */}
      <CaptionsCard />

      {/* Variáveis disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Variáveis Disponíveis</CardTitle>
          <CardDescription>
            Use estas variáveis nos seus templates para personalizar as mensagens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
            <code className="bg-muted px-2 py-1 rounded">{"{{nome}}"}</code>
            <code className="bg-muted px-2 py-1 rounded">{"{{telefone}}"}</code>
            <code className="bg-muted px-2 py-1 rounded">{"{{unidade}}"}</code>
            <code className="bg-muted px-2 py-1 rounded">{"{{data}}"}</code>
            <code className="bg-muted px-2 py-1 rounded">{"{{hora}}"}</code>
            <code className="bg-muted px-2 py-1 rounded">{"{{convidados}}"}</code>
            <code className="bg-muted px-2 py-1 rounded">{"{{empresa}}"}</code>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para criar/editar template */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? "Edite o template de resposta rápida." 
                : "Crie um novo template para agilizar suas respostas."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template *</Label>
              <Input
                id="name"
                placeholder="Ex: Boas-vindas"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Mensagem *</Label>
              <Textarea
                id="template"
                placeholder="Olá {{nome}}, seja bem-vindo(a)!"
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use variáveis como {"{{nome}}"} para personalizar a mensagem.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Foto (opcional)</Label>
              {formData.media_url ? (
                <div className="relative inline-block">
                  <img
                    src={formData.media_url}
                    alt="Pré-visualização"
                    className="max-h-40 rounded-xl border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, media_url: null }))}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow hover:opacity-90"
                    aria-label="Remover foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingMedia}
                  className="rounded-xl"
                >
                  {isUploadingMedia ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                  ) : (
                    <><ImagePlus className="w-4 h-4 mr-2" /> Anexar foto</>
                  )}
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleMediaUpload}
              />
              <p className="text-xs text-muted-foreground">
                A foto será enviada junto com a mensagem (como legenda).
              </p>
            </div>


            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Template ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTemplate} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingTemplate ? "Salvar" : "Criar Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
