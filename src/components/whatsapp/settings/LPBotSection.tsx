import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Plus, X, AlertTriangle, RefreshCw, Route } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

interface LPBotSettings {
  id?: string;
  company_id: string;
  welcome_message: string;
  month_question: string;
  guest_question: string;
  name_question: string;
  whatsapp_question: string;
  completion_message: string;
  month_options: string[];
  guest_options: string[];
  guest_limit: number | null;
  guest_limit_message: string | null;
  guest_limit_redirect_name: string | null;
  redirect_completion_message: string | null;
  auto_rotate_months: boolean;
  whatsapp_welcome_template: string | null;
  lead_routing_mode: string;
}

const DEFAULTS: Omit<LPBotSettings, 'company_id'> = {
  welcome_message: 'Oi 👋 Que bom te ver por aqui!\n\nVou te fazer algumas perguntas rápidas para montar seu orçamento 😉',
  month_question: 'Para qual mês você pretende realizar a festa?',
  guest_question: 'Para quantas pessoas será a festa?',
  name_question: 'Digite seu nome:',
  whatsapp_question: 'Digite seu WhatsApp:',
  completion_message: 'Prontinho 🎉\n\nRecebemos suas informações e nossa equipe vai entrar em contato em breve para confirmar valores e disponibilidade da sua data.\n\nAcabei de te enviar uma mensagem no seu WhatsApp, dá uma olhadinha lá! 📲',
  month_options: ["Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
  guest_options: ["Até 50 pessoas", "51 a 70 pessoas", "71 a 100 pessoas", "101 a 150 pessoas", "Mais de 150 pessoas"],
  guest_limit: null,
  guest_limit_message: null,
  guest_limit_redirect_name: null,
  redirect_completion_message: null,
  auto_rotate_months: false,
  whatsapp_welcome_template: 'Olá! 👋🏼✨\n\nVim pelo site do *{empresa}* e gostaria de saber mais!\n\n📋 *Meus dados:*\n👤 Nome: {nome}\n📍 Local: {empresa}\n📅 Data: {data}\n👥 Convidados: {convidados}\n\nVou dar continuidade no seu atendimento!! 🚀\n\nEscolha a opção que mais te agrada 👇\n\n1️⃣ - 📩 Receber agora meu orçamento\n2️⃣ - 💬 Falar com um atendente',
  lead_routing_mode: 'auto',
};

export function LPBotSection() {
  const { currentCompany } = useCompany();
  const [settings, setSettings] = useState<LPBotSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMonthOption, setNewMonthOption] = useState("");
  const [newGuestOption, setNewGuestOption] = useState("");
  const [instances, setInstances] = useState<{ id: string; unit: string }[]>([]);

  useEffect(() => {
    if (!currentCompany?.id) return;
    loadSettings();
    loadInstances();
  }, [currentCompany?.id]);

  const loadInstances = async () => {
    if (!currentCompany?.id) return;
    const { data } = await supabase
      .from('wapi_instances')
      .select('id, unit')
      .eq('company_id', currentCompany.id)
      .order('created_at', { ascending: true });
    setInstances((data || []).filter((i: any) => i.unit));
  };

  const loadSettings = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('lp_bot_settings')
      .select('*')
      .eq('company_id', currentCompany.id)
      .maybeSingle();

    if (data) {
      setSettings({
        id: data.id,
        company_id: data.company_id,
        welcome_message: data.welcome_message || DEFAULTS.welcome_message,
        month_question: data.month_question || DEFAULTS.month_question,
        guest_question: data.guest_question || DEFAULTS.guest_question,
        name_question: data.name_question || DEFAULTS.name_question,
        whatsapp_question: data.whatsapp_question || DEFAULTS.whatsapp_question,
        completion_message: data.completion_message || DEFAULTS.completion_message,
        month_options: (data.month_options as string[]) || DEFAULTS.month_options,
        guest_options: (data.guest_options as string[]) || DEFAULTS.guest_options,
        guest_limit: data.guest_limit,
        guest_limit_message: data.guest_limit_message,
        guest_limit_redirect_name: data.guest_limit_redirect_name,
        redirect_completion_message: (data as any).redirect_completion_message || null,
        auto_rotate_months: (data as any).auto_rotate_months ?? false,
        whatsapp_welcome_template: (data as any).whatsapp_welcome_template || DEFAULTS.whatsapp_welcome_template,
        lead_routing_mode: (data as any).lead_routing_mode || 'auto',
      });
    } else {
      setSettings({
        company_id: currentCompany.id,
        ...DEFAULTS,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings || !currentCompany?.id) return;
    setSaving(true);

    const payload = {
      company_id: currentCompany.id,
      welcome_message: settings.welcome_message,
      month_question: settings.month_question,
      guest_question: settings.guest_question,
      name_question: settings.name_question,
      whatsapp_question: settings.whatsapp_question,
      completion_message: settings.completion_message,
      month_options: settings.month_options,
      guest_options: settings.guest_options,
      guest_limit: settings.guest_limit || null,
      guest_limit_message: settings.guest_limit_message || null,
      guest_limit_redirect_name: settings.guest_limit_redirect_name || null,
      redirect_completion_message: settings.redirect_completion_message || null,
      auto_rotate_months: settings.auto_rotate_months,
      whatsapp_welcome_template: settings.whatsapp_welcome_template || null,
      lead_routing_mode: settings.lead_routing_mode,
    };

    let error;
    if (settings.id) {
      ({ error } = await supabase.from('lp_bot_settings').update(payload).eq('id', settings.id));
    } else {
      const { data, error: insertError } = await supabase.from('lp_bot_settings').insert(payload).select().single();
      error = insertError;
      if (data) setSettings(prev => prev ? { ...prev, id: data.id } : prev);
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvo com sucesso!", description: "As configurações do Bot LP foram atualizadas." });
    }
    setSaving(false);
  };

  const updateField = (field: keyof LPBotSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const addOption = (field: 'month_options' | 'guest_options', value: string, setter: (v: string) => void) => {
    if (!value.trim() || !settings) return;
    updateField(field, [...settings[field], value.trim()]);
    setter("");
  };

  const removeOption = (field: 'month_options' | 'guest_options', index: number) => {
    if (!settings) return;
    updateField(field, settings[field].filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Welcome & Completion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mensagens Principais</CardTitle>
          <CardDescription>Mensagem de boas-vindas e conclusão do chatbot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mensagem de boas-vindas</Label>
            <Textarea
              value={settings.welcome_message}
              onChange={(e) => updateField('welcome_message', e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Mensagem de conclusão</Label>
            <Textarea
              value={settings.completion_message}
              onChange={(e) => updateField('completion_message', e.target.value)}
              rows={3}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Mensagem de WhatsApp (pós-formulário)</Label>
            <Textarea
              value={settings.whatsapp_welcome_template ?? ''}
              onChange={(e) => updateField('whatsapp_welcome_template', e.target.value || null)}
              rows={6}
              placeholder={`Olá! 👋🏼✨\n\nVim pelo site do *{empresa}* e gostaria de saber mais!\n\n📋 *Meus dados:*\n👤 Nome: {nome}\n📍 Local: {empresa}\n📅 Data: {data}\n👥 Convidados: {convidados}`}
            />
            <p className="text-xs text-muted-foreground">
              Variáveis disponíveis: <code>{'{nome}'}</code>, <code>{'{unidade}'}</code>, <code>{'{data}'}</code>, <code>{'{convidados}'}</code>, <code>{'{empresa}'}</code>. Deixe vazio para usar a mensagem padrão.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perguntas do Bot</CardTitle>
          <CardDescription>Textos de cada etapa da conversa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pergunta do mês</Label>
            <Input value={settings.month_question} onChange={(e) => updateField('month_question', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Pergunta de convidados</Label>
            <Input value={settings.guest_question} onChange={(e) => updateField('guest_question', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Pergunta do nome</Label>
            <Input value={settings.name_question} onChange={(e) => updateField('name_question', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Pergunta do WhatsApp</Label>
            <Input value={settings.whatsapp_question} onChange={(e) => updateField('whatsapp_question', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Month Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opções de Meses</CardTitle>
          <CardDescription>Meses disponíveis para seleção no chatbot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Rotação automática de meses
              </Label>
              <p className="text-xs text-muted-foreground">
                No dia 1 de cada mês, remove o mês que passou e adiciona um novo mês futuro automaticamente
              </p>
            </div>
            <Switch
              checked={settings.auto_rotate_months}
              onCheckedChange={(checked) => updateField('auto_rotate_months', checked)}
            />
          </div>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {settings.month_options.map((opt, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full text-sm">
                {opt}
                <button onClick={() => removeOption('month_options', i)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newMonthOption}
              onChange={(e) => setNewMonthOption(e.target.value)}
              placeholder="Ex: Janeiro"
              onKeyDown={(e) => e.key === 'Enter' && addOption('month_options', newMonthOption, setNewMonthOption)}
            />
            <Button variant="outline" size="icon" onClick={() => addOption('month_options', newMonthOption, setNewMonthOption)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guest Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opções de Convidados</CardTitle>
          <CardDescription>Faixas de convidados disponíveis para seleção</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {settings.guest_options.map((opt, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full text-sm">
                {opt}
                <button onClick={() => removeOption('guest_options', i)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newGuestOption}
              onChange={(e) => setNewGuestOption(e.target.value)}
              placeholder="Ex: 91 a 120 pessoas"
              onKeyDown={(e) => e.key === 'Enter' && addOption('guest_options', newGuestOption, setNewGuestOption)}
            />
            <Button variant="outline" size="icon" onClick={() => addOption('guest_options', newGuestOption, setNewGuestOption)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guest Limit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Limite de Convidados
          </CardTitle>
          <CardDescription>Configure um limite máximo e redirecione leads acima da capacidade</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Limite máximo de convidados (deixe vazio para sem limite)</Label>
            <Input
              type="number"
              value={settings.guest_limit ?? ''}
              onChange={(e) => updateField('guest_limit', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Ex: 90"
            />
          </div>
          {settings.guest_limit && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Mensagem de redirecionamento</Label>
                <Textarea
                  value={settings.guest_limit_message ?? ''}
                  onChange={(e) => updateField('guest_limit_message', e.target.value)}
                  placeholder="Ex: Nossa capacidade máxima é de 90 convidados. Podemos direcionar seu contato para o Buffet Mega Magic?"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do buffet parceiro</Label>
                <Input
                  value={settings.guest_limit_redirect_name ?? ''}
                  onChange={(e) => updateField('guest_limit_redirect_name', e.target.value)}
                  placeholder="Ex: Buffet Mega Magic"
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Mensagem de conclusão (chat da LP)</Label>
                <Textarea
                  value={settings.redirect_completion_message ?? ''}
                  onChange={(e) => updateField('redirect_completion_message', e.target.value)}
                  placeholder="Ex: Prontinho! 🎉 Seus dados foram encaminhados para o Buffet Mega Magic. Eles entrarão em contato em breve!"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Mensagem exibida no chat quando o lead é redirecionado. Se vazio, usa um texto padrão.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lead Routing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="w-4 h-4 text-primary" />
            Distribuição de Leads da Landing Page
          </CardTitle>
          <CardDescription>Escolha qual instância do WhatsApp recebe os leads da LP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={settings.lead_routing_mode}
            onValueChange={(value) => updateField('lead_routing_mode', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o modo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">🔄 Automático (Round-Robin)</SelectItem>
              <SelectItem value="vendas1">📱 Apenas Vendas 1</SelectItem>
              <SelectItem value="vendas2">📱 Apenas Vendas 2</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {settings.lead_routing_mode === 'auto' 
              ? 'Leads serão alternados automaticamente entre Vendas 1 e Vendas 2.'
              : settings.lead_routing_mode === 'vendas1'
              ? 'Todos os leads da LP serão direcionados para Vendas 1.'
              : 'Todos os leads da LP serão direcionados para Vendas 2.'}
          </p>
        </CardContent>
      </Card>


      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Salvar configurações do Bot LP
      </Button>
    </div>
  );
}
