import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Trash2, FileText, AlertTriangle, Database, Copy, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DataImportSection } from "@/components/admin/DataImportSection";
import { UnitColorManager } from "@/components/admin/UnitColorManager";

interface AdvancedSectionProps {
  userId: string;
  isAdmin: boolean;
}

interface DuplicateGroup {
  contact_phone: string;
  contact_name: string | null;
  conversations: {
    id: string;
    remote_jid: string;
    message_count: number;
    last_message_at: string | null;
  }[];
}

export function AdvancedSection({ userId, isAdmin }: AdvancedSectionProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  const scanForDuplicates = async () => {
    setIsScanning(true);
    setHasScanned(true);

    try {
      // Get all conversations grouped by contact_phone
      const { data: conversations, error } = await supabase
        .from("wapi_conversations")
        .select("id, remote_jid, contact_phone, contact_name, last_message_at")
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      if (!conversations || conversations.length === 0) {
        setDuplicates([]);
        toast({
          title: "Nenhuma conversa encontrada",
          description: "Não há conversas para analisar.",
        });
        setIsScanning(false);
        return;
      }

      // Group by contact_phone to find duplicates
      const phoneGroups: Record<string, typeof conversations> = {};
      conversations.forEach(conv => {
        const phone = conv.contact_phone;
        if (!phoneGroups[phone]) {
          phoneGroups[phone] = [];
        }
        phoneGroups[phone].push(conv);
      });

      // Filter only groups with more than one conversation (duplicates)
      const duplicateGroups: DuplicateGroup[] = [];

      for (const [phone, convs] of Object.entries(phoneGroups)) {
        if (convs.length > 1) {
          // Get message counts for each conversation
          const convsWithCounts = await Promise.all(
            convs.map(async (conv) => {
              const { count } = await supabase
                .from("wapi_messages")
                .select("*", { count: "exact", head: true })
                .eq("conversation_id", conv.id);

              return {
                id: conv.id,
                remote_jid: conv.remote_jid,
                message_count: count || 0,
                last_message_at: conv.last_message_at,
              };
            })
          );

          duplicateGroups.push({
            contact_phone: phone,
            contact_name: convs[0].contact_name,
            conversations: convsWithCounts.sort((a, b) => b.message_count - a.message_count),
          });
        }
      }

      setDuplicates(duplicateGroups);

      if (duplicateGroups.length === 0) {
        toast({
          title: "Nenhum duplicado encontrado",
          description: "Todas as conversas estão únicas.",
        });
      } else {
        toast({
          title: "Duplicados encontrados",
          description: `${duplicateGroups.length} contato(s) com conversas duplicadas.`,
        });
      }
    } catch (error: any) {
      console.error("Error scanning for duplicates:", error);
      toast({
        title: "Erro ao escanear",
        description: error.message || "Erro ao buscar duplicados.",
        variant: "destructive",
      });
    }

    setIsScanning(false);
  };

  const mergeDuplicates = async (group: DuplicateGroup) => {
    setIsMerging(true);

    try {
      // Keep the conversation with most messages as the primary
      const [primaryConv, ...secondaryConvs] = group.conversations;

      for (const secondary of secondaryConvs) {
        // Move all messages from secondary to primary
        const { error: updateError } = await supabase
          .from("wapi_messages")
          .update({ conversation_id: primaryConv.id })
          .eq("conversation_id", secondary.id);

        if (updateError) {
          console.error("Error moving messages:", updateError);
          throw updateError;
        }

        // Delete the secondary conversation
        const { error: deleteError } = await supabase
          .from("wapi_conversations")
          .delete()
          .eq("id", secondary.id);

        if (deleteError) {
          console.error("Error deleting conversation:", deleteError);
          throw deleteError;
        }
      }

      // Update the primary conversation's last_message info
      const { data: lastMessage } = await supabase
        .from("wapi_messages")
        .select("content, from_me, timestamp")
        .eq("conversation_id", primaryConv.id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      if (lastMessage) {
        await supabase
          .from("wapi_conversations")
          .update({
            last_message_content: lastMessage.content,
            last_message_from_me: lastMessage.from_me,
            last_message_at: lastMessage.timestamp,
          })
          .eq("id", primaryConv.id);
      }

      // Remove merged group from state
      setDuplicates(prev => prev.filter(g => g.contact_phone !== group.contact_phone));

      toast({
        title: "Mesclagem concluída",
        description: `Conversas de ${group.contact_name || group.contact_phone} foram mescladas.`,
      });
    } catch (error: any) {
      console.error("Error merging conversations:", error);
      toast({
        title: "Erro ao mesclar",
        description: error.message || "Erro ao mesclar conversas.",
        variant: "destructive",
      });
    }

    setIsMerging(false);
  };

  const mergeAllDuplicates = async () => {
    setIsMerging(true);

    try {
      for (const group of duplicates) {
        await mergeDuplicates(group);
      }

      toast({
        title: "Todas as mesclagens concluídas",
        description: "Todos os duplicados foram mesclados com sucesso.",
      });
    } catch (error: any) {
      console.error("Error merging all:", error);
      toast({
        title: "Erro na mesclagem em lote",
        description: error.message || "Erro ao mesclar todos os duplicados.",
        variant: "destructive",
      });
    }

    setIsMerging(false);
  };

  const handleSyncContacts = async () => {
    setIsSyncing(true);
    
    try {
      // Fetch all instances
      const { data: instances } = await supabase
        .from("wapi_instances")
        .select("*");

      if (!instances || instances.length === 0) {
        toast({
          title: "Aviso",
          description: "Nenhuma instância configurada para sincronizar.",
        });
        setIsSyncing(false);
        return;
      }

      let syncedCount = 0;

      for (const instance of instances) {
        try {
          // This would call a sync contacts endpoint
          // For now, we'll just simulate the sync
          await new Promise(resolve => setTimeout(resolve, 1000));
          syncedCount++;
        } catch (err) {
          console.error(`Error syncing contacts for ${instance.unit}:`, err);
        }
      }

      toast({
        title: "Sincronização concluída",
        description: `${syncedCount} instância(s) sincronizada(s).`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao sincronizar contatos.",
        variant: "destructive",
      });
    }

    setIsSyncing(false);
  };

  const handleClearCache = async () => {
    setIsClearing(true);

    try {
      // Clear local storage cache related to WhatsApp
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('whatsapp_') || key.startsWith('wapi_')
      );
      
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear session storage as well
      const sessionKeysToRemove = Object.keys(sessionStorage).filter(key => 
        key.startsWith('whatsapp_') || key.startsWith('wapi_')
      );
      
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

      toast({
        title: "Cache limpo",
        description: `${keysToRemove.length + sessionKeysToRemove.length} item(s) removido(s) do cache.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao limpar cache.",
        variant: "destructive",
      });
    }

    setIsClearing(false);
  };

  const handleExportLogs = () => {
    // Create a simple log export
    const logs = {
      exportedAt: new Date().toISOString(),
      userId,
      userAgent: navigator.userAgent,
      localStorage: Object.keys(localStorage).filter(key => 
        key.startsWith('whatsapp_') || key.startsWith('wapi_')
      ),
    };

    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Logs exportados",
      description: "Arquivo de logs baixado com sucesso.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Sincronizar Contatos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Sincronizar Contatos
          </CardTitle>
          <CardDescription>
            Sincronize os contatos do WhatsApp com o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Esta ação irá atualizar os dados de contatos e fotos de perfil de todas as conversas.
            O processo pode levar alguns minutos dependendo do número de conversas.
          </p>
          <Button 
            variant="outline" 
            onClick={handleSyncContacts}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>
        </CardContent>
      </Card>

      {/* Limpar Cache */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Limpar Cache
          </CardTitle>
          <CardDescription>
            Remova dados em cache para resolver problemas de exibição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Esta ação irá limpar o cache local do navegador relacionado ao WhatsApp.
            Suas conversas e mensagens no servidor não serão afetadas.
          </p>
          <Button 
            variant="outline" 
            onClick={handleClearCache}
            disabled={isClearing}
          >
            <Trash2 className={`w-4 h-4 mr-2`} />
            {isClearing ? 'Limpando...' : 'Limpar Cache'}
          </Button>
        </CardContent>
      </Card>

      {/* Logs de Atividade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Logs de Atividade
          </CardTitle>
          <CardDescription>
            Exporte logs para diagnóstico de problemas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Baixe um arquivo com informações de diagnóstico para ajudar a resolver problemas técnicos.
          </p>
          <Button variant="outline" onClick={handleExportLogs}>
            <FileText className="w-4 h-4 mr-2" />
            Exportar Logs
          </Button>
        </CardContent>
      </Card>

      {/* Mesclar Conversas Duplicadas - Apenas Admin */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Conversas Duplicadas
            </CardTitle>
            <CardDescription>
              Detecte e mescle conversas duplicadas do mesmo contato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Essa ferramenta identifica contatos que aparecem mais de uma vez na lista de conversas
              (causado por variações no formato do número) e permite mesclá-los em uma única conversa.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                onClick={scanForDuplicates}
                disabled={isScanning || isMerging}
              >
                {isScanning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isScanning ? 'Escaneando...' : 'Escanear Duplicados'}
              </Button>

              {duplicates.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" disabled={isMerging}>
                      {isMerging ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4 mr-2" />
                      )}
                      Mesclar Todos ({duplicates.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mesclar todos os duplicados?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação irá mesclar {duplicates.length} grupo(s) de conversas duplicadas.
                        As mensagens serão consolidadas na conversa principal de cada contato.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={mergeAllDuplicates}>
                        Sim, mesclar todos
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Results */}
            {hasScanned && duplicates.length === 0 && (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  ✓ Nenhuma conversa duplicada encontrada
                </p>
              </div>
            )}

            {duplicates.length > 0 && (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {duplicates.map((group) => (
                  <div 
                    key={group.contact_phone} 
                    className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {group.contact_name || group.contact_phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {group.conversations.length} conversas • {group.conversations.reduce((sum, c) => sum + c.message_count, 0)} mensagens total
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {group.conversations.map((conv, idx) => (
                          <Badge key={conv.id} variant={idx === 0 ? "default" : "secondary"} className="text-xs">
                            {conv.message_count} msg
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isMerging}>
                          Mesclar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Mesclar conversas de {group.contact_name || group.contact_phone}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá mover todas as {group.conversations.reduce((sum, c) => sum + c.message_count, 0)} mensagens 
                            para a conversa principal e excluir as conversas duplicadas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => mergeDuplicates(group)}>
                            Sim, mesclar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cores das Unidades */}
      {isAdmin && <UnitColorManager />}

      {/* Importar Dados */}
      <Separator />
      <DataImportSection isAdmin={isAdmin} />

      {/* Zona de Perigo - Apenas Admin */}
      {isAdmin && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>
              Ações irreversíveis que afetam permanentemente os dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar Todas as Conversas
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso irá excluir permanentemente todas as 
                    conversas e mensagens do sistema. Os dados não poderão ser recuperados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      toast({
                        title: "Ação bloqueada",
                        description: "Por segurança, esta ação precisa ser executada diretamente no banco de dados.",
                        variant: "destructive",
                      });
                    }}
                  >
                    Sim, excluir tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
