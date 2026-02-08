import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, FileJson, Users, MessageCircle, MessagesSquare, 
  CheckCircle2, XCircle, Loader2, AlertTriangle, Download, Info
} from "lucide-react";

interface ImportStats {
  total: number;
  success: number;
  skipped: number;
  errors: number;
}

interface DataImportSectionProps {
  isAdmin: boolean;
}

export function DataImportSection({ isAdmin }: DataImportSectionProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importType, setImportType] = useState<'leads' | 'conversations' | 'messages'>('leads');
  const [errorLog, setErrorLog] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isAdmin) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Acesso restrito</AlertTitle>
        <AlertDescription>
          Apenas administradores podem importar dados.
        </AlertDescription>
      </Alert>
    );
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo JSON.",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        toast({
          title: "Formato inválido",
          description: "O arquivo deve conter um array de objetos.",
          variant: "destructive",
        });
        return;
      }

      await importData(data);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast({
        title: "Erro ao ler arquivo",
        description: "O arquivo não é um JSON válido.",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const importData = async (data: any[]) => {
    setIsImporting(true);
    setImportProgress(0);
    setErrorLog([]);
    
    const stats: ImportStats = { total: data.length, success: 0, skipped: 0, errors: 0 };
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      setImportProgress(Math.round(((i + 1) / data.length) * 100));

      try {
        switch (importType) {
          case 'leads':
            await importLead(item, stats, errors);
            break;
          case 'conversations':
            await importConversation(item, stats, errors);
            break;
          case 'messages':
            await importMessage(item, stats, errors);
            break;
        }
      } catch (error: any) {
        stats.errors++;
        errors.push(`Item ${i + 1}: ${error.message}`);
      }
    }

    setImportStats(stats);
    setErrorLog(errors);
    setIsImporting(false);

    toast({
      title: "Importação concluída",
      description: `${stats.success} importados, ${stats.skipped} ignorados, ${stats.errors} erros.`,
    });
  };

  const importLead = async (item: any, stats: ImportStats, errors: string[]) => {
    // Check if lead already exists by whatsapp
    const { data: existing } = await supabase
      .from('campaign_leads')
      .select('id')
      .eq('whatsapp', item.whatsapp)
      .eq('unit', item.unit || 'Manchester')
      .maybeSingle();

    if (existing) {
      stats.skipped++;
      return;
    }

    const { error } = await supabase.from('campaign_leads').insert({
      name: item.name || item.nome || 'Sem nome',
      whatsapp: item.whatsapp || item.telefone || item.phone,
      unit: item.unit || item.unidade || 'Manchester',
      month: item.month || item.mes || null,
      day_of_month: item.day_of_month || item.dia || null,
      guests: item.guests || item.convidados || null,
      status: item.status || 'novo',
      campaign_id: item.campaign_id || 'importado',
      campaign_name: item.campaign_name || 'Importação Manual',
      observacoes: item.observacoes || item.notes || null,
      created_at: item.created_at || new Date().toISOString(),
    });

    if (error) {
      stats.errors++;
      errors.push(`Lead ${item.name || item.whatsapp}: ${error.message}`);
    } else {
      stats.success++;
    }
  };

  const importConversation = async (item: any, stats: ImportStats, errors: string[]) => {
    // Get instance ID for the unit
    const { data: instance } = await supabase
      .from('wapi_instances')
      .select('id')
      .eq('unit', item.unit || 'Manchester')
      .maybeSingle();

    if (!instance) {
      stats.errors++;
      errors.push(`Conversa ${item.contact_phone}: Instância da unidade ${item.unit} não encontrada`);
      return;
    }

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('wapi_conversations')
      .select('id')
      .eq('instance_id', instance.id)
      .eq('contact_phone', item.contact_phone)
      .maybeSingle();

    if (existing) {
      stats.skipped++;
      return;
    }

    const { error } = await supabase.from('wapi_conversations').insert({
      instance_id: instance.id,
      remote_jid: item.remote_jid || `${item.contact_phone}@s.whatsapp.net`,
      contact_phone: item.contact_phone,
      contact_name: item.contact_name || null,
      contact_picture: item.contact_picture || null,
      last_message_at: item.last_message_at || null,
      last_message_content: item.last_message_content || null,
      last_message_from_me: item.last_message_from_me || false,
      unread_count: item.unread_count || 0,
      bot_enabled: item.bot_enabled ?? true,
      bot_step: item.bot_step || null,
      bot_data: item.bot_data || {},
      is_closed: item.is_closed || false,
      is_favorite: item.is_favorite || false,
      is_equipe: item.is_equipe || false,
      is_freelancer: item.is_freelancer || false,
      has_scheduled_visit: item.has_scheduled_visit || false,
      created_at: item.created_at || new Date().toISOString(),
    });

    if (error) {
      stats.errors++;
      errors.push(`Conversa ${item.contact_phone}: ${error.message}`);
    } else {
      stats.success++;
    }
  };

  const importMessage = async (item: any, stats: ImportStats, errors: string[]) => {
    // Find conversation by contact_phone if conversation_id not provided
    let conversationId = item.conversation_id;
    
    if (!conversationId && item.contact_phone) {
      const { data: conv } = await supabase
        .from('wapi_conversations')
        .select('id')
        .eq('contact_phone', item.contact_phone)
        .maybeSingle();
      
      if (conv) {
        conversationId = conv.id;
      }
    }

    if (!conversationId) {
      stats.errors++;
      errors.push(`Mensagem: Conversa não encontrada para ${item.contact_phone || 'ID desconhecido'}`);
      return;
    }

    // Check if message already exists by message_id
    if (item.message_id) {
      const { data: existing } = await supabase
        .from('wapi_messages')
        .select('id')
        .eq('message_id', item.message_id)
        .maybeSingle();

      if (existing) {
        stats.skipped++;
        return;
      }
    }

    const { error } = await supabase.from('wapi_messages').insert({
      conversation_id: conversationId,
      message_id: item.message_id || null,
      from_me: item.from_me || false,
      message_type: item.message_type || 'text',
      content: item.content || null,
      media_url: item.media_url || null,
      media_key: item.media_key || null,
      media_direct_path: item.media_direct_path || null,
      status: item.status || 'delivered',
      timestamp: item.timestamp || new Date().toISOString(),
    });

    if (error) {
      stats.errors++;
      errors.push(`Mensagem: ${error.message}`);
    } else {
      stats.success++;
    }
  };

  const downloadTemplate = (type: 'leads' | 'conversations' | 'messages') => {
    let template: any[] = [];
    
    switch (type) {
      case 'leads':
        template = [{
          name: "João Silva",
          whatsapp: "5511999999999",
          unit: "Manchester",
          month: "Março",
          day_of_month: 15,
          guests: "50-80 pessoas",
          status: "novo",
          campaign_id: "campanha-2024",
          campaign_name: "Campanha Verão 2024",
          observacoes: "Cliente interessado em festa infantil"
        }];
        break;
      case 'conversations':
        template = [{
          unit: "Manchester",
          contact_phone: "5511999999999",
          contact_name: "João Silva",
          last_message_at: new Date().toISOString(),
          last_message_content: "Olá, gostaria de um orçamento",
          last_message_from_me: false,
          unread_count: 1,
          bot_enabled: true,
          is_closed: false
        }];
        break;
      case 'messages':
        template = [{
          contact_phone: "5511999999999",
          from_me: false,
          message_type: "text",
          content: "Olá, gostaria de um orçamento para festa de 50 pessoas",
          timestamp: new Date().toISOString()
        }, {
          contact_phone: "5511999999999",
          from_me: true,
          message_type: "text",
          content: "Olá! Claro, vou enviar nossos pacotes",
          timestamp: new Date().toISOString()
        }];
        break;
    }

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${type}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Importar Dados
        </CardTitle>
        <CardDescription>
          Importe leads e conversas de outro sistema via arquivo JSON
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Como importar</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>Exporte os dados do outro sistema em formato JSON</li>
              <li>Escolha o tipo de dados a importar</li>
              <li>Faça upload do arquivo JSON</li>
              <li>Registros duplicados serão ignorados automaticamente</li>
            </ol>
          </AlertDescription>
        </Alert>

        <Tabs value={importType} onValueChange={(v) => setImportType(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="conversations" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Conversas
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessagesSquare className="h-4 w-4" />
              Mensagens
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Campos esperados para Leads:</h4>
              <p className="text-sm text-muted-foreground">
                name, whatsapp, unit, month, day_of_month, guests, status, campaign_id, campaign_name, observacoes
              </p>
            </div>
          </TabsContent>

          <TabsContent value="conversations" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Campos esperados para Conversas:</h4>
              <p className="text-sm text-muted-foreground">
                unit, contact_phone, contact_name, last_message_at, last_message_content, bot_enabled, is_closed
              </p>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Campos esperados para Mensagens:</h4>
              <p className="text-sm text-muted-foreground">
                contact_phone (ou conversation_id), from_me, message_type, content, timestamp
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => downloadTemplate(importType)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar Template
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isImporting}
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="gap-2"
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileJson className="h-4 w-4" />
            )}
            {isImporting ? 'Importando...' : 'Selecionar Arquivo JSON'}
          </Button>
        </div>

        {isImporting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso</span>
              <span>{importProgress}%</span>
            </div>
            <Progress value={importProgress} />
          </div>
        )}

        {importStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-2xl font-bold">{importStats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{importStats.success}</p>
              <p className="text-xs text-muted-foreground">Importados</p>
            </div>
            <div className="bg-yellow-500/10 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-yellow-600">{importStats.skipped}</p>
              <p className="text-xs text-muted-foreground">Ignorados</p>
            </div>
            <div className="bg-red-500/10 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{importStats.errors}</p>
              <p className="text-xs text-muted-foreground">Erros</p>
            </div>
          </div>
        )}

        {errorLog.length > 0 && (
          <div className="bg-destructive/10 p-4 rounded-lg">
            <h4 className="font-medium text-destructive mb-2 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Erros durante a importação
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
              {errorLog.slice(0, 20).map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
              {errorLog.length > 20 && (
                <li className="text-muted-foreground">... e mais {errorLog.length - 20} erros</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
