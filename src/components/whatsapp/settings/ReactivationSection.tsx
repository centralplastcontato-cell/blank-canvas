import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Sparkles, Clock, Shield, MessageSquare, CalendarClock, Target, BarChart3, Info } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ReactivationSettings {
  id?: string;
  company_id: string;
  is_enabled: boolean;
  send_window_start: number;
  send_window_end: number;
  safety_interval_min_seconds: number;
  safety_interval_max_seconds: number;
  trigger_three_months_enabled: boolean;
  trigger_two_months_enabled: boolean;
  trigger_one_month_enabled: boolean;
  message_three_months: string;
  message_two_months: string;
  message_one_month: string;
  require_party_date: boolean;
  require_human_interaction: boolean;
  eligible_statuses: string[];
  exclude_closed: boolean;
  exclude_lost: boolean;
  exclude_existing_event: boolean;
  min_days_without_reply: number;
  max_messages_per_lead: number;
  // Fase 4B
  interactive_options_enabled: boolean;
  capture_window_hours: number;
  pause_days_on_analyzing: number;
  option_1_label: string;
  option_2_label: string;
  option_3_label: string;
}

interface ReactivationMetrics {
  total_eligible: number;
  total_sent: number;
  total_replied: number;
  total_closed: number;
}

const DEFAULT_SETTINGS: Omit<ReactivationSettings, 'company_id'> = {
  is_enabled: false,
  send_window_start: 8,
  send_window_end: 22,
  safety_interval_min_seconds: 60,
  safety_interval_max_seconds: 120,
  trigger_three_months_enabled: false,
  trigger_two_months_enabled: true,
  trigger_one_month_enabled: true,
  message_three_months: 'Oi {{primeiro_nome}}! 😊 Faltam poucos meses para {{mes_festa}} e já estamos organizando as festas desse período. Se ainda tiver interesse, posso verificar as opções disponíveis!',
  message_two_months: 'Oi {{primeiro_nome}}! 😊 Estamos começando a organizar as festas de {{mes_festa}}. Se você ainda tiver interesse em fazer a festa com a gente, posso verificar as opções disponíveis.',
  message_one_month: 'Oi {{primeiro_nome}}! Entramos no período das reservas de {{mes_festa}} e algumas datas já estão sendo preenchidas. Se quiser, posso verificar a disponibilidade para sua festa.',
  require_party_date: true,
  require_human_interaction: false,
  eligible_statuses: ['novo', 'em_contato', 'orcamento_enviado', 'aguardando_resposta'],
  exclude_closed: true,
  exclude_lost: true,
  exclude_existing_event: true,
  min_days_without_reply: 7,
  max_messages_per_lead: 2,
};

const AVAILABLE_STATUSES = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_contato', label: 'Visita' },
  { value: 'orcamento_enviado', label: 'Orçamento Enviado' },
  { value: 'aguardando_resposta', label: 'Negociando' },
  { value: 'cliente_retorno', label: 'Cliente Retorno' },
];

const DYNAMIC_VARIABLES = [
  { var: '{{nome}}', desc: 'Nome completo do lead' },
  { var: '{{primeiro_nome}}', desc: 'Primeiro nome do lead' },
  { var: '{{mes_festa}}', desc: 'Mês da festa (ex: Outubro)' },
  { var: '{{buffet}}', desc: 'Nome da empresa/buffet' },
  { var: '{{telefone}}', desc: 'Telefone do lead' },
];

export function ReactivationSection() {
  const { currentCompanyId } = useCompany();
  const [settings, setSettings] = useState<ReactivationSettings | null>(null);
  const [metrics, setMetrics] = useState<ReactivationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentCompanyId) {
      fetchSettings();
      fetchMetrics();
    }
  }, [currentCompanyId]);

  const fetchSettings = async () => {
    if (!currentCompanyId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('automation_reactivation_settings')
      .select('*')
      .eq('company_id', currentCompanyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching reactivation settings:', error);
      toast({ title: 'Erro ao carregar configurações', variant: 'destructive' });
    }

    if (data) {
      setSettings(data as unknown as ReactivationSettings);
    } else {
      setSettings({ ...DEFAULT_SETTINGS, company_id: currentCompanyId });
    }
    setIsLoading(false);
  };

  const fetchMetrics = async () => {
    if (!currentCompanyId) return;

    const { data: history } = await supabase
      .from('lead_reactivation_history')
      .select('id, status, lead_id')
      .eq('company_id', currentCompanyId);

    if (history) {
      const sent = history.filter(h => h.status === 'sent').length;
      // Basic metrics from history data
      setMetrics({
        total_eligible: 0,
        total_sent: sent,
        total_replied: 0,
        total_closed: 0,
      });
    }
  };

  const saveSettings = async () => {
    if (!settings || !currentCompanyId) return;
    setIsSaving(true);

    try {
      const payload = { ...settings, company_id: currentCompanyId };
      delete (payload as any).id;

      if (settings.id) {
        const { error } = await supabase
          .from('automation_reactivation_settings')
          .update(payload as any)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('automation_reactivation_settings')
          .insert(payload as any)
          .select()
          .single();
        if (error) throw error;
        if (data) setSettings(data as unknown as ReactivationSettings);
      }

      toast({ title: '✅ Configurações de reativação salvas' });
    } catch (err: any) {
      console.error('Error saving reactivation settings:', err);
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof ReactivationSettings>(key: K, value: ReactivationSettings[K]) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  const toggleStatus = (status: string) => {
    if (!settings) return;
    const current = settings.eligible_statuses || [];
    if (current.includes(status)) {
      updateField('eligible_statuses', current.filter(s => s !== status));
    } else {
      updateField('eligible_statuses', [...current, status]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-4">
      {/* Header + Save */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Reativação Inteligente</h3>
          <Badge variant="outline" className="text-xs">Fase 4</Badge>
        </div>
        <Button onClick={saveSettings} disabled={isSaving} size="sm" className="gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Reativa automaticamente leads que já conversaram com o buffet e não fecharam, usando o mês da festa como gatilho principal. Independente do follow-up do robô.
      </p>

      {/* Metrics Cards */}
      {metrics && metrics.total_sent > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Enviadas</p>
            <p className="text-2xl font-bold">{metrics.total_sent}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Respostas</p>
            <p className="text-2xl font-bold">{metrics.total_replied}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Fechamentos</p>
            <p className="text-2xl font-bold">{metrics.total_closed}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Taxa Resposta</p>
            <p className="text-2xl font-bold">
              {metrics.total_sent > 0 ? Math.round((metrics.total_replied / metrics.total_sent) * 100) : 0}%
            </p>
          </Card>
        </div>
      )}

      {/* 1. Global Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-3 p-4 border rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-full shrink-0 ${settings.is_enabled ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-medium">Reativação Automática</h4>
                <p className="text-xs text-muted-foreground">
                  Ativa o motor de reativação inteligente por mês da festa
                </p>
              </div>
            </div>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(checked) => updateField('is_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Send Window + Safety Interval */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Janela de Envio e Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm">Hora Inicial</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={settings.send_window_start}
                onChange={(e) => updateField('send_window_start', parseInt(e.target.value) || 8)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Hora Final</Label>
              <Input
                type="number"
                min={0}
                max={23}
                value={settings.send_window_end}
                onChange={(e) => updateField('send_window_end', parseInt(e.target.value) || 22)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Mensagens fora deste horário serão adiadas para o próximo período permitido.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm">Intervalo Mín (segundos)</Label>
              <Input
                type="number"
                min={10}
                max={300}
                value={settings.safety_interval_min_seconds}
                onChange={(e) => updateField('safety_interval_min_seconds', parseInt(e.target.value) || 60)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Intervalo Máx (segundos)</Label>
              <Input
                type="number"
                min={10}
                max={300}
                value={settings.safety_interval_max_seconds}
                onChange={(e) => updateField('safety_interval_max_seconds', parseInt(e.target.value) || 120)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Delay aleatório entre envios para diferentes leads. Reduz risco de bloqueio no WhatsApp.
          </p>
        </CardContent>
      </Card>

      {/* 3. Triggers by Month Proximity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            Gatilhos por Mês da Festa
          </CardTitle>
          <CardDescription>
            Configure quando o sistema deve enviar mensagens de reativação com base na proximidade do mês da festa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 3 months before */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">3 meses antes</Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent><p className="text-xs max-w-[200px]">Ex: Festa em Outubro → mensagem em Julho</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                checked={settings.trigger_three_months_enabled}
                onCheckedChange={(checked) => updateField('trigger_three_months_enabled', checked)}
              />
            </div>
            {settings.trigger_three_months_enabled && (
              <div className="space-y-2">
                <Label className="text-xs">Mensagem</Label>
                <Textarea
                  value={settings.message_three_months}
                  onChange={(e) => updateField('message_three_months', e.target.value)}
                  className="min-h-[100px] text-sm"
                />
              </div>
            )}
          </div>

          {/* 2 months before */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">2 meses antes</Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent><p className="text-xs max-w-[200px]">Ex: Festa em Outubro → mensagem em Agosto</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                checked={settings.trigger_two_months_enabled}
                onCheckedChange={(checked) => updateField('trigger_two_months_enabled', checked)}
              />
            </div>
            {settings.trigger_two_months_enabled && (
              <div className="space-y-2">
                <Label className="text-xs">Mensagem</Label>
                <Textarea
                  value={settings.message_two_months}
                  onChange={(e) => updateField('message_two_months', e.target.value)}
                  className="min-h-[100px] text-sm"
                />
              </div>
            )}
          </div>

          {/* 1 month before */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">1 mês antes</Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent><p className="text-xs max-w-[200px]">Ex: Festa em Outubro → mensagem em Setembro</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                checked={settings.trigger_one_month_enabled}
                onCheckedChange={(checked) => updateField('trigger_one_month_enabled', checked)}
              />
            </div>
            {settings.trigger_one_month_enabled && (
              <div className="space-y-2">
                <Label className="text-xs">Mensagem</Label>
                <Textarea
                  value={settings.message_one_month}
                  onChange={(e) => updateField('message_one_month', e.target.value)}
                  className="min-h-[100px] text-sm"
                />
              </div>
            )}
          </div>

          {/* Variables Reference */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium mb-2 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              Variáveis disponíveis
            </p>
            <div className="flex flex-wrap gap-2">
              {DYNAMIC_VARIABLES.map(v => (
                <TooltipProvider key={v.var}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="secondary" className="text-xs font-mono cursor-help">{v.var}</Badge>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">{v.desc}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Eligibility Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            Regras de Elegibilidade
          </CardTitle>
          <CardDescription>
            Defina quais leads podem receber mensagens de reativação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Exigir mês/data da festa preenchido</p>
              <p className="text-xs text-muted-foreground">Apenas leads com informação de mês da festa</p>
            </div>
            <Switch
              checked={settings.require_party_date}
              onCheckedChange={(checked) => updateField('require_party_date', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Exigir interação humana anterior</p>
              <p className="text-xs text-muted-foreground">Apenas leads que tiveram human_takeover</p>
            </div>
            <Switch
              checked={settings.require_human_interaction}
              onCheckedChange={(checked) => updateField('require_human_interaction', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Excluir leads Fechados</p>
              <p className="text-xs text-muted-foreground">Não reativar leads que já fecharam</p>
            </div>
            <Switch
              checked={settings.exclude_closed}
              onCheckedChange={(checked) => updateField('exclude_closed', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Excluir leads Perdidos</p>
              <p className="text-xs text-muted-foreground">Não reativar leads marcados como perdidos</p>
            </div>
            <Switch
              checked={settings.exclude_lost}
              onCheckedChange={(checked) => updateField('exclude_lost', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Excluir leads com festa criada</p>
              <p className="text-xs text-muted-foreground">Não reativar leads que já possuem evento na agenda</p>
            </div>
            <Switch
              checked={settings.exclude_existing_event}
              onCheckedChange={(checked) => updateField('exclude_existing_event', checked)}
            />
          </div>

          {/* Eligible Statuses */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Estágios elegíveis para reativação</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_STATUSES.map(s => (
                <label key={s.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={settings.eligible_statuses?.includes(s.value)}
                    onCheckedChange={() => toggleStatus(s.value)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm">Dias sem resposta (mínimo)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={settings.min_days_without_reply}
                onChange={(e) => updateField('min_days_without_reply', parseInt(e.target.value) || 7)}
              />
              <p className="text-xs text-muted-foreground">Lead precisa estar inativo há pelo menos X dias</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Máx mensagens por lead</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={settings.max_messages_per_lead}
                onChange={(e) => updateField('max_messages_per_lead', parseInt(e.target.value) || 2)}
              />
              <p className="text-xs text-muted-foreground">Limite total de mensagens de reativação</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
