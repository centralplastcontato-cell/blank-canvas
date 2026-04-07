import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Building, Wallet } from 'lucide-react';
import { useBankAccounts } from '@/hooks/useBankAccounts';

const ACCOUNT_TYPES = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'digital', label: 'Conta Digital' },
  { value: 'caixa', label: 'Caixa (Dinheiro)' },
];

interface Props {
  value?: string | null;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function BankAccountSelect({ value, onValueChange, label, placeholder = 'Selecione a conta', className }: Props) {
  const { activeAccounts, createAccount, isLoading } = useBankAccounts();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('corrente');

  const handleQuickCreate = async () => {
    if (!newName.trim()) return;
    await createAccount({
      name: newName.trim(),
      account_type: newType,
      initial_balance: 0,
    });
    setQuickCreateOpen(false);
    setNewName('');
    setNewType('corrente');
  };

  return (
    <>
      <div className={className}>
        {label && <Label className="mb-1.5 block">{label}</Label>}
        <div className="flex gap-2">
          <Select value={value || ''} onValueChange={onValueChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={isLoading ? 'Carregando...' : placeholder} />
            </SelectTrigger>
            <SelectContent>
              {activeAccounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id}>
                  <span className="flex items-center gap-2">
                    {acc.account_type === 'caixa' ? (
                      <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Building className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {acc.name}
                    {acc.is_default && <span className="text-[10px] text-primary font-medium">(padrão)</span>}
                  </span>
                </SelectItem>
              ))}
              {activeAccounts.length === 0 && !isLoading && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                  Nenhuma conta cadastrada
                </div>
              )}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => setQuickCreateOpen(true)}
            title="Criar conta rápida"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Conta Rápida</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da conta</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Bradesco PJ, Caixa do buffet"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleQuickCreate} disabled={!newName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
