import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';

export interface FinancialConsent {
  id: string;
  company_id: string;
  action_type: string;
  entity_id: string;
  entity_table: string;
  payload: Record<string, any>;
  description: string | null;
  amount: number | null;
  requested_by: string | null;
  requested_by_name: string | null;
  requested_at: string;
  status: string;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  // Enriched fields
  event_title?: string | null;
  event_type?: string | null;
  event_date?: string | null;
  bank_account_name?: string | null;
}

export function useFinancialConsent() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const [requiresConsent, setRequiresConsent] = useState(false);
  const [pendingConsents, setPendingConsents] = useState<FinancialConsent[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Check if current user requires consent
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data } = await supabase
        .from('user_permissions')
        .select('granted')
        .eq('user_id', user.id)
        .eq('permission', 'financial.consent')
        .maybeSingle();

      // Only requires consent if explicitly set to true
      setRequiresConsent(data?.granted === true);
      setIsLoading(false);
    })();
  }, []);

  // Fetch pending consents for this company (enriched with event + bank data)
  const fetchPending = useCallback(async () => {
    if (!companyId) return;
    const { data } = await (supabase as any)
      .from('financial_consents')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (!data || data.length === 0) {
      setPendingConsents([]);
      setPendingCount(0);
      return;
    }

    // Enrich with event and bank data
    const paymentEntityIds = data
      .filter((c: any) => c.entity_table === 'event_payments')
      .map((c: any) => c.entity_id);

    const expenseEntityIds = data
      .filter((c: any) => c.entity_table === 'company_expenses')
      .map((c: any) => c.entity_id);

    // Fetch event info via payments
    let paymentEventMap: Record<string, { event_title: string; event_type: string; event_date: string }> = {};
    if (paymentEntityIds.length > 0) {
      const { data: payments } = await supabase
        .from('event_payments')
        .select('id, event_id, company_events(title, event_type, event_date)')
        .in('id', paymentEntityIds);
      if (payments) {
        for (const p of payments as any[]) {
          const ev = p.company_events;
          if (ev) {
            paymentEventMap[p.id] = { event_title: ev.title, event_type: ev.event_type, event_date: ev.event_date };
          }
        }
      }
    }

    // Fetch bank account names
    const bankIds = data
      .map((c: any) => c.payload?.bank_account_id)
      .filter(Boolean);
    let bankMap: Record<string, string> = {};
    if (bankIds.length > 0) {
      const { data: banks } = await supabase
        .from('company_bank_accounts')
        .select('id, name')
        .in('id', bankIds);
      if (banks) {
        for (const b of banks) { bankMap[b.id] = b.name; }
      }
    }

    const enriched: FinancialConsent[] = data.map((c: any) => ({
      ...c,
      payload: c.payload || {},
      event_title: paymentEventMap[c.entity_id]?.event_title || null,
      event_type: paymentEventMap[c.entity_id]?.event_type || null,
      event_date: paymentEventMap[c.entity_id]?.event_date || null,
      bank_account_name: bankMap[c.payload?.bank_account_id] || null,
    }));

    setPendingConsents(enriched);
    setPendingCount(enriched.length);
  }, [companyId]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const submitForConsent = async (params: {
    actionType: string;
    entityId: string;
    entityTable: string;
    payload: Record<string, any>;
    description?: string;
    amount?: number;
  }) => {
    if (!companyId) return;
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get user profile name
    let userName = 'Usuário';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile?.full_name) userName = profile.full_name;
    }

    const { error } = await (supabase as any)
      .from('financial_consents')
      .insert({
        company_id: companyId,
        action_type: params.actionType,
        entity_id: params.entityId,
        entity_table: params.entityTable,
        payload: params.payload,
        description: params.description || null,
        amount: params.amount || null,
        requested_by: user?.id || null,
        requested_by_name: userName,
      });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }

    toast({ title: '📋 Enviado para aprovação', description: 'Um gestor precisa aprovar esta ação.' });
    fetchPending();
    return true;
  };

  const approveConsent = async (consent: FinancialConsent) => {
    const { data: { user } } = await supabase.auth.getUser();
    let reviewerName = 'Gestor';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile?.full_name) reviewerName = profile.full_name;
    }

    // Execute the original action
    let actionError: string | null = null;

    if (consent.action_type === 'payment_paid') {
      const updateData: Record<string, any> = { status: 'paid', paid_at: new Date().toISOString() };
      if (consent.payload.bank_account_id) updateData.bank_account_id = consent.payload.bank_account_id;
      const { error } = await supabase.from('event_payments').update(updateData).eq('id', consent.entity_id);
      if (error) actionError = error.message;
    } else if (consent.action_type === 'partial_payment') {
      // Insert the partial payment entry
      const { error } = await (supabase as any).from('event_payment_entries').insert({
        payment_id: consent.entity_id,
        company_id: consent.company_id,
        amount: consent.payload.amount,
        payment_method: consent.payload.payment_method || null,
        bank_account_id: consent.payload.bank_account_id || null,
        receipt_url: consent.payload.receipt_url || null,
        paid_by: consent.payload.paid_by || null,
        notes: consent.payload.notes || null,
      });
      if (error) {
        actionError = error.message;
      } else {
        // Check if payment is now fully paid
        const { data: entriesData } = await (supabase as any)
          .from('event_payment_entries')
          .select('amount')
          .eq('payment_id', consent.entity_id);
        const totalPaid = (entriesData || []).reduce((s: number, e: any) => s + Number(e.amount), 0);
        const { data: paymentData } = await supabase.from('event_payments').select('amount').eq('id', consent.entity_id).single();
        if (paymentData && totalPaid >= Number(paymentData.amount)) {
          await supabase.from('event_payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', consent.entity_id);
        }
      }
    } else if (consent.action_type === 'expense_paid') {
      const updateData: Record<string, any> = { status: 'pago' };
      if (consent.payload.receipt_url) updateData.receipt_url = consent.payload.receipt_url;
      if (consent.payload.bank_account_id) updateData.bank_account_id = consent.payload.bank_account_id;
      const { error } = await supabase.from('company_expenses').update(updateData).eq('id', consent.entity_id);
      if (error) actionError = error.message;
    }

    if (actionError) {
      toast({ title: 'Erro ao efetivar ação', description: actionError, variant: 'destructive' });
      return;
    }

    // Mark consent as approved
    await (supabase as any)
      .from('financial_consents')
      .update({
        status: 'approved',
        reviewed_by: user?.id || null,
        reviewed_by_name: reviewerName,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', consent.id);

    toast({ title: '✅ Aprovado', description: 'Ação financeira efetivada com sucesso.' });
    fetchPending();
  };

  const rejectConsent = async (consentId: string, notes?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    let reviewerName = 'Gestor';
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile?.full_name) reviewerName = profile.full_name;
    }

    await (supabase as any)
      .from('financial_consents')
      .update({
        status: 'rejected',
        reviewed_by: user?.id || null,
        reviewed_by_name: reviewerName,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
      })
      .eq('id', consentId);

    toast({ title: 'Rejeitado', description: 'Solicitação financeira rejeitada.' });
    fetchPending();
  };

  return {
    requiresConsent,
    pendingConsents,
    pendingCount,
    isLoading,
    submitForConsent,
    approveConsent,
    rejectConsent,
    refresh: fetchPending,
  };
}
