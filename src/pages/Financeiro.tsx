import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useFinanceiroDashboard } from '@/hooks/useFinanceiroDashboard';
import { useCompanyUnits } from '@/hooks/useCompanyUnits';
import { useCompany } from '@/contexts/CompanyContext';
import { FinancialPaymentCard } from '@/components/financial/FinancialPaymentCard';
import { PaymentsByClientView } from '@/components/financial/PaymentsByClientView';
import { ExpenseFormDialog } from '@/components/financial/ExpenseFormDialog';
import { EventFinancialTab } from '@/components/financial/EventFinancialTab';
import { FinancialReportDialog } from '@/components/financial/FinancialReportDialog';
import { MarkExpensePaidDialog } from '@/components/financial/MarkExpensePaidDialog';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { MobileMenu } from '@/components/admin/MobileMenu';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DollarSign, TrendingUp, AlertTriangle, CalendarDays, Loader2, Menu, Plus, Trash2, Wallet, Scale, Building, Zap, PartyPopper, List, Users, ChevronLeft, ChevronRight, ExternalLink, ArrowUpDown, CalendarRange, X, FileText, CheckCircle, RotateCcw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { DateRange } from 'react-day-picker';

const PAGE_SIZE = 20;

type PeriodPreset = 'mes' | 'bimestre' | 'trimestre' | 'semestre' | 'ano' | 'custom';

function getPresetRange(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date();
  const fmtd = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (preset) {
    case 'mes': return { from: fmtd(startOfMonth(now)), to: fmtd(endOfMonth(now)) };
    case 'bimestre': return { from: fmtd(startOfMonth(now)), to: fmtd(endOfMonth(addMonths(now, 1))) };
    case 'trimestre': return { from: fmtd(startOfMonth(now)), to: fmtd(endOfMonth(addMonths(now, 2))) };
    case 'semestre': return { from: fmtd(startOfMonth(now)), to: fmtd(endOfMonth(addMonths(now, 5))) };
    case 'ano': return { from: fmtd(startOfYear(now)), to: fmtd(endOfYear(now)) };
    default: return { from: fmtd(startOfMonth(now)), to: fmtd(endOfMonth(now)) };
  }
}

function PaginationControls({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="h-8 w-8 p-0">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground">
        {page} de {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="h-8 w-8 p-0">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  fornecedor: 'Fornecedor',
  freela: 'Freela',
  compras: 'Compras',
  manutencao: 'Manutenção',
  aluguel: 'Aluguel',
  outros: 'Outros',
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'mes', label: 'Mês' },
  { value: 'bimestre', label: 'Bimestre' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre', label: 'Semestre' },
  { value: 'ano', label: 'Ano' },
];

export default function Financeiro() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const { unitOptions, units } = useCompanyUnits(currentCompany?.id);
  const isSalesOnly = units.length > 0 && units.every(u => /vendas/i.test(u.name));
  const dashboard = useFinanceiroDashboard();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseDialogType, setExpenseDialogType] = useState<string>('fixa');
  const [viewMode, setViewMode] = useState<'list' | 'client'>('list');
  const [receitasSubTab, setReceitasSubTab] = useState('atraso');
  const [despesasSubTab, setDespesasSubTab] = useState('fixa');
  const [pageAtraso, setPageAtraso] = useState(1);
  const [pageReceber, setPageReceber] = useState(1);
  const [pageRecebidos, setPageRecebidos] = useState(1);
  const [pageDespesas, setPageDespesas] = useState(1);
  const [despesasSortAsc, setDespesasSortAsc] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventData, setSelectedEventData] = useState<{ title: string; event_date: string; total_value: number; status: string } | null>(null);
  const [activePreset, setActivePreset] = useState<PeriodPreset>('mes');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [markPaidExpense, setMarkPaidExpense] = useState<{ id: string; description: string } | null>(null);

  // Auth & financial permission check
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id);
      if (!data.user) navigate('/auth');
    });
  }, [navigate]);
  const financialPerms = useFinancialPermissions(currentUserId);

  // Redirect if user doesn't have financial.view permission
  useEffect(() => {
    if (!financialPerms.isLoading && currentUserId && !financialPerms.canView) {
      navigate('/atendimento');
    }
  }, [financialPerms.isLoading, financialPerms.canView, currentUserId, navigate]);

  const handlePresetChange = (preset: PeriodPreset) => {
    setActivePreset(preset);
    const range = getPresetRange(preset);
    dashboard.setFilters(f => ({ ...f, from: range.from, to: range.to }));
    setPageAtraso(1); setPageReceber(1); setPageRecebidos(1); setPageDespesas(1);
  };

  const handleCustomConfirm = () => {
    if (customRange?.from && customRange?.to) {
      const from = format(customRange.from, 'yyyy-MM-dd');
      const to = format(customRange.to, 'yyyy-MM-dd');
      dashboard.setFilters(f => ({ ...f, from, to }));
      setActivePreset('custom');
      setCustomPopoverOpen(false);
      setPageAtraso(1); setPageReceber(1); setPageRecebidos(1); setPageDespesas(1);
    }
  };

  const handleClearCustom = () => {
    handlePresetChange('mes');
    setCustomRange(undefined);
  };

  // Period display label
  const periodLabel = format(new Date(dashboard.filters.from + 'T12:00:00'), 'dd/MM/yy') + ' – ' + format(new Date(dashboard.filters.to + 'T12:00:00'), 'dd/MM/yy');

  const handleOpenEvent = async (eventId: string) => {
    setSelectedEventId(eventId);
    const { data } = await supabase
      .from('company_events')
      .select('title, event_date, total_value, status')
      .eq('id', eventId)
      .single();
    if (data) {
      setSelectedEventData({
        title: data.title,
        event_date: data.event_date,
        total_value: Number(data.total_value) || 0,
        status: data.status,
      });
    }
  };

  const handleCloseEventSheet = () => {
    setSelectedEventId(null);
    setSelectedEventData(null);
    setTimeout(() => {
      dashboard.refresh();
    }, 350);
  };

  if (dashboard.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  // Categorized payment lists
  const allPaid = dashboard.payments.filter(p => p.status === 'paid').sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''));
  const allPending = dashboard.payments.filter(p => p.status === 'pending').sort((a, b) => b.due_date.localeCompare(a.due_date));
  const allLate = [...dashboard.latePayments].sort((a, b) => b.due_date.localeCompare(a.due_date));

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar canManageUsers={false} currentUserName="" onRefresh={() => {}} onLogout={() => navigate('/auth')} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="bg-card border-b border-border shrink-0 z-10 md:hidden">
            <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MobileMenu
                    isOpen={isMobileMenuOpen}
                    onOpenChange={setIsMobileMenuOpen}
                    trigger={<Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="w-5 h-5" /></Button>}
                    currentPage="financeiro"
                    userName="" userEmail="" canManageUsers={false} isAdmin={false}
                    onRefresh={() => {}} onLogout={() => navigate('/auth')}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary/80">
                      <DollarSign className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h1 className="font-display font-bold text-foreground text-sm truncate">Financeiro</h1>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="icon" className="h-9 w-9 border-blue-300 text-blue-600 hover:bg-blue-50" onClick={() => setReportDialogOpen(true)}>
                    <FileText className="w-5 h-5" />
                  </Button>
                  <NotificationBell />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-5">
              {/* Desktop Header */}
              <div className="relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden hidden md:block">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
                <div className="relative flex items-center justify-between gap-4 p-5 md:p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                        <DollarSign className="h-7 w-7 text-primary-foreground" />
                      </div>
                      <div>
                        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Financeiro</h1>
                        <p className="text-sm text-muted-foreground/70 mt-0.5">Central de gestão financeira</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50" onClick={() => setReportDialogOpen(true)}>
                      <FileText className="h-4 w-4" />
                      Gerar Relatório
                    </Button>
                </div>
              </div>

              {/* Period Presets + Filters */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {PERIOD_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => handlePresetChange(p.value)}
                      className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap ${
                        activePreset === p.value
                          ? 'bg-foreground text-background border-foreground shadow-sm'
                          : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}

                  <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap ${
                          activePreset === 'custom'
                            ? 'bg-foreground text-background border-foreground shadow-sm'
                            : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        <CalendarRange className="h-3.5 w-3.5" />
                        Personalizado
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" side="bottom">
                      <div className="p-4 space-y-3">
                        <p className="text-sm font-semibold text-foreground">Selecione o período</p>
                        <Calendar
                          mode="range"
                          selected={customRange}
                          onSelect={setCustomRange}
                          numberOfMonths={2}
                          locale={ptBR}
                          className={cn("p-3 pointer-events-auto")}
                        />
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                          <p className="text-xs text-muted-foreground">
                            {customRange?.from && customRange?.to
                              ? `${format(customRange.from, 'dd/MM/yyyy')} – ${format(customRange.to, 'dd/MM/yyyy')}`
                              : 'Selecione início e fim'}
                          </p>
                          <Button size="sm" disabled={!customRange?.from || !customRange?.to} onClick={handleCustomConfirm}>
                            Aplicar
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Period badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary ml-1">
                    <CalendarRange className="h-3 w-3" />
                    {periodLabel}
                    {activePreset !== 'mes' && (
                      <button onClick={handleClearCustom} className="ml-1 rounded-full p-0.5 hover:bg-primary/20 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {unitOptions.length > 0 && !isSalesOnly && (
                    <Select value={dashboard.filters.unit} onValueChange={v => dashboard.setFilters(f => ({ ...f, unit: v }))}>
                      <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas unidades</SelectItem>
                        {unitOptions.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={dashboard.filters.status} onValueChange={v => dashboard.setFilters(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos status</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="late">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 5 Dashboard Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Recebido
                  </div>
                  <p className="text-lg md:text-xl font-bold text-emerald-400">{fmt(dashboard.totalReceivedMonth)}</p>
                </Card>
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-amber-400" /> A receber
                  </div>
                  <p className="text-lg md:text-xl font-bold text-amber-400">{fmt(dashboard.totalPendingMonth)}</p>
                </Card>
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> Em atraso
                  </div>
                  <p className="text-lg md:text-xl font-bold text-red-400">{fmt(dashboard.totalLate)}</p>
                </Card>
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Wallet className="h-3.5 w-3.5 text-blue-400" /> Despesas Lançadas
                  </div>
                  <p className="text-lg md:text-xl font-bold text-blue-400">{fmt(dashboard.totalExpensesMonth)}</p>
                </Card>
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-teal-400" /> Despesas Pagas
                  </div>
                  <p className="text-lg md:text-xl font-bold text-teal-400">{fmt(dashboard.totalExpensesPaidMonth)}</p>
                </Card>
                <Card className="p-4 bg-card border-border col-span-2 md:col-span-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Scale className="h-3.5 w-3.5 text-primary" /> Saldo
                  </div>
                  <p className={`text-lg md:text-xl font-bold ${dashboard.saldoMonth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(dashboard.saldoMonth)}
                  </p>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="receitas" className="w-full">
                <TabsList className="bg-transparent p-0 h-auto gap-1">
                  {['receitas', 'despesas', 'resultado'].map(tab => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="rounded-full px-5 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:shadow-none border-0"
                    >
                      {tab === 'receitas' ? 'Receitas' : tab === 'despesas' ? 'Despesas' : 'Resultado'}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Tab Receitas */}
                <TabsContent value="receitas" className="space-y-4">
                  <Tabs value={receitasSubTab} onValueChange={setReceitasSubTab} className="w-full">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {[
                          { value: 'atraso', icon: AlertTriangle, label: 'Em Atraso', count: allLate.length },
                          { value: 'receber', icon: CalendarDays, label: 'A Receber', count: allPending.length },
                          { value: 'recebidos', icon: TrendingUp, label: 'Recebidos', count: allPaid.length },
                        ].map(t => (
                          <button
                            key={t.value}
                            onClick={() => setReceitasSubTab(t.value)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap ${
                              receitasSubTab === t.value
                                ? 'bg-foreground text-background border-foreground shadow-sm'
                                : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                            }`}
                          >
                            <t.icon className="h-3.5 w-3.5" />
                            <span>{t.label}</span>
                            {t.count > 0 && (
                              <Badge className={`ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px] ${
                                receitasSubTab === t.value ? 'bg-background/20 text-background' :
                                t.value === 'atraso' ? 'bg-red-500 text-white' :
                                t.value === 'receber' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                              }`}>{t.count}</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/50">
                        <button
                          onClick={() => setViewMode('list')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <List className="h-3.5 w-3.5" /> Lista
                        </button>
                        <button
                          onClick={() => setViewMode('client')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            viewMode === 'client' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Users className="h-3.5 w-3.5" /> Por cliente
                        </button>
                      </div>
                    </div>

                    <TabsContent value="atraso" className="space-y-3 mt-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground">
                          Em Atraso ({allLate.length})
                          {allLate.length > 0 && <span className="ml-2 text-red-400 font-bold">{fmt(allLate.reduce((s, p) => s + p.amount, 0))}</span>}
                        </h2>
                      </div>
                      {viewMode === 'client' ? (
                        <PaymentsByClientView payments={allLate} onMarkAsPaid={dashboard.markPaymentAsPaid} onOpenEvent={handleOpenEvent} />
                      ) : allLate.length === 0 ? (
                        <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum pagamento em atraso 🎉</Card>
                      ) : (
                        <>
                          <div className="space-y-2">
                            {allLate.slice((pageAtraso - 1) * PAGE_SIZE, pageAtraso * PAGE_SIZE).map(p => <FinancialPaymentCard key={p.id} payment={p} onMarkAsPaid={dashboard.markPaymentAsPaid} onOpenEvent={handleOpenEvent} />)}
                          </div>
                          <PaginationControls page={pageAtraso} totalPages={Math.ceil(allLate.length / PAGE_SIZE)} onPageChange={setPageAtraso} />
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="receber" className="space-y-3 mt-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground">
                          A Receber ({allPending.length})
                          {allPending.length > 0 && <span className="ml-2 text-amber-400 font-bold">{fmt(allPending.reduce((s, p) => s + p.amount, 0))}</span>}
                        </h2>
                      </div>
                      {viewMode === 'client' ? (
                        <PaymentsByClientView payments={allPending} onMarkAsPaid={dashboard.markPaymentAsPaid} onOpenEvent={handleOpenEvent} />
                      ) : allPending.length === 0 ? (
                        <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum pagamento pendente</Card>
                      ) : (
                        <>
                          <div className="space-y-2">
                            {allPending.slice((pageReceber - 1) * PAGE_SIZE, pageReceber * PAGE_SIZE).map(p => <FinancialPaymentCard key={p.id} payment={p} onMarkAsPaid={dashboard.markPaymentAsPaid} onOpenEvent={handleOpenEvent} />)}
                          </div>
                          <PaginationControls page={pageReceber} totalPages={Math.ceil(allPending.length / PAGE_SIZE)} onPageChange={setPageReceber} />
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="recebidos" className="space-y-3 mt-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground">
                          Recebidos ({allPaid.length})
                          {allPaid.length > 0 && <span className="ml-2 text-emerald-400 font-bold">{fmt(allPaid.reduce((s, p) => s + p.amount, 0))}</span>}
                        </h2>
                      </div>
                      {viewMode === 'client' ? (
                        <PaymentsByClientView payments={allPaid} onMarkAsPaid={dashboard.markPaymentAsPaid} onOpenEvent={handleOpenEvent} />
                      ) : allPaid.length === 0 ? (
                        <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum pagamento recebido</Card>
                      ) : (
                        <>
                          <div className="space-y-2">
                            {allPaid.slice((pageRecebidos - 1) * PAGE_SIZE, pageRecebidos * PAGE_SIZE).map(p => <FinancialPaymentCard key={p.id} payment={p} onOpenEvent={handleOpenEvent} />)}
                          </div>
                          <PaginationControls page={pageRecebidos} totalPages={Math.ceil(allPaid.length / PAGE_SIZE)} onPageChange={setPageRecebidos} />
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                {/* Tab Despesas */}
                <TabsContent value="despesas" className="space-y-4">
                  <Tabs value={despesasSubTab} onValueChange={setDespesasSubTab} className="w-full">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {[
                          { value: 'todos', icon: List, label: 'Todos', count: dashboard.expenses.length },
                          { value: 'fixa', icon: Building, label: 'Fixas', count: dashboard.expenses.filter(e => (e.expense_type || 'fixa') === 'fixa').length },
                          { value: 'variavel', icon: Zap, label: 'Variáveis', count: dashboard.expenses.filter(e => e.expense_type === 'variavel').length },
                          { value: 'festa', icon: PartyPopper, label: 'Festas', count: dashboard.expenses.filter(e => e.expense_type === 'festa').length },
                          { value: 'baixadas', icon: CheckCircle, label: 'Baixadas', count: dashboard.expenses.filter(e => e.status === 'pago').length },
                        ].map(t => (
                          <button
                            key={t.value}
                            onClick={() => setDespesasSubTab(t.value)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border whitespace-nowrap ${
                              despesasSubTab === t.value
                                ? 'bg-foreground text-background border-foreground shadow-sm'
                                : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                            }`}
                          >
                            <t.icon className="h-3.5 w-3.5" />
                            <span>{t.label}</span>
                            {t.count > 0 && (
                              <Badge className={`ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px] ${
                                despesasSubTab === t.value ? 'bg-background/20 text-background' : t.value === 'baixadas' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                              }`}>{t.count}</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(['todos', 'fixa', 'variavel', 'festa', 'baixadas'] as const).map(expType => {
                      const typeExpenses = dashboard.expenses
                        .filter(e => {
                          if (expType === 'todos') return true;
                          if (expType === 'baixadas') return e.status === 'pago';
                          return (e.expense_type || 'fixa') === expType;
                        })
                        .sort((a, b) => despesasSortAsc
                          ? a.expense_date.localeCompare(b.expense_date)
                          : b.expense_date.localeCompare(a.expense_date)
                        );
                      const typeLabel = expType === 'todos' ? '' : expType === 'fixa' ? 'fixa' : expType === 'variavel' ? 'variável' : expType === 'festa' ? 'de festa' : 'baixada';
                      const sectionTitle = expType === 'todos' ? `Todas as despesas (${typeExpenses.length})` : expType === 'baixadas' ? `Despesas baixadas (${typeExpenses.length})` : `Despesas ${typeLabel}s (${typeExpenses.length})`;
                      return (
                        <TabsContent key={expType} value={expType} className="space-y-3 mt-3">
                          <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-foreground">
                              {sectionTitle}
                              {typeExpenses.length > 0 && (
                                <span className="ml-2 text-blue-400 font-bold">
                                  {fmt(typeExpenses.reduce((s, e) => s + e.amount, 0))}
                                </span>
                              )}
                            </h2>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs"
                                onClick={() => { setDespesasSortAsc(prev => !prev); setPageDespesas(1); }}
                              >
                                <ArrowUpDown className="h-3.5 w-3.5" />
                                {despesasSortAsc ? 'Mais próxima' : 'Mais recente'}
                              </Button>
                              <Button size="sm" onClick={() => { setExpenseDialogType(expType === 'todos' ? 'fixa' : expType); setExpenseDialogOpen(true); }}>
                                <Plus className="h-4 w-4 mr-1" /> Adicionar
                              </Button>
                            </div>
                          </div>
                          {typeExpenses.length === 0 ? (
                            <Card className="p-8">
                              <p className="text-sm text-muted-foreground text-center">Nenhuma despesa cadastrada</p>
                            </Card>
                          ) : (() => {
                            const totalPagesDespesas = Math.ceil(typeExpenses.length / PAGE_SIZE);
                            const paginated = typeExpenses.slice((pageDespesas - 1) * PAGE_SIZE, pageDespesas * PAGE_SIZE);
                            return (
                              <>
                                <div className="space-y-2">
                                  {paginated.map(e => (
                                    <div key={e.id} className={cn(
                                      "p-3 md:p-4 rounded-xl border border-border bg-card flex items-center justify-between gap-3 border-l-4",
                                      (e.expense_type || 'fixa') === 'fixa' && 'border-l-blue-500',
                                      e.expense_type === 'variavel' && 'border-l-amber-500',
                                      e.expense_type === 'festa' && 'border-l-purple-500',
                                    )}>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="font-semibold text-sm text-foreground break-words">{e.description}</p>
                                          <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[e.category] || e.category}</Badge>
                                          <Badge variant="outline" className={e.status === 'pago' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}>
                                            {e.status === 'pago' ? 'Pago' : 'Pendente'}
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {format(new Date(e.expense_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                          {e.unit && ` · ${e.unit}`}
                                        </p>
                                        {e.notes && <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{e.notes}</p>}
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {e.status !== 'pago' ? (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 px-2.5 text-xs font-medium bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 hover:border-emerald-600"
                                            onClick={() => setMarkPaidExpense({ id: e.id, description: e.description })}
                                          >
                                            Baixar
                                          </Button>
                                        ) : (
                                          <div className="flex items-center gap-1">
                                            {e.receipt_url && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => window.open(e.receipt_url!, '_blank')}
                                                title="Ver comprovante"
                                              >
                                                <FileText className="h-3.5 w-3.5 mr-1" />
                                                Comprovante
                                              </Button>
                                            )}
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                                              title="Reabrir como pendente"
                                              onClick={() => dashboard.updateExpense(e.id, { status: 'pendente', receipt_url: null })}
                                            >
                                              <RotateCcw className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        )}
                                        <p className="text-sm font-bold text-blue-400">{fmt(e.amount)}</p>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive/80" onClick={() => dashboard.deleteExpense(e.id)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <PaginationControls page={pageDespesas} totalPages={totalPagesDespesas} onPageChange={setPageDespesas} />
                              </>
                            );
                          })()}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </TabsContent>


                <TabsContent value="resultado" className="space-y-4">
                  <div className="flex items-center justify-end">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setExpenseDialogType('ajuste'); setExpenseDialogOpen(true); }}>
                      <ArrowUpDown className="h-4 w-4" /> Ajuste de Saldo
                    </Button>
                  </div>

                  {/* Show adjustments if any */}
                  {(() => {
                    const ajustes = dashboard.expensesThisMonth.filter(e => e.expense_type === 'ajuste');
                    if (ajustes.length === 0) return null;
                    return (
                      <Card className="p-4 bg-card border-border space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">Ajustes de Saldo</h3>
                        {ajustes.map(a => (
                          <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{a.description}</span>
                              {a.notes && <p className="text-xs text-muted-foreground mt-0.5">{a.notes}</p>}
                              <p className="text-xs text-muted-foreground">{format(new Date(a.expense_date + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`font-bold ${a.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(a.amount)}</span>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => dashboard.deleteExpense(a.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </Card>
                    );
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-6 bg-card border-border text-center">
                      <p className="text-sm text-muted-foreground mb-2">Total Recebido</p>
                      <p className="text-3xl font-bold text-emerald-400">{fmt(dashboard.totalReceivedMonth)}</p>
                    </Card>
                    <Card className="p-6 bg-card border-border text-center">
                      <p className="text-sm text-muted-foreground mb-2">Total Despesas</p>
                      <p className="text-3xl font-bold text-blue-400">{fmt(dashboard.totalExpensesMonth)}</p>
                    </Card>
                    <Card className="p-6 bg-card border-border text-center">
                      <p className="text-sm text-muted-foreground mb-2">Saldo do Período</p>
                      <p className={`text-3xl font-bold ${dashboard.saldoMonth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmt(dashboard.saldoMonth)}
                      </p>
                    </Card>
                  </div>

                  <Card className="p-6 bg-card border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Resumo</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Receitas recebidas</span><span className="text-emerald-400 font-medium">{fmt(dashboard.totalReceivedMonth)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Receitas pendentes</span><span className="text-amber-400 font-medium">{fmt(dashboard.totalPendingMonth)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Em atraso</span><span className="text-red-400 font-medium">{fmt(dashboard.totalLate)}</span></div>
                      <div className="border-t border-border my-2" />
                      <div className="flex justify-between"><span className="text-muted-foreground">Despesas fixas</span><span className="text-blue-400 font-medium">{fmt(dashboard.expensesThisMonth.filter(e => (e.expense_type || 'fixa') === 'fixa').reduce((s, e) => s + e.amount, 0))}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Despesas variáveis</span><span className="text-blue-400 font-medium">{fmt(dashboard.expensesThisMonth.filter(e => e.expense_type === 'variavel').reduce((s, e) => s + e.amount, 0))}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Despesas de festas</span><span className="text-blue-400 font-medium">{fmt(dashboard.expensesThisMonth.filter(e => e.expense_type === 'festa').reduce((s, e) => s + e.amount, 0))}</span></div>
                      {dashboard.expensesThisMonth.some(e => e.expense_type === 'ajuste') && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Ajustes de saldo</span><span className="text-purple-400 font-medium">{fmt(dashboard.expensesThisMonth.filter(e => e.expense_type === 'ajuste').reduce((s, e) => s + e.amount, 0))}</span></div>
                      )}
                      <div className="flex justify-between font-medium"><span className="text-muted-foreground">Total despesas</span><span className="text-blue-400">{fmt(dashboard.totalExpensesMonth)}</span></div>
                      <div className="border-t border-border my-2" />
                      <div className="flex justify-between font-semibold"><span className="text-foreground">Saldo</span><span className={dashboard.saldoMonth >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmt(dashboard.saldoMonth)}</span></div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>

      <ExpenseFormDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSubmit={dashboard.addExpense}
        
        defaultExpenseType={expenseDialogType}
      />

      <Sheet open={!!selectedEventId} onOpenChange={(open) => { if (!open) handleCloseEventSheet(); }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle className="text-lg font-bold">
              {selectedEventData?.title || 'Carregando...'}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {selectedEventData ? (
                <>
                  {format(new Date(selectedEventData.event_date + 'T12:00:00'), 'dd/MM/yyyy')} · {selectedEventData.status === 'confirmed' ? 'Confirmado' : selectedEventData.status}
                </>
              ) : 'Carregando dados do evento...'}
            </SheetDescription>
            {selectedEventId && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-fit gap-1.5 text-xs"
                onClick={() => {
                  handleCloseEventSheet();
                  navigate(`/agenda?event=${selectedEventId}`);
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Ir para Agenda
              </Button>
            )}
          </SheetHeader>
          {selectedEventId && currentCompany?.id && selectedEventData && (
            <div className="px-6 pb-6">
              <EventFinancialTab
                eventId={selectedEventId}
                companyId={currentCompany.id}
                baseValue={selectedEventData.total_value}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
      <FinancialReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        payments={dashboard.payments}
        expenses={dashboard.expenses}
        companyName={currentCompany?.name || ''}
        unitOptions={unitOptions}
      />
      {markPaidExpense && (
        <MarkExpensePaidDialog
          open={!!markPaidExpense}
          onOpenChange={(open) => { if (!open) setMarkPaidExpense(null); }}
          expenseId={markPaidExpense.id}
          expenseDescription={markPaidExpense.description}
          onConfirm={(id, data) => dashboard.updateExpense(id, data)}
        />
      )}
    </SidebarProvider>
  );
}
