import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface BankAccount {
  id: string;
  company_id: string;
  name: string;
  bank_name: string | null;
  agency: string | null;
  account_number: string | null;
  account_type: string;
  initial_balance: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankAccountBalance extends BankAccount {
  current_balance: number;
  total_entries: number;
  total_exits: number;
}

export interface BankAccountFormData {
  name: string;
  bank_name?: string;
  agency?: string;
  account_number?: string;
  account_type: string;
  initial_balance: number;
  is_default?: boolean;
}

export function useBankAccounts() {
  const { currentCompanyId } = useCompany();
  const [accounts, setAccounts] = useState<BankAccountBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!currentCompanyId) return;
    setIsLoading(true);
    try {
      const { data: accs, error } = await supabase
        .from('company_bank_accounts')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;

      // Calculate balances for each account
      const balances: BankAccountBalance[] = await Promise.all(
        (accs || []).map(async (acc: any) => {
          // Paginate to avoid 1000-row API limit
          const fetchAllAmounts = async (
            queryFn: (from: number, to: number) => ReturnType<ReturnType<typeof supabase.from>['select']>
          ) => {
            let all: any[] = [];
            let from = 0;
            const pageSize = 1000;
            while (true) {
              const { data } = await queryFn(from, from + pageSize - 1);
              if (!data || data.length === 0) break;
              all = all.concat(data);
              if (data.length < pageSize) break;
              from += pageSize;
            }
            return all;
          };

          const [entriesData, exitsData] = await Promise.all([
            fetchAllAmounts((from, to) =>
              supabase.from('event_payments').select('amount').eq('bank_account_id', acc.id).eq('status', 'paid').range(from, to)
            ),
            fetchAllAmounts((from, to) =>
              supabase.from('company_expenses').select('amount').eq('bank_account_id', acc.id).eq('status', 'pago').range(from, to)
            ),
          ]);

          const total_entries = entriesData.reduce((s: number, p: any) => s + Number(p.amount), 0);
          const total_exits = exitsData.reduce((s: number, e: any) => s + Number(e.amount), 0);
          const current_balance = Number(acc.initial_balance) + total_entries - total_exits;

          return {
            ...acc,
            initial_balance: Number(acc.initial_balance),
            current_balance,
            total_entries,
            total_exits,
          } as BankAccountBalance;
        })
      );

      setAccounts(balances);
    } catch (err) {
      console.error('[useBankAccounts] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompanyId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const createAccount = async (data: BankAccountFormData) => {
    if (!currentCompanyId) return;

    // If setting as default, unset others
    if (data.is_default) {
      await supabase
        .from('company_bank_accounts')
        .update({ is_default: false })
        .eq('company_id', currentCompanyId);
    }

    const { error } = await supabase.from('company_bank_accounts').insert({
      company_id: currentCompanyId,
      name: data.name,
      bank_name: data.bank_name || null,
      agency: data.agency || null,
      account_number: data.account_number || null,
      account_type: data.account_type,
      initial_balance: data.initial_balance,
      is_default: data.is_default || false,
    });

    if (error) { toast.error('Erro ao criar conta: ' + error.message); return; }
    toast.success('Conta bancária criada');
    fetchAccounts();
  };

  const updateAccount = async (id: string, data: Partial<BankAccountFormData>) => {
    if (!currentCompanyId) return;

    if (data.is_default) {
      await supabase
        .from('company_bank_accounts')
        .update({ is_default: false })
        .eq('company_id', currentCompanyId);
    }

    const { error } = await supabase.from('company_bank_accounts').update(data).eq('id', id);
    if (error) { toast.error('Erro ao atualizar conta: ' + error.message); return; }
    toast.success('Conta atualizada');
    fetchAccounts();
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from('company_bank_accounts').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir conta: ' + error.message); return; }
    toast.success('Conta excluída');
    fetchAccounts();
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from('company_bank_accounts').update({ is_active }).eq('id', id);
    fetchAccounts();
  };

  const activeAccounts = accounts.filter(a => a.is_active);
  const defaultAccount = accounts.find(a => a.is_default && a.is_active);

  return {
    accounts,
    activeAccounts,
    defaultAccount,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    toggleActive,
    refresh: fetchAccounts,
  };
}
