import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Download, Loader2, Shield, Clock, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const PAGE_SIZE = 5;

// "4124 leads · 234 festas · …" (backups antigos não têm as abas novas)
function recordsLine(r: Record<string, number>): string {
  const parts: string[] = [
    `${r.leads || 0} leads`,
    `${r.events || 0} festas`,
    `${r.expenses || 0} despesas`,
  ];
  if (r.payments !== undefined) parts.push(`${r.payments} pagamentos`);
  if (r.visits !== undefined) parts.push(`${r.visits} visitas`);
  if (r.client_data !== undefined) parts.push(`${r.client_data} dados de contratante`);
  return parts.join(" · ");
}

export function CompanyBackupPanel() {
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = currentCompany?.id;
  const [page, setPage] = useState(0);

  const { data: backups, isLoading } = useQuery({
    queryKey: ["company-backup-logs", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("backup_logs")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!companyId,
  });

  const triggerBackup = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const { data, error } = await supabase.functions.invoke("data-backup", {
        body: { company_id: companyId },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (result?.status === "error") throw new Error(result.error);
      return result as { file_name?: string } | undefined;
    },
    onSuccess: (result) => {
      toast.success("Backup gerado com sucesso!");
      setPage(0);
      queryClient.invalidateQueries({ queryKey: ["company-backup-logs"] });
      if (result?.file_name) handleDownload(result.file_name);
    },
    onError: (err) => toast.error("Erro ao gerar backup", { description: String(err) }),
  });

  const handleDownload = async (fileName: string) => {
    try {
      // Use edge function to generate signed URL (bypasses RLS on private bucket)
      const { data, error } = await supabase.functions.invoke("data-backup", {
        body: { action: "download", file_name: fileName },
      });
      if (error || !data?.url) { 
        toast.error("Erro ao baixar arquivo"); 
        return; 
      }
      // Download via signed URL
      const response = await fetch(data.url);
      if (!response.ok) { toast.error("Erro ao baixar arquivo"); return; }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.split("/").pop() || "backup.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar o arquivo");
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
      case "running": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Gerando...</Badge>;
      case "error": return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Erro</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Backup dos Dados
            </CardTitle>
            <Button
              size="sm"
              onClick={() => triggerBackup.mutate()}
              disabled={triggerBackup.isPending}
            >
              {triggerBackup.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Gerar e Baixar Backup
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Uma cópia dos dados do buffet em uma planilha do Excel, com uma aba para cada parte:
            leads, festas, despesas, pagamentos das festas, visitas e dados do contratante.
            O arquivo tem dados pessoais dos clientes (CPF, endereço): guarde em lugar seguro.
          </p>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !backups?.length ? (
            <div className="text-center py-6 text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum backup realizado ainda.</p>
              <p className="text-xs mt-1">Clique no botão acima para gerar seu primeiro backup.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                <Clock className="h-3 w-3" />
                Histórico de backups
              </h4>
              {backups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((b: any) => {
                const records = b.records_count as Record<string, number> | null;
                return (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusBadge(b.status)}
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(b.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {records && (
                        <p className="text-xs text-muted-foreground">
                          {recordsLine(records)}
                        </p>
                      )}
                      {b.file_size_bytes && (
                        <span className="text-xs text-muted-foreground">{(b.file_size_bytes / 1024).toFixed(0)} KB</span>
                      )}
                      {b.error_message && <p className="text-xs text-destructive">{b.error_message}</p>}
                    </div>
                    {b.status === "completed" && b.file_name && (
                      <Button size="sm" variant="outline" onClick={() => handleDownload(b.file_name)} className="shrink-0">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Baixar
                      </Button>
                    )}
                  </div>
                );
              })}
              {backups.length > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-2">
                  <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Mais recentes
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {page + 1} de {Math.ceil(backups.length / PAGE_SIZE)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={(page + 1) * PAGE_SIZE >= backups.length}
                    onClick={() => setPage(page + 1)}
                  >
                    Anteriores
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium">🔒 Seus dados estão seguros</p>
              <p className="text-muted-foreground">
                Todo <strong>sábado à noite</strong>, o sistema gera automaticamente um backup. 
                Além disso, você pode gerar e baixar um backup a qualquer momento clicando no botão acima.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
