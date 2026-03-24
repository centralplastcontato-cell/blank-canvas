import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'freela', label: 'Freela' },
  { value: 'compras', label: 'Compras' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'outros', label: 'Outros' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { description: string; amount: number; expense_date: string; category: string; unit?: string; status: string }) => void;
  unitOptions?: { value: string; label: string }[];
  defaultValues?: { description?: string; amount?: number; expense_date?: string; category?: string; unit?: string; status?: string };
}

export function ExpenseFormDialog({ open, onOpenChange, onSubmit, unitOptions, defaultValues }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [category, setCategory] = useState('outros');
  const [unit, setUnit] = useState('');
  const [status, setStatus] = useState('pendente');

  useEffect(() => {
    if (open && defaultValues) {
      setDescription(defaultValues.description || '');
      setAmount(defaultValues.amount?.toString() || '');
      setExpenseDate(defaultValues.expense_date || '');
      setCategory(defaultValues.category || 'outros');
      setUnit(defaultValues.unit || '');
      setStatus(defaultValues.status || 'pendente');
    } else if (open) {
      setDescription('');
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setCategory('outros');
      setUnit('');
      setStatus('pendente');
    }
  }, [open, defaultValues]);

  const handleSubmit = () => {
    const val = parseFloat(amount);
    if (!val || !description.trim() || !expenseDate) return;
    onSubmit({
      description: description.trim(),
      amount: val,
      expense_date: expenseDate,
      category,
      unit: unit || undefined,
      status,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: DJ para festa" />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {unitOptions && unitOptions.length > 0 && (
            <div>
              <Label>Unidade</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {unitOptions.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
