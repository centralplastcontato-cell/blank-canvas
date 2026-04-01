import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Download, Loader2, Shield, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function HubBackups() {
  const queryClient = useQueryClient();
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

  const { data: companies } = useQuery({
    queryKey: ["hub-companies-backup"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name, slug").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: backups, isLoading } = useQuery({
    queryKey: ["backup-logs", selectedCompany],
    queryFn: async () => {
      let q = supabase.from("backup_logs").select("*, companies(name, slug)").order("created_at", { ascending: false }).limit(50);
      if (selectedCompany !== "all") q = q.eq("company_id", selectedCompany);
      const { data } = await q;
      return data || [];
    },
  });

  const triggerBackup = useMutation({
    mutationFn: async (companyId?: string) => {
      const { data, error } = await supabase.functions.invoke("data-backup", {
        body: companyId ? { company_id: companyId } : {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Backup concluído!", { description: `${data.results?.length || 0} empresa(s) processada(s)` });
      queryClient.invalidateQueries({ queryKey: ["backup-logs"] });
    },
    onError: (err) => toast.error("Erro ao gerar backup", { description: String(err) }),
  });

  const handleDownload = async (fileName: string) => {
    const { data, error } = await supabase.storage.from("data-backups").download(fileName);
    if (error || !data) { toast.error("Erro ao baixar arquivo"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.split("/").pop() || "backup.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
      case "running": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Rodando</Badge>;
      case "error": return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Erro</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const header = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />Backups de Dados</h1>
        <p className="text-sm text-muted-foreground mt-1">Backup automático semanal + download manual dos dados críticos</p>
      </div>
      <div className="flex gap-2">
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas empresas</SelectItem>
            {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => triggerBackup.mutate(selectedCompany !== "all" ? selectedCompany : undefined)} disabled={triggerBackup.isPending}>
          {triggerBackup.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
          Gerar Backup
        </Button>
      </div>
    </div>
  );

  return (
    <HubLayout currentPage="backups" header={header}>
      {() => (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Histórico de Backups</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : !backups?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>Nenhum backup realizado ainda.</p>
                  <p className="text-xs mt-1">Clique em "Gerar Backup" ou aguarde o backup automático de domingo.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {backups.map((b: any) => {
                    const records = b.records_count as Record<string, number> | null;
                    return (
                      <div key={b.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{(b as any).companies?.name || "Empresa"}</span>
                            {statusBadge(b.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span>{format(new Date(b.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                            {records && (
                              <span>{records.leads || 0} leads · {records.events || 0} eventos · {records.expenses || 0} despesas · {records.contacts || 0} contatos</span>
                            )}
                            {b.file_size_bytes && <span>{(b.file_size_bytes / 1024).toFixed(0)} KB</span>}
                          </div>
                          {b.error_message && <p className="text-xs text-destructive">{b.error_message}</p>}
                        </div>
                        {b.status === "completed" && b.file_name && (
                          <Button size="sm" variant="outline" onClick={() => handleDownload(b.file_name)}>
                            <Download className="h-3.5 w-3.5 mr-1" />Baixar
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">🔒 Proteção Automática</p>
                  <p className="text-muted-foreground">Todo <strong>domingo à noite</strong>, o sistema gera automaticamente um backup completo de leads, eventos, despesas e contatos. Os arquivos ficam disponíveis para download por tempo ilimitado.</p>
                  <p className="text-muted-foreground">O Supabase também realiza backups diários automáticos do banco com retenção de 7 dias.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </HubLayout>
  );
}
