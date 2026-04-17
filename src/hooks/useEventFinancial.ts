import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface EventPayment {
  id: string;
  event_id: string;
  company_id: string;
  type: 'entrada' | 'parcela';
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'late' | 'partial';
  payment_method: string | null;
  paid_at: string | null;
  notes: string | null;
  bank_account_id: string | null;
  created_at: string;
}

export interface PaymentEntry {
  id: string;
  payment_id: string;
  company_id: string;
  amount: number;
  paid_at: string;
  payment_method: string | null;
  bank_account_id: string | null;
  receipt_url: string | null;
  paid_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface EventExtra {
  id: string;
  event_id: string;
  company_id: string;
  description: string;
  amount: number;
  created_at: string;
}

export interface EventDiscount {
  id: string;
  event_id: string;
  company_id: string;
  type: 'fixed' | 'percentage';
  value: number;
  reason: string | null;
  created_at: string;
}

export interface TimelineEntry {
  id: string;
  event_id: string;
  type: string;
  description: string;
  created_at: string;
}

export interface FinancialSummary {
  totalAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  status: 'pago' | 'parcial' | 'atrasado' | 'pendente';
}

export function useEventFinancial(eventId: string | undefined, companyId: string | undefined, baseValue: number = 0) {
  const [payments, setPayments] = useState<EventPayment[]>([]);
  const [entries, setEntries] = useState<PaymentEntry[]>([]);
  const [extras, setExtras] = useState<EventExtra[]>([]);
  const [discounts, setDiscounts] = useState<EventDiscount[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const fetchAll = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);
    try {
      const [paymentsRes, extrasRes, discountsRes, timelineRes] = await Promise.all([
        supabase.from('event_payments').select('*').eq('event_id', eventId).order('due_date'),
        supabase.from('event_extras').select('*').eq('event_id', eventId).order('created_at'),
        supabase.from('event_discounts').select('*').eq('event_id', eventId).order('created_at'),
        supabase.from('event_financial_timeline').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
      ]);

      const now = new Date().toISOString().split('T')[0];
      const paymentData = (paymentsRes.data || []).map((p: any) => ({
        ...p,
        amount: Number(p.amount),
        status: p.status === 'pending' && p.due_date < now ? 'late' : p.status,
      })) as EventPayment[];

      // Fetch entries for all payments
      const paymentIds = paymentData.map(p => p.id);
      let entriesData: PaymentEntry[] = [];
      if (paymentIds.length > 0) {
        const { data: entriesRes } = await (supabase as any)
          .from('event_payment_entries')
          .select('*')
          .in('payment_id', paymentIds)
          .order('paid_at', { ascending: true });
        entriesData = (entriesRes || []).map((e: any) => ({ ...e, amount: Number(e.amount) }));
      }

      // Update payment statuses based on entries
      const entriesByPayment: Record<string, PaymentEntry[]> = {};
      entriesData.forEach(e => {
        if (!entriesByPayment[e.payment_id]) entriesByPayment[e.payment_id] = [];
        entriesByPayment[e.payment_id].push(e);
      });

      const finalPayments = paymentData.map(p => {
        if (p.status === 'paid') return p; // Already fully paid
        const pEntries = entriesByPayment[p.id] || [];
        const paidSum = pEntries.reduce((s, e) => s + e.amount, 0);
        if (paidSum >= p.amount) {
          return { ...p, status: 'paid' as const };
        } else if (paidSum > 0) {
          return { ...p, status: 'partial' as const };
        }
        return p;
      });

      setPayments(finalPayments);
      setEntries(entriesData);
      setExtras((extrasRes.data || []).map((e: any) => ({ ...e, amount: Number(e.amount) })) as EventExtra[]);
      setDiscounts((discountsRes.data || []).map((d: any) => ({ ...d, value: Number(d.value) })) as EventDiscount[]);
      setTimeline((timelineRes.data || []) as TimelineEntry[]);
    } catch (err) {
      console.error('[useEventFinancial] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Calculate summary — receivedAmount now includes entries sum
  const extrasTotal = extras.reduce((s, e) => s + e.amount, 0);
  const discountsTotal = discounts.reduce((s, d) => {
    if (d.type === 'percentage') return s + (baseValue * d.value / 100);
    return s + d.value;
  }, 0);
  const totalAmount = baseValue + extrasTotal - discountsTotal;
  
  // Received = fully paid parcels (amount) + partial entries sum for non-paid parcels
  const receivedAmount = (() => {
    let total = 0;
    payments.forEach(p => {
      if (p.status === 'paid') {
        total += p.amount;
      } else {
        // For partial/pending, sum their entries
        const pEntries = entries.filter(e => e.payment_id === p.id);
        total += pEntries.reduce((s, e) => s + e.amount, 0);
      }
    });
    return total;
  })();
  
  const pendingAmount = totalAmount - receivedAmount;
  const hasLate = payments.some(p => p.status === 'late');
  const hasPartial = payments.some(p => p.status === 'partial');

  const summary: FinancialSummary = {
    totalAmount: Math.max(0, totalAmount),
    receivedAmount,
    pendingAmount: Math.max(0, pendingAmount),
    status: pendingAmount <= 0 && payments.length > 0 ? 'pago' : hasLate ? 'atrasado' : (hasPartial || receivedAmount > 0) ? 'parcial' : 'pendente',
  };

  const addTimeline = async (type: string, description: string) => {
    if (!eventId || !companyId) return;
    await supabase.from('event_financial_timeline').insert({ event_id: eventId, company_id: companyId, type, description });
  };

  // Helper to get entries for a specific payment
  const getEntriesForPayment = (paymentId: string) => entries.filter(e => e.payment_id === paymentId);
  const getEntriesSum = (paymentId: string) => getEntriesForPayment(paymentId).reduce((s, e) => s + e.amount, 0);

  // CRUD operations
  const addPayment = async (data: {
    type: string; amount: number; due_date: string; payment_method: string;
    notes?: string; bank_account_id?: string;
    card_operator_id?: string; card_installments?: number; card_fee_percent?: number; gross_amount?: number;
  }) => {
    if (!eventId || !companyId) return;
    const { notes, ...rest } = data;
    const { error } = await supabase.from('event_payments').insert({
      event_id: eventId, company_id: companyId, ...rest, notes: notes || null,
    } as any);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    await addTimeline('payment_created', `${data.type === 'entrada' ? 'Entrada' : 'Parcela'} de R$ ${data.amount.toFixed(2)} criada`);
    toast({ title: 'Parcela adicionada' });
    fetchAll();
  };

  const updatePayment = async (id: string, data: Partial<EventPayment>) => {
    const { error } = await supabase.from('event_payments').update(data).eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Parcela atualizada' });
    fetchAll();
  };

  const markAsPaid = async (payment: EventPayment, bankAccountId?: string | null) => {
    if (busyIds.has(payment.id)) return;
    setBusyIds(prev => new Set(prev).add(payment.id));
    try {
      const updateData: Record<string, any> = { status: 'paid', paid_at: new Date().toISOString() };
      if (bankAccountId) updateData.bank_account_id = bankAccountId;
      const { error } = await supabase.from('event_payments').update(updateData).eq('id', payment.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      await addTimeline('payment_paid', `Pagamento de R$ ${payment.amount.toFixed(2)} registrado`);
      toast({ title: 'Pagamento registrado' });
      fetchAll();
    } finally {
      setBusyIds(prev => { const n = new Set(prev); n.delete(payment.id); return n; });
    }
  };

  const reopenPayment = async (payment: EventPayment) => {
    if (busyIds.has(payment.id)) return;
    setBusyIds(prev => new Set(prev).add(payment.id));
    try {
      const { error } = await supabase.from('event_payments').update({ status: 'pending', paid_at: null }).eq('id', payment.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      await addTimeline('payment_reopened', `Pagamento de R$ ${payment.amount.toFixed(2)} reaberto`);
      toast({ title: 'Parcela reaberta' });
      fetchAll();
    } finally {
      setBusyIds(prev => { const n = new Set(prev); n.delete(payment.id); return n; });
    }
  };

  const deletePayment = async (id: string) => {
    const { error } = await supabase.from('event_payments').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    await addTimeline('payment_deleted', 'Parcela removida');
    fetchAll();
  };

  // Partial payment (sub-payment) operations
  const addPartialPayment = async (paymentId: string, data: {
    amount: number;
    payment_method?: string;
    bank_account_id?: string;
    receipt_url?: string;
    paid_by?: string;
    notes?: string;
  }) => {
    if (!companyId) return;
    const { error } = await (supabase as any).from('event_payment_entries').insert({
      payment_id: paymentId,
      company_id: companyId,
      amount: data.amount,
      payment_method: data.payment_method || null,
      bank_account_id: data.bank_account_id || null,
      receipt_url: data.receipt_url || null,
      paid_by: data.paid_by || null,
      notes: data.notes || null,
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return false; }

    // Check if payment is now fully paid
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      const currentSum = getEntriesSum(paymentId) + data.amount;
      if (currentSum >= payment.amount) {
        await supabase.from('event_payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', paymentId);
      }
      await addTimeline('partial_payment', `Pagamento parcial de R$ ${data.amount.toFixed(2)} registrado (${payment.type === 'entrada' ? 'Entrada' : 'Parcela'})`);
    }

    toast({ title: 'Pagamento parcial registrado' });
    fetchAll();
    return true;
  };

  const deletePartialPayment = async (entryId: string) => {
    const { error } = await (supabase as any).from('event_payment_entries').delete().eq('id', entryId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    
    // Find the entry to get its payment_id and recalculate
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      const payment = payments.find(p => p.id === entry.payment_id);
      if (payment && payment.status === 'paid') {
        const remainingSum = entries.filter(e => e.payment_id === entry.payment_id && e.id !== entryId).reduce((s, e) => s + e.amount, 0);
        if (remainingSum < payment.amount) {
          await supabase.from('event_payments').update({ status: 'pending', paid_at: null }).eq('id', payment.id);
        }
      }
    }

    await addTimeline('partial_payment_deleted', 'Pagamento parcial removido');
    toast({ title: 'Pagamento parcial removido' });
    fetchAll();
  };

  const addExtra = async (data: { description: string; amount: number }) => {
    if (!eventId || !companyId) return;
    const { error } = await supabase.from('event_extras').insert({ event_id: eventId, company_id: companyId, ...data });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    await addTimeline('extra_added', `Extra "${data.description}" de R$ ${data.amount.toFixed(2)} adicionado`);
    toast({ title: 'Extra adicionado' });
    fetchAll();
  };

  const deleteExtra = async (id: string) => {
    const { error } = await supabase.from('event_extras').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    await addTimeline('extra_removed', 'Extra removido');
    fetchAll();
  };

  const addDiscount = async (data: { type: 'fixed' | 'percentage'; value: number; reason?: string }) => {
    if (!eventId || !companyId) return;
    const { error } = await supabase.from('event_discounts').insert({ event_id: eventId, company_id: companyId, ...data });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    const label = data.type === 'percentage' ? `${data.value}%` : `R$ ${data.value.toFixed(2)}`;
    await addTimeline('discount_applied', `Desconto de ${label} aplicado`);
    toast({ title: 'Desconto aplicado' });
    fetchAll();
  };

  const deleteDiscount = async (id: string) => {
    const { error } = await supabase.from('event_discounts').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    await addTimeline('discount_removed', 'Desconto removido');
    fetchAll();
  };

  return {
    payments, entries, extras, discounts, timeline, summary, isLoading,
    addPayment, updatePayment, markAsPaid, reopenPayment, deletePayment,
    addPartialPayment, deletePartialPayment,
    getEntriesForPayment, getEntriesSum,
    addExtra, deleteExtra, addDiscount, deleteDiscount,
    refresh: fetchAll,
  };
}
