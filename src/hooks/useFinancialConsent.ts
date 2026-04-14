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

  // Fetch pending consents for this company
  const fetchPending = useCallback(async () => {
    if (!companyId) return;
    const { data } = await (supabase as any)
      .from('financial_consents')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });
    
    setPendingConsents(data || []);
    setPendingCount(data?.length || 0);
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
