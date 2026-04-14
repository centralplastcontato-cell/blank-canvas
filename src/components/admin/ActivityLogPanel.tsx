import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Search, Filter, ChevronLeft, ChevronRight, User, Clock, FileText, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  user_name: string | null;
  action: string;
  module: string;
  entity_type: string | null;
  entity_name: string | null;
  details: any;
  created_at: string;
  user_agent: string | null;
}

const MODULE_LABELS: Record<string, string> = {
  crm: 'CRM',
  events: 'Eventos',
  financial: 'Financeiro',
  contracts: 'Contratos',
  settings: 'Configurações',
  campaigns: 'Campanhas',
  attendance: 'Presença',
  forms: 'Formulários',
  whatsapp: 'WhatsApp',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Criou',
  update: 'Editou',
  delete: 'Excluiu',
  send: 'Enviou',
  sign: 'Assinou',
  login: 'Login',
  status_change: 'Alterou status',
  payment: 'Pagamento',
  export: 'Exportou',
  import: 'Importou',
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  update: 'bg-blue-500/10 text-blue-600 border-blue-200',
  delete: 'bg-red-500/10 text-red-600 border-red-200',
  send: 'bg-violet-500/10 text-violet-600 border-violet-200',
  sign: 'bg-amber-500/10 text-amber-600 border-amber-200',
  login: 'bg-gray-500/10 text-gray-600 border-gray-200',
  status_change: 'bg-orange-500/10 text-orange-600 border-orange-200',
  payment: 'bg-green-500/10 text-green-600 border-green-200',
  export: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  import: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
};

const PAGE_SIZE = 30;

export function ActivityLogPanel() {
  const { currentCompany } = useCompany();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const fetchLogs = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);

    let query = supabase
      .from('activity_logs')
      .select('id, user_name, action, module, entity_type, entity_name, details, created_at, user_agent', { count: 'exact' })
      .eq('company_id', currentCompany.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (moduleFilter !== 'all') query = query.eq('module', moduleFilter);
    if (actionFilter !== 'all') query = query.eq('action', actionFilter);
    if (search) query = query.or(`user_name.ilike.%${search}%,entity_name.ilike.%${search}%`);

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching activity logs:', error);
    } else {
      setLogs(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [currentCompany?.id, page, moduleFilter, actionFilter, search]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatDescription = (log: ActivityLog): string => {
    const action = ACTION_LABELS[log.action] || log.action;
    const entity = log.entity_name || log.entity_type || '';
    return `${action} ${entity}`.trim();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Log de Atividades
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário ou registro..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 h-9"
              />
            </div>
            <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos módulos</SelectItem>
                {Object.entries(MODULE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas ações</SelectItem>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <div className="text-xs text-muted-foreground">
            {totalCount} registro{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
          </div>

          {/* Log entries */}
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-2">
              {loading ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Carregando...</div>
              ) : logs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Nenhuma atividade registrada
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/30 transition-colors">
                    <div className="shrink-0 mt-0.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground">{log.user_name || 'Sistema'}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ACTION_COLORS[log.action] || ''}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {MODULE_LABELS[log.module] || log.module}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDescription(log)}</p>
                      {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                        <details className="mt-1">
                          <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                            <FileText className="h-3 w-3 inline mr-1" />
                            Ver detalhes
                          </summary>
                          <pre className="mt-1 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground overflow-auto max-h-32">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
