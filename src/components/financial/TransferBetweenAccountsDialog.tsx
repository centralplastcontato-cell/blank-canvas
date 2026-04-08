import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';
import type { BankAccountBalance } from '@/hooks/useBankAccounts';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/currency-input';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: BankAccountBalance[];
  onSuccess: () => void;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function TransferBetweenAccountsDialog({ open, onOpenChange, accounts, onSuccess }: Props) {
  const { currentCompanyId } = useCompany();
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const parsedAmount = parseCurrencyInput(amount);

  const fromAccount = accounts.find(a => a.id === fromId);
  const toAccount = accounts.find(a => a.id === toId);
  const isValid = fromId && toId && fromId !== toId && parsedAmount > 0 && currentCompanyId && description.trim() && responsible.trim();

  const handleSubmit = async () => {
    if (!isValid || !currentCompanyId) return;
    setIsSubmitting(true);

    const label = description.trim();

    try {
      // 1. Create expense (exit) on origin account
      const { error: exitError } = await supabase.from('company_expenses').insert({
        company_id: currentCompanyId,
        description: `↗ ${label}`,
        amount: parsedAmount,
        expense_date: today,
        category: 'transferencia',
        expense_type: 'ajuste',
        status: 'pago',
        bank_account_id: fromId,
        notes: `Transferência para ${toAccount?.name}\nResponsável: ${responsible.trim()}`,
      });

      if (exitError) throw exitError;

      // 2. Create a payment entry (entry) on destination account
      // We use a negative expense (ajuste) as a credit — but since expenses are always exits,
      // we'll insert a second expense with negative amount won't work.
      // Instead, we use event_payments with a special approach:
      // Actually, let's use two expenses: one positive on origin (exit), one negative adjustment.
      // The cleanest approach: create an expense on origin (debit) and use event_payments for credit.
      // But event_payments require event_id. Let's use a different approach:
      // We'll create the exit as expense on origin, and for the entry on destination,
      // we'll also create an expense but with negative amount to represent a credit.
      // Actually the balance calc is: initial + entries - exits
      // entries = event_payments with status paid, exits = company_expenses with status pago
      // So to add to destination, we need an event_payment row. But that requires event_id.
      // 
      // Simplest correct approach: use a "reverse expense" with negative amount won't work either.
      // Let's just insert an event_payment without event_id for the credit side.
      
      // Check if event_payments allows null event_id... looking at the schema it's required.
      // So we need a different approach. Let's create both as expenses but treat the destination
      // one as a negative expense (credit adjustment).

      // Wait - looking at the balance calculation in useBankAccounts:
      // total_entries = sum of event_payments where bank_account_id = acc.id and status = paid
      // total_exits = sum of company_expenses where bank_account_id = acc.id and status = pago
      // current_balance = initial + entries - exits
      //
      // For origin: we add an expense (exit) → balance decreases ✓
      // For destination: we need an entry → need event_payment, but it requires event_id
      // Alternative: add expense with negative amount → exits decrease → balance increases ✓

      const { error: entryError } = await supabase.from('company_expenses').insert({
        company_id: currentCompanyId,
        description: `↙ ${label}`,
        amount: -parsedAmount, // Negative expense = credit
        expense_date: today,
        category: 'transferencia',
        expense_type: 'ajuste',
        status: 'pago',
        bank_account_id: toId,
        notes: `Transferência de ${fromAccount?.name}`,
      });

      if (entryError) throw entryError;

      toast({ title: 'Transferência realizada', description: `${fmt(parsedAmount)} de ${fromAccount?.name} → ${toAccount?.name}` });
      onOpenChange(false);
      setFromId('');
      setToId('');
      setAmount('');
      setDescription('');
      onSuccess();
    } catch (err: any) {
      toast({ title: 'Erro na transferência', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir entre contas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Origin */}
          <div className="space-y-1.5">
            <Label className="text-xs">Conta de origem</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
              <SelectContent>
                {accounts.filter(a => a.id !== toId).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {fmt(a.current_balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <Label className="text-xs">Conta de destino</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
              <SelectContent>
                {accounts.filter(a => a.id !== fromId).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {fmt(a.current_balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs">Valor</Label>
            <Input
              placeholder="R$ 0,00"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(formatCurrencyInput(e.target.value))}
              className="h-9"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição (opcional)</Label>
            <Input
              placeholder="Ex: Reforço de caixa"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Preview */}
          {isValid && fromAccount && toAccount && (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">De:</span>
                <span className="font-medium">{fromAccount.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Para:</span>
                <span className="font-medium">{toAccount.name}</span>
              </div>
              <div className="flex justify-between border-t border-border/30 pt-1 mt-1">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-bold text-primary">{fmt(parsedAmount)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
