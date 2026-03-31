import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface EnrichedPayment {
  id: string;
  event_id: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'late';
  type: string;
  payment_method: string | null;
  paid_at: string | null;
  lead_name: string;
  event_title: string;
  event_date: string;
  event_type: string;
  unit: string;
}

export interface Expense {
  id: string;
  company_id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string;
  expense_type: string; // 'fixa' | 'variavel' | 'festa' | 'ajuste'
  unit: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface FinanceiroDashboardFilters {
  month: string;
  unit: string;
  status: string;
  tipo: string;
}

export function useFinanceiroDashboard() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const [payments, setPayments] = useState<EnrichedPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FinanceiroDashboardFilters>({
    month: format(new Date(), 'yyyy-MM'),
    unit: 'all',
    status: 'all',
    tipo: 'all',
  });

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);

    try {
      const [paymentsRes, expensesRes] = await Promise.all([
        supabase.from('event_payments').select('*').eq('company_id', companyId).order('due_date'),
        supabase.from('company_expenses').select('*').eq('company_id', companyId).order('expense_date', { ascending: false }),
      ]);

      // Enrich payments with event + lead data
      const rawPayments = paymentsRes.data || [];
      const eventIds = [...new Set(rawPayments.map(p => p.event_id))];

      let eventsMap: Record<string, { title: string; lead_name: string; event_date: string; event_type: string; unit: string }> = {};

      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from('company_events')
          .select('id, title, lead_id, event_date, event_type, unit')
          .in('id', eventIds);

        if (events) {
          const leadIds = events.filter(e => e.lead_id).map(e => e.lead_id!);
          let leadsMap: Record<string, string> = {};
          if (leadIds.length > 0) {
            const { data: leads } = await supabase
              .from('campaign_leads')
              .select('id, name')
              .in('id', leadIds);
            if (leads) leadsMap = Object.fromEntries(leads.map(l => [l.id, l.name]));
          }
          eventsMap = Object.fromEntries(events.map(e => [e.id, {
            title: e.title,
            lead_name: e.lead_id ? leadsMap[e.lead_id] || '' : '',
            event_date: e.event_date,
            event_type: e.event_type || '',
            unit: e.unit || '',
          }]));
        }
      }

      const now = new Date().toISOString().split('T')[0];
      const enriched: EnrichedPayment[] = rawPayments.map(p => ({
        id: p.id,
        event_id: p.event_id,
        amount: Number(p.amount),
        due_date: p.due_date,
        status: (p.status === 'pending' && p.due_date < now ? 'late' : p.status) as EnrichedPayment['status'],
        type: p.type || 'parcela',
        payment_method: p.payment_method,
        paid_at: p.paid_at,
        lead_name: eventsMap[p.event_id]?.lead_name || '',
        event_title: eventsMap[p.event_id]?.title || '',
        event_date: eventsMap[p.event_id]?.event_date || '',
        event_type: eventsMap[p.event_id]?.event_type || '',
        unit: eventsMap[p.event_id]?.unit || '',
      }));

      setPayments(enriched);
      const expenseData = (expensesRes.data || []).map(e => ({ ...e, amount: Number(e.amount) })) as Expense[];
      console.log('[Financeiro] expenses fetched:', expenseData.length, 'raw:', expensesRes.data?.length, 'error:', expensesRes.error);
      setExpenses(expenseData);
    } catch (err) {
      console.error('[useFinanceiroDashboard] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtered data
  const monthStart = startOfMonth(new Date(filters.month + '-01'));
  const monthEnd = endOfMonth(monthStart);
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (filters.unit !== 'all' && p.unit !== filters.unit) return false;
      if (filters.status !== 'all') {
        if (filters.status === 'paid' && p.status !== 'paid') return false;
        if (filters.status === 'pending' && p.status !== 'pending') return false;
        if (filters.status === 'late' && p.status !== 'late') return false;
      }
      return true;
    });
  }, [payments, filters.unit, filters.status]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (filters.unit !== 'all' && e.unit !== filters.unit) return false;
      if (filters.status !== 'all') {
        if (filters.status === 'paid' && e.status !== 'pago') return false;
        if (filters.status === 'pending' && e.status !== 'pendente') return false;
      }
      return true;
    });
  }, [expenses, filters.unit, filters.status]);

  // Aggregations
  const paidThisMonth = filteredPayments.filter(p => p.status === 'paid' && p.paid_at && p.paid_at.slice(0, 7) === filters.month);
  const totalReceivedMonth = paidThisMonth.reduce((s, p) => s + p.amount, 0);

  const pendingThisMonth = filteredPayments.filter(p => p.status === 'pending' && p.due_date >= monthStartStr && p.due_date <= monthEndStr);
  const totalPendingMonth = pendingThisMonth.reduce((s, p) => s + p.amount, 0);

  const latePayments = filteredPayments.filter(p => p.status === 'late').sort((a, b) => a.due_date.localeCompare(b.due_date));
  const totalLate = latePayments.reduce((s, p) => s + p.amount, 0);

  const expensesThisMonth = filteredExpenses.filter(e => e.expense_date >= monthStartStr && e.expense_date <= monthEndStr);
  const totalExpensesMonth = expensesThisMonth.reduce((s, e) => s + e.amount, 0);

  const saldoMonth = totalReceivedMonth - totalExpensesMonth;

  // CRUD expenses
  const addExpense = async (data: { description: string; amount: number; expense_date: string; category: string; expense_type?: string; unit?: string; status: string; notes?: string }) => {
    if (!companyId) return;
    const { error } = await supabase.from('company_expenses').insert({ ...data, expense_type: data.expense_type || 'fixa', company_id: companyId });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: data.expense_type === 'ajuste' ? 'Ajuste de saldo registrado' : 'Despesa adicionada' });
    fetchData();
  };

  const updateExpense = async (id: string, data: Partial<Expense>) => {
    const { error } = await supabase.from('company_expenses').update(data).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Despesa atualizada' });
    fetchData();
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('company_expenses').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Despesa removida' });
    fetchData();
  };

  const markPaymentAsPaid = async (paymentId: string) => {
    const { error } = await supabase.from('event_payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', paymentId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Pagamento registrado' });
    fetchData();
  };

  return {
    payments: filteredPayments,
    expenses: filteredExpenses,
    isLoading,
    filters,
    setFilters,
    // Aggregations
    totalReceivedMonth,
    totalPendingMonth,
    totalLate,
    totalExpensesMonth,
    saldoMonth,
    // Categorized lists
    paidThisMonth,
    pendingThisMonth,
    latePayments,
    expensesThisMonth,
    // Actions
    addExpense,
    updateExpense,
    deleteExpense,
    markPaymentAsPaid,
    refresh: fetchData,
  };
}
