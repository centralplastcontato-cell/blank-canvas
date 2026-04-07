import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BankAccountBalance } from '@/hooks/useBankAccounts';

interface Props {
  account: BankAccountBalance;
}

interface Movement {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'entry' | 'exit';
  source: string;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function BankAccountStatement({ account }: Props) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    async function fetchMovements() {
      setIsLoading(true);
      try {
        const [entriesRes, exitsRes] = await Promise.all([
          supabase
            .from('event_payments')
            .select('id, amount, paid_at, type, payment_method, notes, event_id')
            .eq('bank_account_id', account.id)
            .eq('status', 'paid')
            .order('paid_at', { ascending: false }),
          supabase
            .from('company_expenses')
            .select('id, amount, expense_date, description, category')
            .eq('bank_account_id', account.id)
            .eq('status', 'pago')
            .order('expense_date', { ascending: false }),
        ]);

        const entries: Movement[] = (entriesRes.data || []).map((p: any) => ({
          id: p.id,
          date: p.paid_at?.split('T')[0] || '',
          description: `${p.type === 'entrada' ? 'Entrada' : 'Parcela'}${p.notes ? ' — ' + p.notes : ''}`,
          amount: Number(p.amount),
          type: 'entry' as const,
          source: 'Recebimento',
        }));

        const exits: Movement[] = (exitsRes.data || []).map((e: any) => ({
          id: e.id,
          date: e.expense_date,
          description: e.description,
          amount: Number(e.amount),
          type: 'exit' as const,
          source: e.category || 'Despesa',
        }));

        setMovements([...entries, ...exits].sort((a, b) => b.date.localeCompare(a.date)));
      } finally {
        setIsLoading(false);
      }
    }
    fetchMovements();
  }, [account.id]);

  const filtered = useMemo(() => {
    return movements.filter(m => {
      if (dateFrom && m.date < dateFrom) return false;
      if (dateTo && m.date > dateTo) return false;
      return true;
    });
  }, [movements, dateFrom, dateTo]);

  // Running balance calculation
  const movementsWithBalance = useMemo(() => {
    // Sort ascending for balance calc
    const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
    let balance = account.initial_balance;
    return sorted.map(m => {
      if (m.type === 'entry') balance += m.amount;
      else balance -= m.amount;
      return { ...m, balance };
    }).reverse(); // Show newest first
  }, [filtered, account.initial_balance]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Saldo Inicial</p>
          <p className="text-sm font-bold">{fmt(account.initial_balance)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-emerald-500 uppercase">Entradas</p>
          <p className="text-sm font-bold text-emerald-500">+{fmt(account.total_entries)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-red-400 uppercase">Saídas</p>
          <p className="text-sm font-bold text-red-400">-{fmt(account.total_exits)}</p>
        </Card>
      </div>

      {/* Current balance */}
      <Card className={`p-4 text-center ${account.current_balance >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
        <p className="text-xs text-muted-foreground">Saldo Atual</p>
        <p className={`text-2xl font-bold ${account.current_balance >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          {fmt(account.current_balance)}
        </p>
      </Card>

      {/* Date filter */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Label className="text-xs">De</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="flex-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-xs" />
        </div>
      </div>

      {/* Movements list */}
      {movementsWithBalance.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma movimentação encontrada</p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {movementsWithBalance.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card">
              {m.type === 'entry' ? (
                <ArrowUpCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <ArrowDownCircle className="h-5 w-5 text-red-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {m.date ? format(new Date(m.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                  </span>
                  <Badge variant="secondary" className="text-[9px] h-4">{m.source}</Badge>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${m.type === 'entry' ? 'text-emerald-500' : 'text-red-400'}`}>
                  {m.type === 'entry' ? '+' : '-'}{fmt(m.amount)}
                </p>
                <p className="text-[10px] text-muted-foreground">{fmt(m.balance)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
