import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Loader2, Pencil, Copy, Trash2, FileSignature, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContractModelEditor } from "./ContractModelEditor";
import { ContractVersionHistory } from "./ContractVersionHistory";

interface ContractModel {
  id: string;
  company_id: string;
  nome_modelo: string;
  slug: string | null;
  tipo_evento: string;
  descricao: string | null;
  conteudo_template: string;
  is_active: boolean;
  versao: number;
  created_at: string;
  updated_at: string;
}

const TIPO_EVENTO_LABELS: Record<string, string> = {
  aniversario: "Aniversário",
  aniversario_kids: "Aniversário Kids",
  escolar: "Escolar",
  formatura: "Formatura",
  externo: "Externo",
  personalizado: "Personalizado",
};

interface Props { userId: string; }

export function ContractModelsList({ userId }: Props) {
  const { currentCompany } = useCompany();
  const [models, setModels] = useState<ContractModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ContractModel | null>(null);
  const [historyModel, setHistoryModel] = useState<ContractModel | null>(null);

  const fetchModels = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("contract_models")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("created_at", { ascending: false });
    if (!error && data) setModels(data);
    setLoading(false);
  };

  useEffect(() => { fetchModels(); }, [currentCompany?.id]);

  const handleDuplicate = async (model: ContractModel) => {
    if (!currentCompany?.id) return;
    const { error } = await (supabase as any).from("contract_models").insert({
      company_id: currentCompany.id,
      nome_modelo: `${model.nome_modelo} (cópia)`,
      tipo_evento: model.tipo_evento,
      descricao: model.descricao,
      conteudo_template: model.conteudo_template,
      created_by: userId,
    });
    if (error) { toast({ title: "Erro ao duplicar", variant: "destructive" }); return; }
    toast({ title: "Modelo duplicado!" });
    fetchModels();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("contract_models").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Modelo excluído" });
    fetchModels();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await (supabase as any).from("contract_models").update({ is_active: active, updated_by: userId }).eq("id", id);
    fetchModels();
  };

  const openNew = () => { setEditingModel(null); setEditorOpen(true); };
  const openEdit = (m: ContractModel) => { setEditingModel(m); setEditorOpen(true); };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground hidden md:block">Crie e edite modelos de contrato com variáveis do sistema</p>
          <Button onClick={openNew} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Novo Modelo</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : models.length === 0 ? (
          <Card><CardContent className="p-8 text-center space-y-3">
            <FileSignature className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Nenhum modelo de contrato criado ainda.</p>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Criar Primeiro Modelo</Button>
          </CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {models.map((m) => (
              <Card key={m.id} className="border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate mb-1.5">{m.nome_modelo}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                        <Badge variant={m.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">{m.is_active ? "Ativo" : "Inativo"}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{TIPO_EVENTO_LABELS[m.tipo_evento] || m.tipo_evento}</Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">v{m.versao}</Badge>
                      </div>
                      {m.descricao && <p className="text-xs text-muted-foreground line-clamp-1">{m.descricao}</p>}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Atualizado em {format(new Date(m.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Switch checked={m.is_active} onCheckedChange={(v) => handleToggleActive(m.id, v)} className="shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap border-t border-border/40 pt-3 mt-3">
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-full px-3.5 gap-1.5" onClick={() => openEdit(m)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-full px-3.5 gap-1.5" onClick={() => setHistoryModel(m)}>
                      <History className="h-3.5 w-3.5" /> Versões
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-full px-3.5 gap-1.5" onClick={() => handleDuplicate(m)}>
                      <Copy className="h-3.5 w-3.5" /> Duplicar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs rounded-full px-3.5 gap-1.5 ml-auto border-destructive/30 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita. Contratos já gerados não serão afetados.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(m.id)}>Excluir</AlertDialogAction>
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

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <ContractModelEditor
            model={editingModel}
            userId={userId}
            onClose={() => { setEditorOpen(false); fetchModels(); }}
          />
        </DialogContent>
      </Dialog>

      {/* Version History */}
      {historyModel && (
        <Dialog open={!!historyModel} onOpenChange={() => setHistoryModel(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Histórico de Versões — {historyModel.nome_modelo}</DialogTitle></DialogHeader>
            <ContractVersionHistory modelId={historyModel.id} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
