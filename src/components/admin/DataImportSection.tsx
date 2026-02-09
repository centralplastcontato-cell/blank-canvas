import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { 
  Upload, FileJson, Users, MessageCircle, MessagesSquare, 
  XCircle, Loader2, AlertTriangle, Download, Info, FileImage, Bot
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

type ImportType = 'leads' | 'conversations' | 'messages' | 'materials' | 'bot_config';

export function DataImportSection({ isAdmin }: DataImportSectionProps) {
  const { currentCompanyId } = useCompany();
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [importType, setImportType] = useState<ImportType>('leads');
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
          case 'materials':
            await importMaterial(item, stats, errors);
            break;
          case 'bot_config':
            await importBotConfig(item, stats, errors);
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
      company_id: currentCompanyId!,
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
      company_id: currentCompanyId!,
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
      is_imported: true,
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
      company_id: currentCompanyId!,
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

  const importMaterial = async (item: any, stats: ImportStats, errors: string[]) => {
    // Check if material already exists by name and unit
    const { data: existing } = await supabase
      .from('sales_materials')
      .select('id')
      .eq('name', item.name)
      .eq('unit', item.unit || 'Manchester')
      .maybeSingle();

    if (existing) {
      stats.skipped++;
      return;
    }

    const { error } = await supabase.from('sales_materials').insert({
      company_id: currentCompanyId!,
      name: item.name,
      type: item.type || 'pdf',
      unit: item.unit || 'Manchester',
      file_url: item.file_url,
      file_path: item.file_path || null,
      photo_urls: item.photo_urls || [],
      guest_count: item.guest_count || null,
      sort_order: item.sort_order || 0,
      is_active: item.is_active ?? true,
      created_at: item.created_at || new Date().toISOString(),
    });

    if (error) {
      stats.errors++;
      errors.push(`Material ${item.name}: ${error.message}`);
    } else {
      stats.success++;
    }
  };

  const importBotConfig = async (item: any, stats: ImportStats, errors: string[]) => {
    // Get instance ID for the unit
    const { data: instance } = await supabase
      .from('wapi_instances')
      .select('id')
      .eq('unit', item.unit || 'Manchester')
      .maybeSingle();

    if (!instance) {
      stats.errors++;
      errors.push(`Config Bot: Instância da unidade ${item.unit} não encontrada`);
      return;
    }

    // Import bot settings if present
    if (item.settings) {
      const { data: existingSettings } = await supabase
        .from('wapi_bot_settings')
        .select('id')
        .eq('instance_id', instance.id)
        .maybeSingle();

      if (existingSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('wapi_bot_settings')
          .update({
            welcome_message: item.settings.welcome_message,
            completion_message: item.settings.completion_message,
            transfer_message: item.settings.transfer_message,
            qualified_lead_message: item.settings.qualified_lead_message,
            next_step_question: item.settings.next_step_question,
            next_step_visit_response: item.settings.next_step_visit_response,
            next_step_questions_response: item.settings.next_step_questions_response,
            next_step_analyze_response: item.settings.next_step_analyze_response,
            follow_up_enabled: item.settings.follow_up_enabled ?? true,
            follow_up_message: item.settings.follow_up_message,
            follow_up_delay_hours: item.settings.follow_up_delay_hours || 24,
            follow_up_2_enabled: item.settings.follow_up_2_enabled ?? false,
            follow_up_2_message: item.settings.follow_up_2_message,
            follow_up_2_delay_hours: item.settings.follow_up_2_delay_hours || 48,
            auto_send_materials: item.settings.auto_send_materials ?? true,
            auto_send_pdf: item.settings.auto_send_pdf ?? true,
            auto_send_pdf_intro: item.settings.auto_send_pdf_intro,
            auto_send_photos: item.settings.auto_send_photos ?? true,
            auto_send_photos_intro: item.settings.auto_send_photos_intro,
            auto_send_presentation_video: item.settings.auto_send_presentation_video ?? true,
            auto_send_promo_video: item.settings.auto_send_promo_video ?? true,
            message_delay_seconds: item.settings.message_delay_seconds || 5,
            bot_enabled: item.settings.bot_enabled ?? false,
          })
          .eq('id', existingSettings.id);

        if (error) {
          errors.push(`Settings Bot: ${error.message}`);
        }
      } else {
        // Insert new settings
        const { error } = await supabase.from('wapi_bot_settings').insert({
          instance_id: instance.id,
          ...item.settings,
        });

        if (error) {
          errors.push(`Settings Bot: ${error.message}`);
        }
      }
    }

    // Import bot questions if present
    if (item.questions && Array.isArray(item.questions)) {
      for (const question of item.questions) {
        // Check if question with same step already exists
        const { data: existingQ } = await supabase
          .from('wapi_bot_questions')
          .select('id')
          .eq('instance_id', instance.id)
          .eq('step', question.step)
          .maybeSingle();

        if (existingQ) {
          // Update existing question
          const { error } = await supabase
            .from('wapi_bot_questions')
            .update({
              question_text: question.question_text,
              confirmation_text: question.confirmation_text || null,
              sort_order: question.sort_order || 0,
              is_active: question.is_active ?? true,
            })
            .eq('id', existingQ.id);

          if (error) {
            errors.push(`Pergunta ${question.step}: ${error.message}`);
          }
        } else {
          // Insert new question
          const { error } = await supabase.from('wapi_bot_questions').insert({
            company_id: currentCompanyId!,
            instance_id: instance.id,
            step: question.step,
            question_text: question.question_text,
            confirmation_text: question.confirmation_text || null,
            sort_order: question.sort_order || 0,
            is_active: question.is_active ?? true,
          });

          if (error) {
            errors.push(`Pergunta ${question.step}: ${error.message}`);
          }
        }
      }
    }

    stats.success++;
  };

  const downloadTemplate = (type: ImportType) => {
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
      case 'materials':
        template = [{
          name: "Pacote 50 convidados",
          type: "pdf",
          unit: "Manchester",
          file_url: "https://exemplo.com/pacote-50.pdf",
          guest_count: 50,
          sort_order: 1,
          is_active: true
        }, {
          name: "Coleção Fotos Salão Principal",
          type: "colecao",
          unit: "Manchester",
          file_url: "https://exemplo.com/foto-principal.jpg",
          photo_urls: [
            "https://exemplo.com/foto1.jpg",
            "https://exemplo.com/foto2.jpg",
            "https://exemplo.com/foto3.jpg"
          ],
          sort_order: 2,
          is_active: true
        }, {
          name: "Vídeo Apresentação",
          type: "video",
          unit: "Manchester",
          file_url: "https://exemplo.com/video-apresentacao.mp4",
          sort_order: 3,
          is_active: true
        }];
        break;
      case 'bot_config':
        template = [{
          unit: "Manchester",
          settings: {
            bot_enabled: true,
            welcome_message: "Olá! 👋 Seja bem-vindo ao Castelo das Festas!",
            completion_message: "Obrigado pelas informações! Em breve entraremos em contato.",
            transfer_message: "Transferindo você para nossa equipe comercial...",
            qualified_lead_message: "Excelente! Você é um lead qualificado!",
            next_step_question: "Qual seria o próximo passo ideal para você?",
            next_step_visit_response: "Ótimo! Vamos agendar sua visita!",
            next_step_questions_response: "Claro! Estou aqui para responder suas dúvidas.",
            next_step_analyze_response: "Sem problemas! Analise com calma.",
            follow_up_enabled: true,
            follow_up_message: "Olá! Vi que você demonstrou interesse em nosso espaço. Posso ajudar?",
            follow_up_delay_hours: 24,
            follow_up_2_enabled: true,
            follow_up_2_message: "Oi! Ainda temos disponibilidade para sua data. Gostaria de agendar uma visita?",
            follow_up_2_delay_hours: 48,
            auto_send_materials: true,
            auto_send_pdf: true,
            auto_send_pdf_intro: "Segue nosso catálogo de pacotes:",
            auto_send_photos: true,
            auto_send_photos_intro: "Veja algumas fotos do nosso espaço:",
            auto_send_presentation_video: true,
            auto_send_promo_video: true,
            message_delay_seconds: 5
          },
          questions: [
            {
              step: "nome",
              question_text: "Para começar, qual é o seu nome?",
              confirmation_text: "Prazer, {nome}!",
              sort_order: 1,
              is_active: true
            },
            {
              step: "data",
              question_text: "Qual a data prevista para o evento?",
              confirmation_text: "Anotado! Evento em {data}.",
              sort_order: 2,
              is_active: true
            },
            {
              step: "convidados",
              question_text: "Quantos convidados você espera?",
              confirmation_text: "Perfeito! {convidados} convidados.",
              sort_order: 3,
              is_active: true
            }
          ]
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

        <Tabs value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="leads" className="gap-1 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Leads</span>
            </TabsTrigger>
            <TabsTrigger value="conversations" className="gap-1 text-xs sm:text-sm">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Conversas</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1 text-xs sm:text-sm">
              <MessagesSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Mensagens</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="gap-1 text-xs sm:text-sm">
              <FileImage className="h-4 w-4" />
              <span className="hidden sm:inline">Materiais</span>
            </TabsTrigger>
            <TabsTrigger value="bot_config" className="gap-1 text-xs sm:text-sm">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Bot</span>
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

          <TabsContent value="materials" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Campos esperados para Materiais:</h4>
              <p className="text-sm text-muted-foreground">
                name, type (pdf/colecao/video/foto), unit, file_url, photo_urls (array para coleções), guest_count, sort_order, is_active
              </p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p><strong>Tipos disponíveis:</strong></p>
                <ul className="list-disc list-inside ml-2">
                  <li><code>pdf</code> - Pacotes e orçamentos em PDF</li>
                  <li><code>colecao</code> - Coleção de fotos (use photo_urls para múltiplas)</li>
                  <li><code>video</code> - Vídeos de apresentação</li>
                  <li><code>foto</code> - Fotos individuais</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bot_config" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Configuração do Bot de Atendimento:</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Importe as configurações e perguntas do fluxo de conversação do bot.
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p><strong>Estrutura do JSON:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><code>unit</code> - Nome da unidade (ex: "Manchester")</li>
                  <li><code>settings</code> - Objeto com configurações do bot (mensagens, delays, automações)</li>
                  <li><code>questions</code> - Array de perguntas do fluxo</li>
                </ul>
                <p className="mt-2"><strong>Campos de cada pergunta:</strong></p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li><code>step</code> - Identificador único (nome, data, convidados, etc.)</li>
                  <li><code>question_text</code> - Texto da pergunta</li>
                  <li><code>confirmation_text</code> - Mensagem de confirmação (opcional)</li>
                  <li><code>sort_order</code> - Ordem no fluxo</li>
                </ul>
              </div>
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
