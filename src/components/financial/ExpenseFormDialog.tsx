import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = [
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'freela', label: 'Freela' },
  { value: 'compras', label: 'Compras' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'energia', label: 'Energia' },
  { value: 'agua', label: 'Água' },
  { value: 'internet', label: 'Internet/Telefone' },
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'impostos', label: 'Impostos/Taxas' },
  { value: 'funcionarios', label: 'Funcionários' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'equipamentos', label: 'Equipamentos' },
  { value: 'decoracao', label: 'Decoração' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'seguro', label: 'Seguro' },
  { value: 'contabilidade', label: 'Contabilidade' },
  { value: 'outros', label: 'Outros' },
];

const EXPENSE_TYPES = [
  { value: 'fixa', label: 'Despesa Fixa' },
  { value: 'variavel', label: 'Despesa Variável' },
  { value: 'festa', label: 'Despesa de Festa' },
  { value: 'ajuste', label: 'Ajuste de Saldo' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { description: string; amount: number; expense_date: string; category: string; expense_type?: string; status: string }) => void;
  defaultValues?: { description?: string; amount?: number; expense_date?: string; category?: string; expense_type?: string; status?: string };
  defaultExpenseType?: string;
}

export function ExpenseFormDialog({ open, onOpenChange, onSubmit, defaultValues, defaultExpenseType }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [category, setCategory] = useState('outros');
  const [expenseType, setExpenseType] = useState('fixa');
  const [status, setStatus] = useState('pendente');

  useEffect(() => {
    if (open && defaultValues) {
      setDescription(defaultValues.description || '');
      setAmount(defaultValues.amount?.toString() || '');
      setExpenseDate(defaultValues.expense_date || '');
      setCategory(defaultValues.category || 'outros');
      setExpenseType(defaultValues.expense_type || defaultExpenseType || 'fixa');
      setStatus(defaultValues.status || 'pendente');
    } else if (open) {
      setDescription('');
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setCategory('outros');
      setExpenseType(defaultExpenseType || 'fixa');
      setStatus('pendente');
    }
  }, [open, defaultValues, defaultExpenseType]);

  const handleSubmit = () => {
    const val = parseFloat(amount);
    if (!val || !description.trim() || !expenseDate) return;
    onSubmit({
      description: description.trim(),
      amount: val,
      expense_date: expenseDate,
      category,
      expense_type: expenseType,
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
            <Label>Tipo de despesa</Label>
            <Select value={expenseType} onValueChange={setExpenseType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
