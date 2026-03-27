import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinanceiroDashboard } from '@/hooks/useFinanceiroDashboard';
import { useCompanyUnits } from '@/hooks/useCompanyUnits';
import { useCompany } from '@/contexts/CompanyContext';
import { FinancialPaymentCard } from '@/components/financial/FinancialPaymentCard';
import { PaymentsByClientView } from '@/components/financial/PaymentsByClientView';
import { ExpenseFormDialog } from '@/components/financial/ExpenseFormDialog';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { MobileMenu } from '@/components/admin/MobileMenu';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, AlertTriangle, CalendarDays, Loader2, Menu, Plus, Trash2, Wallet, Scale, Building, Zap, PartyPopper, List, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PAGE_SIZE = 20;

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

export default function Financeiro() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const { unitOptions } = useCompanyUnits(currentCompany?.id);
  const dashboard = useFinanceiroDashboard();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseDialogType, setExpenseDialogType] = useState<string>('fixa');
  const [viewMode, setViewMode] = useState<'list' | 'client'>('list');
  const [receitasSubTab, setReceitasSubTab] = useState('atraso');
  const [pageAtraso, setPageAtraso] = useState(1);
  const [pageReceber, setPageReceber] = useState(1);
  const [pageRecebidos, setPageRecebidos] = useState(1);
  const [pageDespesas, setPageDespesas] = useState(1);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), i, 1);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }) };
  });

  const handleOpenEvent = (eventId: string) => {
    navigate(`/agenda?event=${eventId}`);
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
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select value={dashboard.filters.month} onValueChange={v => dashboard.setFilters(f => ({ ...f, month: v }))}>
                  <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {unitOptions.length > 0 && (
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

              {/* 5 Dashboard Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                    <Wallet className="h-3.5 w-3.5 text-blue-400" /> Despesas
                  </div>
                  <p className="text-lg md:text-xl font-bold text-blue-400">{fmt(dashboard.totalExpensesMonth)}</p>
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
                <TabsList className="w-full md:w-auto">
                  <TabsTrigger value="receitas" className="flex-1 md:flex-none">Receitas</TabsTrigger>
                  <TabsTrigger value="despesas" className="flex-1 md:flex-none">Despesas</TabsTrigger>
                  <TabsTrigger value="resultado" className="flex-1 md:flex-none">Resultado</TabsTrigger>
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
                  <Tabs defaultValue="fixa" className="w-full">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <TabsList className="h-9">
                        <TabsTrigger value="fixa" className="text-xs gap-1.5"><Building className="h-3.5 w-3.5" /> Fixas</TabsTrigger>
                        <TabsTrigger value="variavel" className="text-xs gap-1.5"><Zap className="h-3.5 w-3.5" /> Variáveis</TabsTrigger>
                        <TabsTrigger value="festa" className="text-xs gap-1.5"><PartyPopper className="h-3.5 w-3.5" /> Festas</TabsTrigger>
                      </TabsList>
                    </div>

                    {(['fixa', 'variavel', 'festa'] as const).map(expType => {
                      const typeExpenses = dashboard.expensesThisMonth.filter(e => (e.expense_type || 'fixa') === expType);
                      const typeLabel = expType === 'fixa' ? 'fixa' : expType === 'variavel' ? 'variável' : 'de festa';
                      return (
                        <TabsContent key={expType} value={expType} className="space-y-3 mt-3">
                          <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-foreground">
                              Despesas {typeLabel}s ({typeExpenses.length})
                              {typeExpenses.length > 0 && (
                                <span className="ml-2 text-blue-400 font-bold">
                                  {fmt(typeExpenses.reduce((s, e) => s + e.amount, 0))}
                                </span>
                              )}
                            </h2>
                            <Button size="sm" onClick={() => { setExpenseDialogType(expType); setExpenseDialogOpen(true); }}>
                              <Plus className="h-4 w-4 mr-1" /> Adicionar
                            </Button>
                          </div>
                          {typeExpenses.length === 0 ? (
                            <Card className="p-8">
                              <p className="text-sm text-muted-foreground text-center">Nenhuma despesa {typeLabel} neste período</p>
                            </Card>
                          ) : (
                            <div className="space-y-2">
                              {typeExpenses.map(e => (
                                <div key={e.id} className="p-3 md:p-4 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-sm text-foreground truncate">{e.description}</p>
                                      <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[e.category] || e.category}</Badge>
                                      <Badge variant="outline" className={e.status === 'pago' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}>
                                        {e.status === 'pago' ? 'Pago' : 'Pendente'}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {format(new Date(e.expense_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                      {e.unit && ` · ${e.unit}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <p className="text-sm font-bold text-blue-400">{fmt(e.amount)}</p>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive/80" onClick={() => dashboard.deleteExpense(e.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </TabsContent>


                <TabsContent value="resultado" className="space-y-4">
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
                      <p className="text-sm text-muted-foreground mb-2">Saldo do Mês</p>
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
    </SidebarProvider>
  );
}
