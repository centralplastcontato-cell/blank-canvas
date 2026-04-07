import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Building, Wallet, Pencil, Trash2, Star, Loader2 } from 'lucide-react';
import { useBankAccounts, type BankAccountFormData, type BankAccountBalance } from '@/hooks/useBankAccounts';
import { toast } from 'sonner';

const ACCOUNT_TYPES = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'digital', label: 'Conta Digital' },
  { value: 'caixa', label: 'Caixa (Dinheiro)' },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(ACCOUNT_TYPES.map(t => [t.value, t.label]));

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function BankAccountsManager() {
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount, toggleActive } = useBankAccounts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccountBalance | null>(null);

  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [agency, setAgency] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('corrente');
  const [initialBalance, setInitialBalance] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setName(''); setBankName(''); setAgency(''); setAccountNumber('');
    setAccountType('corrente'); setInitialBalance(''); setIsDefault(false);
    setDialogOpen(true);
  };

  const openEdit = (acc: BankAccountBalance) => {
    setEditing(acc);
    setName(acc.name);
    setBankName(acc.bank_name || '');
    setAgency(acc.agency || '');
    setAccountNumber(acc.account_number || '');
    setAccountType(acc.account_type);
    setInitialBalance(acc.initial_balance.toString());
    setIsDefault(acc.is_default);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const data: BankAccountFormData = {
      name: name.trim(),
      bank_name: bankName.trim() || undefined,
      agency: agency.trim() || undefined,
      account_number: accountNumber.trim() || undefined,
      account_type: accountType,
      initial_balance: parseFloat(initialBalance) || 0,
      is_default: isDefault,
    };

    if (editing) {
      await updateAccount(editing.id, data);
    } else {
      await createAccount(data);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (acc: BankAccountBalance) => {
    if (acc.total_entries > 0 || acc.total_exits > 0) {
      toast.error('Não é possível excluir uma conta com movimentações vinculadas');
      return;
    }
    if (!confirm(`Excluir a conta "${acc.name}"?`)) return;
    await deleteAccount(acc.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Contas Bancárias</h2>
          <p className="text-sm text-muted-foreground">Gerencie as contas para vincular recebimentos e despesas</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Conta
        </Button>
      </div>

      {accounts.length === 0 ? (
        <Card className="p-8 text-center">
          <Building className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma conta bancária cadastrada</p>
          <Button onClick={openCreate} variant="outline" className="mt-3 gap-2">
            <Plus className="h-4 w-4" /> Criar primeira conta
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map(acc => (
            <Card key={acc.id} className={`p-4 border ${!acc.is_active ? 'opacity-50' : ''} ${acc.is_default ? 'border-primary/40 bg-primary/[0.03]' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  {acc.account_type === 'caixa' ? (
                    <div className="p-2 rounded-lg bg-amber-500/10"><Wallet className="h-4 w-4 text-amber-500" /></div>
                  ) : (
                    <div className="p-2 rounded-lg bg-blue-500/10"><Building className="h-4 w-4 text-blue-500" /></div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{acc.name}</p>
                    {acc.bank_name && <p className="text-xs text-muted-foreground truncate">{acc.bank_name}</p>}
                  </div>
                </div>
                {acc.is_default && (
                  <Badge variant="outline" className="shrink-0 text-[10px] gap-1 border-primary/30 text-primary">
                    <Star className="h-3 w-3" /> Padrão
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[acc.account_type] || acc.account_type}</Badge>
                {acc.agency && <span className="text-[10px] text-muted-foreground">Ag: {acc.agency}</span>}
                {acc.account_number && <span className="text-[10px] text-muted-foreground">CC: {acc.account_number}</span>}
              </div>

              <div className="text-xs text-muted-foreground mb-3">
                Criada em {new Date(acc.created_at).toLocaleDateString('pt-BR')}
              </div>

              <div className="flex items-center justify-between border-t border-border/30 pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={acc.is_active} onCheckedChange={v => toggleActive(acc.id, v)} />
                  <span className="text-xs text-muted-foreground">{acc.is_active ? 'Ativa' : 'Inativa'}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(acc)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(acc)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Conta' : 'Nova Conta Bancária'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da conta *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={accountType === 'caixa' ? 'Ex: Caixa do buffet' : 'Ex: Bradesco PJ'} />
            </div>
            <div className={accountType === 'caixa' ? '' : 'grid grid-cols-2 gap-3'}>
              {accountType !== 'caixa' && (
                <div>
                  <Label>Banco</Label>
                  <Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Ex: Bradesco" />
                </div>
              )}
              <div>
                <Label>Tipo</Label>
                <Select value={accountType} onValueChange={v => {
                  setAccountType(v);
                  if (v === 'caixa') { setBankName(''); setAgency(''); setAccountNumber(''); }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {accountType !== 'caixa' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Agência</Label>
                  <Input value={agency} onChange={e => setAgency(e.target.value)} placeholder="0001" />
                </div>
                <div>
                  <Label>Conta</Label>
                  <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="12345-6" />
                </div>
              </div>
            )}
            <div>
              <Label>Saldo inicial (R$)</Label>
              <Input type="number" step="0.01" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} placeholder="0,00" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <Label className="cursor-pointer">Definir como conta padrão</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!name.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
