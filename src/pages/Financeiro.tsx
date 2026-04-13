import { LoadingScreen } from "@/components/ui/loading-screen";
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';
import { useFinanceiroDashboard } from '@/hooks/useFinanceiroDashboard';
import { useCompanyUnits } from '@/hooks/useCompanyUnits';
import { useCompany } from '@/contexts/CompanyContext';
import { FinancialPaymentCard } from '@/components/financial/FinancialPaymentCard';
import { PaymentsByClientView } from '@/components/financial/PaymentsByClientView';
import { ExpenseFormDialog } from '@/components/financial/ExpenseFormDialog';
import { RevenueFormDialog } from '@/components/financial/RevenueFormDialog';
import { EventFinancialTab } from '@/components/financial/EventFinancialTab';
import { FinancialReportDialog } from '@/components/financial/FinancialReportDialog';
import { MarkExpensePaidDialog } from '@/components/financial/MarkExpensePaidDialog';

import { BankAccountStatement } from '@/components/financial/BankAccountStatement';
import { ClosedPartiesTab } from '@/components/financial/ClosedPartiesTab';
import { BankAccountSelect } from '@/components/financial/BankAccountSelect';
import { TransferBetweenAccountsDialog } from '@/components/financial/TransferBetweenAccountsDialog';
import { KpiSheetBody } from '@/components/financial/KpiSheetBody';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { MobileMenu } from '@/components/admin/MobileMenu';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DollarSign, TrendingUp, AlertTriangle, CalendarDays, Loader2, Menu, Plus, Trash2, Wallet, Scale, Building, Zap, PartyPopper, List, Users, ChevronLeft, ChevronRight, ExternalLink, ArrowUpDown, CalendarRange, X, FileText, CheckCircle, RotateCcw, Clock, ArrowLeftRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useBankAccounts, type BankAccountBalance } from '@/hooks/useBankAccounts';
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
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [revenueDialogOpen, setRevenueDialogOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'client'>('list');
  const [receitasSubTab, setReceitasSubTab] = useState('atraso');
  const [despesasSubTab, setDespesasSubTab] = useState('fixa');
  const [pageAtraso, setPageAtraso] = useState(1);
  const [pageReceber, setPageReceber] = useState(1);
  const [pageRecebidos, setPageRecebidos] = useState(1);
  const [pageDespesas, setPageDespesas] = useState(1);
  const [despesasSortAsc, setDespesasSortAsc] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventData, setSelectedEventData] = useState<{ title: string; event_date: string; total_value: number; status: string } | null>(null);
  const [activePreset, setActivePreset] = useState<PeriodPreset>('mes');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [customPopoverOpen, setCustomPopoverOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [markPaidExpense, setMarkPaidExpense] = useState<{ id: string; description: string } | null>(null);
  const [statementAccount, setStatementAccount] = useState<BankAccountBalance | null>(null);
  const [markPaidPayment, setMarkPaidPayment] = useState<any>(null);
  const [markPaidBankId, setMarkPaidBankId] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [kpiSheet, setKpiSheet] = useState<'recebido' | 'a_receber' | 'atraso' | 'despesas' | 'despesas_pagas' | 'saldo' | null>(null);
  const bankAccounts = useBankAccounts();
  const bankAccountMap = useMemo(() => {
    const map: Record<string, string> = {};
    bankAccounts.activeAccounts.forEach(a => { map[a.id] = a.name; });
    return map;
  }, [bankAccounts.activeAccounts]);

  const handleMarkPaymentAsPaid = (paymentId: string) => {
    const payment = dashboard.payments.find((p: any) => p.id === paymentId);
    setMarkPaidPayment(payment || { id: paymentId });
    setMarkPaidBankId(null);
  };

  const confirmMarkPaymentPaid = async () => {
    if (!markPaidPayment) return;
    await dashboard.markPaymentAsPaid(markPaidPayment.id, markPaidBankId);
    setMarkPaidPayment(null);
    setMarkPaidBankId(null);
  };

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
      return <LoadingScreen message="Carregando financeiro..." />;
  }

  const sortByDueDate = (a: any, b: any) => sortOrder === 'asc' ? a.due_date.localeCompare(b.due_date) : b.due_date.localeCompare(a.due_date);

  // Categorized payment lists
  const allPaid = dashboard.payments.filter(p => p.status === 'paid').sort((a, b) => sortOrder === 'asc' ? (a.paid_at || '').localeCompare(b.paid_at || '') : (b.paid_at || '').localeCompare(a.paid_at || ''));
  const allPending = dashboard.payments.filter(p => p.status === 'pending').sort(sortByDueDate);
  const allLate = [...dashboard.latePayments].sort(sortByDueDate);

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
                      className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border whitespace-nowrap ${
                        activePreset === p.value
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}

                  <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border whitespace-nowrap ${
                          activePreset === 'custom'
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
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
                  {financialPerms.canViewBankAccounts && bankAccounts.activeAccounts.length > 0 && (
                    <Select value={dashboard.filters.bankAccount} onValueChange={v => dashboard.setFilters(f => ({ ...f, bankAccount: v }))}>
                      <SelectTrigger className="w-40 h-9 text-xs">
                        <SelectValue placeholder="Todas contas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas contas</SelectItem>
                        {bankAccounts.activeAccounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            <span className="flex items-center gap-1.5">
                              {acc.account_type === 'caixa' ? <Wallet className="h-3 w-3 text-muted-foreground" /> : <Building className="h-3 w-3 text-muted-foreground" />}
                              {acc.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="receitas" className="w-full">
                <TabsList className="bg-transparent p-0 h-auto gap-1.5 flex-wrap">
                  {(financialPerms.canViewBankAccounts ? ['receitas', 'despesas', 'festas', 'resultado', 'contas'] : ['receitas', 'despesas', 'festas', 'resultado']).map(tab => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="rounded-xl px-5 py-2 text-sm font-medium border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:shadow-none hover:bg-accent hover:text-foreground"
                    >
                      {tab === 'receitas' ? 'Receitas' : tab === 'despesas' ? 'Despesas' : tab === 'festas' ? '🎉 Festas' : tab === 'resultado' ? 'Resultado' : '🏦 Contas'}
                    </TabsTrigger>
                  ))}
                </TabsList>

              {/* 5 Dashboard Cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
                <Card className="p-4 bg-card border-border cursor-pointer hover:border-emerald-400/40 transition-colors" onClick={() => setKpiSheet('recebido')}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Recebido
                  </div>
                  <p className="text-lg md:text-xl font-bold text-emerald-400">{fmt(dashboard.totalReceivedMonth)}</p>
                </Card>
                <Card className="p-4 bg-card border-border cursor-pointer hover:border-amber-400/40 transition-colors" onClick={() => setKpiSheet('a_receber')}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-amber-400" /> A receber
                  </div>
                  <p className="text-lg md:text-xl font-bold text-amber-400">{fmt(dashboard.totalPendingMonth)}</p>
                </Card>
                <Card className="p-4 bg-card border-border cursor-pointer hover:border-red-400/40 transition-colors" onClick={() => setKpiSheet('atraso')}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> Em atraso
                  </div>
                  <p className="text-lg md:text-xl font-bold text-red-400">{fmt(dashboard.totalLate)}</p>
                </Card>
                <Card className="p-4 bg-card border-border cursor-pointer hover:border-blue-400/40 transition-colors" onClick={() => setKpiSheet('despesas')}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Wallet className="h-3.5 w-3.5 text-blue-400" /> Despesas Lançadas
                  </div>
                  <p className="text-lg md:text-xl font-bold text-blue-400">{fmt(dashboard.totalExpensesMonth)}</p>
                </Card>
                <Card className="p-4 bg-card border-border cursor-pointer hover:border-teal-400/40 transition-colors" onClick={() => setKpiSheet('despesas_pagas')}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-teal-400" /> Despesas Pagas
                  </div>
                  <p className="text-lg md:text-xl font-bold text-teal-400">{fmt(dashboard.totalExpensesPaidMonth)}</p>
                </Card>
                <Card className="p-4 bg-card border-border col-span-2 md:col-span-1 cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setKpiSheet('saldo')}>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                    <Scale className="h-3.5 w-3.5 text-primary" /> Saldo
                  </div>
                  <p className={`text-lg md:text-xl font-bold ${dashboard.saldoMonth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(dashboard.saldoMonth)}
                  </p>
                </Card>
              </div>

              {/* Consolidated Bank Balance */}
              {financialPerms.canViewBankAccounts && bankAccounts.activeAccounts.length > 0 && (
                <Card className="p-4 border-border bg-gradient-to-r from-card to-primary/[0.04] mt-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Building className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Saldo consolidado (todas as contas)</p>
                        <p className={`text-xl font-bold ${bankAccounts.activeAccounts.reduce((s, a) => s + a.current_balance, 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {fmt(bankAccounts.activeAccounts.reduce((s, a) => s + a.current_balance, 0))}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {bankAccounts.activeAccounts.map(acc => (
                        <div key={acc.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-xs">
                          {acc.account_type === 'caixa' ? <Wallet className="h-3 w-3 text-amber-500" /> : <Building className="h-3 w-3 text-blue-500" />}
                          <span className="font-medium text-foreground">{acc.name}</span>
                          <span className={acc.current_balance >= 0 ? 'text-emerald-500 font-semibold' : 'text-red-500 font-semibold'}>
                            {fmt(acc.current_balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

                <div className="mt-4" />

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
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border whitespace-nowrap ${
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
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => { setEditingRevenue(null); setRevenueDialogOpen(true); }}
                          className="gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" /> Nova Receita
                        </Button>
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
                    </div>

                    <TabsContent value="atraso" className="space-y-3 mt-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground">
                          Em Atraso ({allLate.length})
                          {allLate.length > 0 && <span className="ml-2 text-red-400 font-bold">{fmt(allLate.reduce((s, p) => s + p.amount, 0))}</span>}
                        </h2>
                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          {sortOrder === 'asc' ? 'Mais próximo' : 'Mais distante'}
                        </Button>
                      </div>
                      {viewMode === 'client' ? (
                        <PaymentsByClientView payments={allLate} onMarkAsPaid={handleMarkPaymentAsPaid} onOpenEvent={handleOpenEvent} />
                      ) : allLate.length === 0 ? (
                        <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum pagamento em atraso 🎉</Card>
                      ) : (
                        <>
                          <div className="space-y-2">
                            {allLate.slice((pageAtraso - 1) * PAGE_SIZE, pageAtraso * PAGE_SIZE).map(p => <FinancialPaymentCard key={p.id} payment={p} onMarkAsPaid={handleMarkPaymentAsPaid} onOpenEvent={handleOpenEvent} bankAccountName={p.bank_account_id ? bankAccountMap[p.bank_account_id] : undefined} />)}
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
                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          {sortOrder === 'asc' ? 'Mais próximo' : 'Mais distante'}
                        </Button>
                      </div>
                      {viewMode === 'client' ? (
                        <PaymentsByClientView payments={allPending} onMarkAsPaid={handleMarkPaymentAsPaid} onOpenEvent={handleOpenEvent} />
                      ) : allPending.length === 0 ? (
                        <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum pagamento pendente</Card>
                      ) : (
                        <>
                          <div className="space-y-2">
                            {allPending.slice((pageReceber - 1) * PAGE_SIZE, pageReceber * PAGE_SIZE).map(p => <FinancialPaymentCard key={p.id} payment={p} onMarkAsPaid={handleMarkPaymentAsPaid} onOpenEvent={handleOpenEvent} bankAccountName={p.bank_account_id ? bankAccountMap[p.bank_account_id] : undefined} />)}
                          </div>
                          <PaginationControls page={pageReceber} totalPages={Math.ceil(allPending.length / PAGE_SIZE)} onPageChange={setPageReceber} />
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="recebidos" className="space-y-3 mt-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground">
                          Recebidos ({allPaid.length + dashboard.revenues.filter(r => r.status === 'recebido' && r.revenue_date >= dashboard.filters.from && r.revenue_date <= dashboard.filters.to).length})
                          {(allPaid.length > 0 || dashboard.revenues.filter(r => r.status === 'recebido').length > 0) && <span className="ml-2 text-emerald-400 font-bold">{fmt(allPaid.reduce((s, p) => s + p.amount, 0) + dashboard.revenues.filter(r => r.status === 'recebido' && r.revenue_date >= dashboard.filters.from && r.revenue_date <= dashboard.filters.to).reduce((s: number, r: any) => s + r.amount, 0))}</span>}
                        </h2>
                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground" onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          {sortOrder === 'asc' ? 'Mais próximo' : 'Mais distante'}
                        </Button>
                      </div>
                      {viewMode === 'client' ? (
                        <PaymentsByClientView payments={allPaid} onMarkAsPaid={handleMarkPaymentAsPaid} onOpenEvent={handleOpenEvent} />
                      ) : (
                        <>
                          {/* Standalone revenues */}
                          {dashboard.revenues.filter(r => r.status === 'recebido' && r.revenue_date >= dashboard.filters.from && r.revenue_date <= dashboard.filters.to).map((r: any) => (
                            <Card key={r.id} className="p-4 flex items-center justify-between gap-3 border-l-4 border-l-emerald-500">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">{r.description}</span>
                                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Receita avulsa</Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                  <span>📅 {format(new Date(r.revenue_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                                  {r.bank_account_id && bankAccountMap[r.bank_account_id] && <span>🏦 {bankAccountMap[r.bank_account_id]}</span>}
                                  {r.notes && <span className="truncate max-w-[200px]">📝 {r.notes}</span>}
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                <span className="text-emerald-600 font-bold text-sm">{fmt(r.amount)}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingRevenue(r); setRevenueDialogOpen(true); }}>
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => dashboard.deleteRevenue(r.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                          {/* Event payments */}
                          {allPaid.length === 0 && dashboard.revenues.filter(r => r.status === 'recebido' && r.revenue_date >= dashboard.filters.from && r.revenue_date <= dashboard.filters.to).length === 0 ? (
                            <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum pagamento recebido</Card>
                          ) : (
                            <>
                              <div className="space-y-2">
                                {allPaid.slice((pageRecebidos - 1) * PAGE_SIZE, pageRecebidos * PAGE_SIZE).map(p => <FinancialPaymentCard key={p.id} payment={p} onOpenEvent={handleOpenEvent} bankAccountName={p.bank_account_id ? bankAccountMap[p.bank_account_id] : undefined} />)}
                              </div>
                              <PaginationControls page={pageRecebidos} totalPages={Math.ceil(allPaid.length / PAGE_SIZE)} onPageChange={setPageRecebidos} />
                            </>
                          )}
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
                          { value: 'a_vencer', icon: Clock, label: 'A vencer', count: dashboard.expenses.filter(e => e.status === 'pendente' && new Date(e.expense_date + 'T23:59:59') >= new Date()).length },
                          { value: 'vencidas', icon: AlertTriangle, label: 'Vencidas', count: dashboard.expenses.filter(e => e.status === 'pendente' && new Date(e.expense_date + 'T23:59:59') < new Date()).length },
                          { value: 'baixadas', icon: CheckCircle, label: 'Baixadas', count: dashboard.expenses.filter(e => e.status === 'pago').length },
                          { value: 'fixa', icon: Building, label: 'Fixas', count: dashboard.expenses.filter(e => (e.expense_type || 'fixa') === 'fixa').length },
                          { value: 'variavel', icon: Zap, label: 'Variáveis', count: dashboard.expenses.filter(e => e.expense_type === 'variavel').length },
                          { value: 'festa', icon: PartyPopper, label: 'Festas', count: dashboard.expenses.filter(e => e.expense_type === 'festa').length },
                        ].map(t => (
                          <button
                            key={t.value}
                            onClick={() => setDespesasSubTab(t.value)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border whitespace-nowrap ${
                              despesasSubTab === t.value
                                ? 'bg-foreground text-background border-foreground shadow-sm'
                                : 'bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                            }`}
                          >
                            <t.icon className="h-3.5 w-3.5" />
                            <span>{t.label}</span>
                            {t.count > 0 && (
                              <Badge className={`ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px] ${
                                despesasSubTab === t.value ? 'bg-background/20 text-background' : t.value === 'baixadas' ? 'bg-emerald-500 text-white' : t.value === 'a_vencer' ? 'bg-orange-500 text-white' : t.value === 'vencidas' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                              }`}>{t.count}</Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(['todos', 'fixa', 'variavel', 'festa', 'a_vencer', 'vencidas', 'baixadas'] as const).map(expType => {
                      const now = new Date();
                      const typeExpenses = dashboard.expenses
                        .filter(e => {
                          if (expType === 'todos') return true;
                          if (expType === 'baixadas') return e.status === 'pago';
                          if (expType === 'a_vencer') return e.status === 'pendente' && new Date(e.expense_date + 'T23:59:59') >= now;
                          if (expType === 'vencidas') return e.status === 'pendente' && new Date(e.expense_date + 'T23:59:59') < now;
                          return (e.expense_type || 'fixa') === expType;
                        })
                        .sort((a, b) => despesasSortAsc
                          ? a.expense_date.localeCompare(b.expense_date)
                          : b.expense_date.localeCompare(a.expense_date)
                        );
                      const typeLabel = expType === 'todos' ? '' : expType === 'fixa' ? 'fixa' : expType === 'variavel' ? 'variável' : expType === 'festa' ? 'de festa' : expType === 'a_vencer' ? 'a vencer' : 'baixada';
                      const sectionTitle = expType === 'todos' ? `Todas as despesas (${typeExpenses.length})` : expType === 'baixadas' ? `Despesas baixadas (${typeExpenses.length})` : expType === 'a_vencer' ? `Despesas a vencer (${typeExpenses.length})` : `Despesas ${typeLabel}s (${typeExpenses.length})`;
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
                                      "p-3 md:p-4 rounded-xl border border-border bg-card flex items-center justify-between gap-3 border-l-4 cursor-pointer hover:bg-accent/50 transition-colors",
                                      (e.expense_type || 'fixa') === 'fixa' && 'border-l-blue-500',
                                      e.expense_type === 'variavel' && 'border-l-amber-500',
                                      e.expense_type === 'festa' && 'border-l-purple-500',
                                    )} onClick={() => { setEditingExpense(e); setExpenseDialogType(e.expense_type || 'fixa'); setExpenseDialogOpen(true); }}>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-foreground truncate">{e.description}</p>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                          <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[e.category] || e.category}</Badge>
                                          <Badge variant="outline" className={cn("text-[10px]",
                                            e.status === 'pago' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                            : (e.status === 'pendente' && new Date(e.expense_date + 'T23:59:59') < new Date()) ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                          )}>
                                            {e.status === 'pago' ? 'Pago' : (e.status === 'pendente' && new Date(e.expense_date + 'T23:59:59') < new Date()) ? 'Vencido' : 'Pendente'}
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {format(new Date(e.expense_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                          {e.unit && ` · ${e.unit}`}
                                        </p>
                                        {e.notes && <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{e.notes}</p>}
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                                        {e.status !== 'pago' ? (
                                          <div className="flex items-center gap-1">
                                            {(e as any).boleto_url && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => window.open((e as any).boleto_url, '_blank')}
                                                title="Ver boleto"
                                              >
                                                <FileText className="h-3.5 w-3.5 sm:mr-1" />
                                                <span className="hidden sm:inline">Boleto</span>
                                              </Button>
                                            )}
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-7 px-2.5 text-xs font-medium bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 hover:border-emerald-600"
                                              onClick={() => setMarkPaidExpense({ id: e.id, description: e.description })}
                                            >
                                              Baixar
                                            </Button>
                                          </div>
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
                                                <FileText className="h-3.5 w-3.5 sm:mr-1" />
                                                <span className="hidden sm:inline">Comprovante</span>
                                              </Button>
                                            )}
                                            {(e as any).boleto_url && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => window.open((e as any).boleto_url, '_blank')}
                                                title="Ver boleto"
                                              >
                                                <FileText className="h-3.5 w-3.5 sm:mr-1" />
                                                <span className="hidden sm:inline">Boleto</span>
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

                {/* Tab Contas */}
                {financialPerms.canViewBankAccounts && <TabsContent value="contas" className="space-y-4">
                  {statementAccount ? (
                    <div className="space-y-3">
                      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setStatementAccount(null)}>
                        ← Voltar para contas
                      </Button>
                      <h2 className="text-lg font-bold text-foreground">Extrato — {statementAccount.name}</h2>
                      <BankAccountStatement account={statementAccount} onBalanceChanged={() => bankAccounts.refresh()} />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Total balance across accounts */}
                      {bankAccounts.activeAccounts.length > 0 && (
                        <Card className="p-4 bg-card border-border">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Building className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold">Saldo Consolidado</span>
                              </div>
                              <p className={`text-2xl font-bold ${bankAccounts.activeAccounts.reduce((s, a) => s + a.current_balance, 0) >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                {fmt(bankAccounts.activeAccounts.reduce((s, a) => s + a.current_balance, 0))}
                              </p>
                            </div>
                            {bankAccounts.activeAccounts.length >= 2 && (
                              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTransferDialogOpen(true)}>
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                Transferir
                              </Button>
                            )}
                          </div>
                        </Card>
                      )}

                      {/* Account cards */}
                      {bankAccounts.isLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : bankAccounts.activeAccounts.length === 0 ? (
                        <Card className="p-8 text-center">
                          <Building className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground mb-3">Nenhuma conta bancária cadastrada</p>
                          <p className="text-xs text-muted-foreground">Acesse Operações para criar suas contas bancárias</p>
                        </Card>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {bankAccounts.activeAccounts.map(acc => (
                            <Card key={acc.id} className={`p-4 cursor-pointer hover:border-primary/40 transition-colors ${acc.is_default ? 'border-primary/30' : 'border-border'}`} onClick={() => setStatementAccount(acc)}>
                              <div className="flex items-center gap-2 mb-2">
                                {acc.account_type === 'caixa' ? (
                                  <Wallet className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Building className="h-4 w-4 text-blue-500" />
                                )}
                                <span className="font-semibold text-sm">{acc.name}</span>
                                {acc.is_default && <Badge variant="outline" className="text-[9px] h-4 border-primary/30 text-primary">Padrão</Badge>}
                              </div>
                              <p className={`text-xl font-bold ${acc.current_balance >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                {fmt(acc.current_balance)}
                              </p>
                              <div className="flex gap-3 mt-1 text-[11px]">
                                <span className="text-emerald-500">+{fmt(acc.total_entries)}</span>
                                <span className="text-red-400">-{fmt(acc.total_exits)}</span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>}

                {/* Tab Festas Fechadas */}
                <TabsContent value="festas" className="space-y-4">
                  <ClosedPartiesTab
                    from={dashboard.filters.from}
                    to={dashboard.filters.to}
                    unitFilter={dashboard.filters.unit}
                    onOpenEvent={handleOpenEvent}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>

      <ExpenseFormDialog
        open={expenseDialogOpen}
        onOpenChange={(open) => { setExpenseDialogOpen(open); if (!open) setEditingExpense(null); }}
        onSubmit={(data) => {
          if (editingExpense) {
            dashboard.updateExpense(editingExpense.id, data);
            setEditingExpense(null);
          } else {
            dashboard.addExpense(data);
          }
        }}
        defaultValues={editingExpense ? {
          description: editingExpense.description,
          amount: editingExpense.amount,
          expense_date: editingExpense.expense_date,
          category: editingExpense.category,
          expense_type: editingExpense.expense_type,
          status: editingExpense.status,
          notes: editingExpense.notes,
          receipt_url: editingExpense.receipt_url,
          boleto_url: (editingExpense as any).boleto_url,
          bank_account_id: (editingExpense as any).bank_account_id,
        } : undefined}
        defaultExpenseType={expenseDialogType}
      />

      <RevenueFormDialog
        open={revenueDialogOpen}
        onOpenChange={(open) => { setRevenueDialogOpen(open); if (!open) setEditingRevenue(null); }}
        onSubmit={(data) => {
          if (editingRevenue) {
            dashboard.updateRevenue(editingRevenue.id, data);
            setEditingRevenue(null);
          } else {
            dashboard.addRevenue(data);
          }
        }}
        defaultValues={editingRevenue ? {
          description: editingRevenue.description,
          amount: editingRevenue.amount,
          revenue_date: editingRevenue.revenue_date,
          bank_account_id: editingRevenue.bank_account_id,
          receipt_url: editingRevenue.receipt_url,
          notes: editingRevenue.notes,
          status: editingRevenue.status,
        } : undefined}
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

      {/* Mark Payment as Paid Dialog */}
      <Dialog open={!!markPaidPayment} onOpenChange={open => { if (!open) { setMarkPaidPayment(null); setMarkPaidBankId(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Confirmar Pagamento
            </DialogTitle>
          </DialogHeader>
          {markPaidPayment && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
                <p className="text-xs text-muted-foreground">
                  {markPaidPayment.lead_name || markPaidPayment.event_title || 'Pagamento'}
                </p>
                <p className="text-lg font-bold">
                  {fmt(markPaidPayment.amount)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vencimento: {format(new Date(markPaidPayment.due_date + 'T12:00:00'), 'dd/MM/yyyy')}
                </p>
              </div>
              <BankAccountSelect
                value={markPaidBankId}
                onValueChange={setMarkPaidBankId}
                label="Conta de destino"
                placeholder="Selecione a conta..."
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMarkPaidPayment(null); setMarkPaidBankId(null); }}>Cancelar</Button>
            <Button onClick={confirmMarkPaymentPaid} className="bg-emerald-600 hover:bg-emerald-700 text-white">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransferBetweenAccountsDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        accounts={bankAccounts.activeAccounts}
        onSuccess={() => { bankAccounts.refresh(); dashboard.refresh(); }}
      />
      {/* KPI Detail Sheet */}
      <Sheet open={!!kpiSheet} onOpenChange={(open) => !open && setKpiSheet(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {kpiSheet === 'recebido' && '✅ Recebido no Período'}
              {kpiSheet === 'a_receber' && '📅 A Receber no Período'}
              {kpiSheet === 'atraso' && '⚠️ Em Atraso'}
              {kpiSheet === 'despesas' && '📋 Despesas Lançadas no Período'}
              {kpiSheet === 'despesas_pagas' && '✅ Despesas Pagas no Período'}
              {kpiSheet === 'saldo' && '📊 Resumo do Saldo'}
            </SheetTitle>
            <SheetDescription>
              {kpiSheet === 'saldo'
                ? 'Visão consolidada de receitas e despesas do período'
                : `${(() => {
                    if (kpiSheet === 'recebido') return dashboard.paidThisMonth.length;
                    if (kpiSheet === 'a_receber') return dashboard.pendingThisMonth.length;
                    if (kpiSheet === 'atraso') return dashboard.latePayments.length;
                    if (kpiSheet === 'despesas') return dashboard.expensesThisMonth.filter(e => e.expense_type !== 'ajuste').length;
                    if (kpiSheet === 'despesas_pagas') return dashboard.expensesThisMonth.filter(e => e.expense_type !== 'ajuste' && e.status === 'pago').length;
                    return 0;
                  })()} itens`}
            </SheetDescription>
          </SheetHeader>

          <KpiSheetBody
            kpiSheet={kpiSheet}
            dashboard={dashboard}
            fmt={fmt}
            CATEGORY_LABELS={CATEGORY_LABELS}
          />
        </SheetContent>
      </Sheet>
    </SidebarProvider>
  );
}
