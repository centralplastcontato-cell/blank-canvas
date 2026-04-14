import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activityLog';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface EnrichedPayment {
  id: string;
  event_id: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'late' | 'partial';
  type: string;
  payment_method: string | null;
  paid_at: string | null;
  lead_name: string;
  event_title: string;
  event_date: string;
  event_type: string;
  unit: string;
  is_permuta: boolean;
  bank_account_id: string | null;
  entries_total: number;
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
  receipt_url: string | null;
  created_at: string;
  bank_account_id: string | null;
}

export interface FinanceiroDashboardFilters {
  from: string; // yyyy-MM-dd
  to: string;   // yyyy-MM-dd
  unit: string;
  status: string;
  tipo: string;
  bankAccount: string;
}

export function useFinanceiroDashboard() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const [payments, setPayments] = useState<EnrichedPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenues, setRevenues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FinanceiroDashboardFilters>({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    unit: 'all',
    status: 'all',
    tipo: 'all',
    bankAccount: 'all',
  });

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);

    try {
      const [paymentsRes, expensesRes, eventsWithDetailsRes, cardFeesRes, revenuesRes, entriesRes] = await Promise.all([
        supabase.from('event_payments').select('*').eq('company_id', companyId).order('due_date'),
        supabase.from('company_expenses').select('*').eq('company_id', companyId).order('expense_date', { ascending: false }),
        supabase.from('company_events').select('id, payment_details').eq('company_id', companyId).not('payment_details', 'is', null),
        supabase.from('company_card_fees' as any).select('*').eq('company_id', companyId).eq('is_active', true),
        supabase.from('company_revenues' as any).select('*').eq('company_id', companyId).order('revenue_date', { ascending: false }),
        supabase.from('event_payment_entries' as any).select('id, payment_id, amount, paid_at').eq('company_id', companyId),
      ]);

      const cardFeesList = (cardFeesRes.data || []) as any[];
      const getCardTax = (parcelas: number): number => {
        if (cardFeesList.length === 0) return 0;
        const op = cardFeesList[0];
        const key = `taxa_credito_${Math.min(Math.max(1, parcelas), 12)}x`;
        return Number(op[key] || 0);
      };

      // Auto-heal: backfill missing financial rows from payment_details (legacy events)
      let rawPayments = paymentsRes.data || [];
      const eventsWithDetails = (eventsWithDetailsRes.data || []) as Array<{ id: string; payment_details: any }>;

      if (eventsWithDetails.length > 0) {
        const paymentsByEvent = new Map<string, any[]>();
        rawPayments.forEach((p: any) => {
          const list = paymentsByEvent.get(p.event_id) || [];
          list.push(p);
          paymentsByEvent.set(p.event_id, list);
        });

        const today = new Date().toISOString().split('T')[0];
        const parseAmount = (value: unknown): number | null => {
          if (typeof value === 'number') return Number.isFinite(value) ? value : null;
          if (typeof value !== 'string') return null;
          const cleaned = value.trim().replace(/R\$\s?/g, '').replace(/\s/g, '');
          if (!cleaned) return null;
          const normalized = cleaned.includes(',')
            ? cleaned.replace(/\./g, '').replace(',', '.')
            : cleaned;
          const parsed = Number(normalized);
          return Number.isFinite(parsed) ? parsed : null;
        };
        const parseDate = (value: unknown): string => {
          if (typeof value !== 'string') return today;
          const v = value.trim();
          if (!v) return today;
          if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
            const [d, m, y] = v.split('/');
            return `${y}-${m}-${d}`;
          }
          return today;
        };

        const rowsToInsert: any[] = [];

        eventsWithDetails.forEach((ev) => {
          const pd = ev.payment_details as any;
          if (!pd) return;

          const existing = paymentsByEvent.get(ev.id) || [];
          // If any payments already exist (paid or pending), skip backfill entirely
          // This prevents re-creating manually deleted parcelas
          if (existing.length > 0) return;
          const hasEntrada = false;
          const parcelaCount = 0;

          const entradaAmount = parseAmount(pd.entrada_valor);
          if (!hasEntrada && entradaAmount && entradaAmount > 0) {
            let amount = entradaAmount;
            // Card payments: store NET amount
            if (pd.entrada_forma === 'cartao') {
              const parcelas = Math.max(1, Number(pd.entrada_parcelas) || 1);
              const taxa = getCardTax(parcelas);
              if (taxa > 0) amount = entradaAmount - (entradaAmount * taxa / 100);
            }
            rowsToInsert.push({
              event_id: ev.id,
              company_id: companyId,
              type: 'entrada',
              amount: Math.round(amount * 100) / 100,
              due_date: parseDate(pd.entrada_data),
              payment_method: pd.entrada_forma || null,
              status: 'pending',
            });
          }

          if (parcelaCount === 0) {
            // Card balance: single row with net amount, no installment splitting
            if (pd.saldo_forma === 'cartao') {
              const saldoAmount = parseAmount(pd.saldo_valor);
              if (saldoAmount && saldoAmount > 0) {
                const parcelas = Math.max(1, Number(pd.parcelas) || 1);
                const taxa = getCardTax(parcelas);
                let amount = saldoAmount;
                if (taxa > 0) amount = saldoAmount - (saldoAmount * taxa / 100);
                rowsToInsert.push({
                  event_id: ev.id,
                  company_id: companyId,
                  type: 'parcela',
                  amount: Math.round(amount * 100) / 100,
                  due_date: parseDate(pd.saldo_data),
                  payment_method: 'cartao',
                  status: 'pending',
                });
              }
            } else {
              // Non-card: keep existing installment logic
              let createdFromDetails = false;
              if (Array.isArray(pd.parcelas_details) && pd.parcelas_details.length > 0) {
                pd.parcelas_details.forEach((p: any) => {
                  const parcelaAmount = parseAmount(p?.valor);
                  if (parcelaAmount && parcelaAmount > 0) {
                    createdFromDetails = true;
                    rowsToInsert.push({
                      event_id: ev.id,
                      company_id: companyId,
                      type: 'parcela',
                      amount: parcelaAmount,
                      due_date: parseDate(p?.vencimento || pd.saldo_data),
                      payment_method: pd.saldo_forma || null,
                      status: 'pending',
                    });
                  }
                });
              }

              if (!createdFromDetails) {
                const saldoAmount = parseAmount(pd.saldo_valor);
                if (saldoAmount && saldoAmount > 0) {
                  rowsToInsert.push({
                    event_id: ev.id,
                    company_id: companyId,
                    type: 'parcela',
                    amount: saldoAmount,
                    due_date: parseDate(pd.saldo_data),
                    payment_method: pd.saldo_forma || null,
                    status: 'pending',
                  });
                }
              }
            }
          }
        });

        if (rowsToInsert.length > 0) {
          const insertedRows: any[] = [];
          for (const row of rowsToInsert) {
            const { data: inserted, error: rowError } = await supabase
              .from('event_payments')
              .insert(row)
              .select('*')
              .single();
            if (rowError) {
              console.error('[Financeiro] backfill row error:', rowError, row);
            } else if (inserted) {
              insertedRows.push(inserted);
            }
          }

          if (insertedRows.length > 0) {
            rawPayments = [...rawPayments, ...insertedRows];
          }
        }
      }

      // Enrich payments with event + lead data
      const eventIds = [...new Set(rawPayments.map((p: any) => p.event_id))];

      let eventsMap: Record<string, { title: string; lead_name: string; event_date: string; event_type: string; unit: string; is_permuta: boolean }> = {};

      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from('company_events')
          .select('id, title, lead_id, event_date, event_type, unit, is_permuta')
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
            is_permuta: e.is_permuta || false,
          }]));
        }
      }

      // Build entries totals map
      const entriesTotalsMap = new Map<string, number>();
      ((entriesRes.data || []) as any[]).forEach((entry: any) => {
        const current = entriesTotalsMap.get(entry.payment_id) || 0;
        entriesTotalsMap.set(entry.payment_id, current + Number(entry.amount));
      });

      const now = new Date().toISOString().split('T')[0];
      const enriched: EnrichedPayment[] = rawPayments.map(p => {
        const entriesTotal = entriesTotalsMap.get(p.id) || 0;
        let status: EnrichedPayment['status'] = (p.status === 'pending' && p.due_date < now ? 'late' : p.status) as EnrichedPayment['status'];
        // Mark as partial if has entries but not fully paid
        if (status !== 'paid' && entriesTotal > 0 && entriesTotal < Number(p.amount)) {
          status = 'partial';
        }
        return {
          id: p.id,
          event_id: p.event_id,
          amount: Number(p.amount),
          due_date: p.due_date,
          status,
          type: p.type || 'parcela',
          payment_method: p.payment_method,
          paid_at: p.paid_at,
          lead_name: eventsMap[p.event_id]?.lead_name || '',
          event_title: eventsMap[p.event_id]?.title || '',
          event_date: eventsMap[p.event_id]?.event_date || '',
          event_type: eventsMap[p.event_id]?.event_type || '',
          unit: eventsMap[p.event_id]?.unit || '',
          is_permuta: eventsMap[p.event_id]?.is_permuta || false,
          bank_account_id: p.bank_account_id || null,
          entries_total: entriesTotal,
        };
      });

      setPayments(enriched);
      const expenseData = (expensesRes.data || []).map(e => ({ ...e, amount: Number(e.amount) })) as Expense[];
      console.log('[Financeiro] expenses fetched:', expenseData.length, 'raw:', expensesRes.data?.length, 'error:', expensesRes.error);
      setExpenses(expenseData);
      setRevenues((revenuesRes.data || []).map((r: any) => ({ ...r, amount: Number(r.amount) })));
    } catch (err) {
      console.error('[useFinanceiroDashboard] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Use from/to from filters
  const periodFrom = filters.from;
  const periodTo = filters.to;

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (filters.unit !== 'all' && p.unit !== filters.unit) return false;
      if (filters.status !== 'all') {
        if (filters.status === 'paid' && p.status !== 'paid') return false;
        if (filters.status === 'pending' && p.status !== 'pending' && p.status !== 'partial') return false;
        if (filters.status === 'late' && p.status !== 'late') return false;
      }
      if (filters.bankAccount !== 'all' && p.bank_account_id !== filters.bankAccount) return false;
      return true;
    });
  }, [payments, filters.unit, filters.status, filters.bankAccount]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (filters.status !== 'all') {
        if (filters.status === 'paid' && e.status !== 'pago') return false;
        if (filters.status === 'pending' && e.status !== 'pendente') return false;
      }
      if (filters.bankAccount !== 'all' && e.bank_account_id !== filters.bankAccount) return false;
      return true;
    });
  }, [expenses, filters.status, filters.bankAccount]);

  // Aggregations using from/to range — exclude permuta from financial totals
  const nonPermutaPayments = filteredPayments.filter(p => !p.is_permuta);

  const paidThisMonth = nonPermutaPayments.filter(p => p.status === 'paid' && p.paid_at && p.paid_at.slice(0, 10) >= periodFrom && p.paid_at.slice(0, 10) <= periodTo);
  // Include entries_total from partial payments (entries already received even if installment not fully paid)
  const partialReceivedInPeriod = nonPermutaPayments.filter(p => p.status === 'partial' && p.entries_total > 0);
  const revenuesReceivedInPeriod = revenues.filter(r => r.status === 'recebido' && r.revenue_date >= periodFrom && r.revenue_date <= periodTo);
  const totalReceivedMonth = paidThisMonth.reduce((s, p) => s + p.amount, 0)
    + partialReceivedInPeriod.reduce((s, p) => s + p.entries_total, 0)
    + revenuesReceivedInPeriod.reduce((s: number, r: any) => s + r.amount, 0);

  const pendingThisMonth = nonPermutaPayments.filter(p => (p.status === 'pending' || p.status === 'partial') && p.due_date >= periodFrom && p.due_date <= periodTo);
  const revenuesPendingInPeriod = revenues.filter(r => r.status === 'pendente' && r.revenue_date >= periodFrom && r.revenue_date <= periodTo);
  const totalPendingMonth = pendingThisMonth.reduce((s, p) => s + (p.amount - p.entries_total), 0) + revenuesPendingInPeriod.reduce((s: number, r: any) => s + r.amount, 0);

  const latePayments = nonPermutaPayments.filter(p => p.status === 'late').sort((a, b) => a.due_date.localeCompare(b.due_date));
  const totalLate = latePayments.reduce((s, p) => s + (p.amount - p.entries_total), 0);

  const expensesThisMonth = filteredExpenses.filter(e => e.expense_date >= periodFrom && e.expense_date <= periodTo);
  const realExpensesThisMonth = expensesThisMonth.filter(e => e.expense_type !== 'ajuste');
  const totalExpensesMonth = realExpensesThisMonth.reduce((s, e) => s + e.amount, 0);
  const totalExpensesPaidMonth = realExpensesThisMonth.filter(e => e.status === 'pago').reduce((s, e) => s + e.amount, 0);

  const saldoMonth = totalReceivedMonth - totalExpensesMonth;

  // CRUD expenses
  const addExpense = async (data: { description: string; amount: number; expense_date: string; category: string; subcategory?: string; expense_type?: string; unit?: string; status: string; notes?: string; receipt_url?: string; boleto_url?: string; bank_account_id?: string }) => {
    if (!companyId) return;
    const { error } = await supabase.from('company_expenses').insert({ ...data, expense_type: data.expense_type || 'fixa', company_id: companyId });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: data.expense_type === 'ajuste' ? 'Ajuste de saldo registrado' : 'Despesa adicionada' });
    logActivity({ companyId, action: 'create', module: 'financial', entityType: 'expense', entityName: data.description, details: { amount: data.amount, category: data.category } });
    fetchData();
  };

  const updateExpense = async (id: string, data: Partial<Expense>) => {
    const { error } = await supabase.from('company_expenses').update(data).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Despesa atualizada' });
    if (companyId) logActivity({ companyId, action: 'update', module: 'financial', entityType: 'expense', entityId: id });
    fetchData();
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('company_expenses').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Despesa removida' });
    if (companyId) logActivity({ companyId, action: 'delete', module: 'financial', entityType: 'expense', entityId: id });
    fetchData();
  };

  const markPaymentAsPaid = async (paymentId: string, bankAccountId?: string | null) => {
    const updateData: Record<string, any> = { status: 'paid', paid_at: new Date().toISOString() };
    if (bankAccountId) updateData.bank_account_id = bankAccountId;
    const { error } = await supabase.from('event_payments').update(updateData).eq('id', paymentId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Pagamento registrado' });
    if (companyId) logActivity({ companyId, action: 'payment', module: 'financial', entityType: 'payment', entityId: paymentId });
    fetchData();
  };

  // CRUD revenues
  const addRevenue = async (data: { description: string; amount: number; revenue_date: string; bank_account_id?: string; receipt_url?: string; notes?: string; status: string }) => {
    if (!companyId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from('company_revenues').insert({ ...data, company_id: companyId, created_by: user?.id || null });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Receita adicionada' });
    logActivity({ companyId, action: 'create', module: 'financial', entityType: 'revenue', entityName: data.description, details: { amount: data.amount } });
    fetchData();
  };

  const updateRevenue = async (id: string, data: Record<string, any>) => {
    const { error } = await (supabase as any).from('company_revenues').update(data).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Receita atualizada' });
    if (companyId) logActivity({ companyId, action: 'update', module: 'financial', entityType: 'revenue', entityId: id });
    fetchData();
  };

  const deleteRevenue = async (id: string) => {
    const { error } = await (supabase as any).from('company_revenues').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Receita removida' });
    if (companyId) logActivity({ companyId, action: 'delete', module: 'financial', entityType: 'revenue', entityId: id });
    fetchData();
  };

  return {
    payments: filteredPayments,
    expenses: filteredExpenses,
    revenues,
    isLoading,
    filters,
    setFilters,
    // Aggregations
    totalReceivedMonth,
    totalPendingMonth,
    totalLate,
    totalExpensesMonth,
    totalExpensesPaidMonth,
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
    addRevenue,
    updateRevenue,
    deleteRevenue,
    refresh: fetchData,
  };
}
