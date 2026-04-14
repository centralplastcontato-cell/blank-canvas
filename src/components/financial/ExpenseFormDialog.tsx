import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, Loader2, ImageIcon, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrencyInput, parseCurrencyInput, numberToCurrencyDisplay } from '@/lib/currency-input';
import { BankAccountSelect } from './BankAccountSelect';
import { useExpenseSubcategories } from '@/hooks/useExpenseSubcategories';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const CATEGORIES = [
  { value: 'fornecedor', label: 'Fornecedor' },
  { value: 'freela', label: 'Freela' },
  { value: 'compras', label: 'Compras' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'energia', label: 'Energia' },
  { value: 'agua', label: 'Água' },
  { value: 'internet', label: 'Internet/Telefone' },
  { value: 'cozinha', label: 'Cozinha' },
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
  onSubmit: (data: { description: string; amount: number; expense_date: string; category: string; subcategory?: string; expense_type?: string; status: string; notes?: string; receipt_url?: string; boleto_url?: string; bank_account_id?: string }) => void;
  defaultValues?: { description?: string; amount?: number; expense_date?: string; category?: string; subcategory?: string; expense_type?: string; status?: string; notes?: string; receipt_url?: string; boleto_url?: string; bank_account_id?: string };
  defaultExpenseType?: string;
}

export function ExpenseFormDialog({ open, onOpenChange, onSubmit, defaultValues, defaultExpenseType }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [category, setCategory] = useState('outros');
  const [expenseType, setExpenseType] = useState('fixa');
  const [status, setStatus] = useState('pendente');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptPreview, setReceiptPreview] = useState('');
  const [boletoUrl, setBoletoUrl] = useState('');
  const [boletoPreview, setBoletoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingBoleto, setUploadingBoleto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const boletoInputRef = useRef<HTMLInputElement>(null);
  const [subcategory, setSubcategory] = useState('');
  const [subcategoryOpen, setSubcategoryOpen] = useState(false);
  const [subcategoryInput, setSubcategoryInput] = useState('');
  const { subcategories, addSubcategory } = useExpenseSubcategories(category);

  useEffect(() => {
    if (open && defaultValues) {
      setDescription(defaultValues.description || '');
      setAmount(defaultValues.amount ? numberToCurrencyDisplay(defaultValues.amount) : '');
      setExpenseDate(defaultValues.expense_date || '');
      setCategory(defaultValues.category || 'outros');
      setExpenseType(defaultValues.expense_type || defaultExpenseType || 'fixa');
      setStatus(defaultValues.status || 'pendente');
      setSubcategory(defaultValues.subcategory || '');
      setNotes(defaultValues.notes || '');
      setBankAccountId(defaultValues.bank_account_id || '');
      setReceiptUrl(defaultValues.receipt_url || '');
      setReceiptPreview(defaultValues.receipt_url || '');
      setBoletoUrl(defaultValues.boleto_url || '');
      setBoletoPreview(defaultValues.boleto_url || '');
    } else if (open) {
      setDescription('');
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setCategory('outros');
      setExpenseType(defaultExpenseType || 'fixa');
      setStatus('pendente');
      setBankAccountId('');
      setSubcategory('');
      setNotes('');
      setReceiptUrl('');
      setReceiptPreview('');
      setBoletoUrl('');
      setBoletoPreview('');
    }
  }, [open, defaultValues, defaultExpenseType]);

  const handleUpload = async (
    file: File,
    setUrl: (url: string) => void,
    setPreview: (p: string) => void,
    setLoading: (b: boolean) => void,
    successMsg: string
  ) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Envie uma imagem ou PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx 10MB)');
      return;
    }
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview('pdf');
    }
    setLoading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('expense-receipts').getPublicUrl(filePath);
      setUrl(urlData.publicUrl);
      toast.success(successMsg);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar arquivo');
      setPreview('');
      setUrl('');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUpload(file, setReceiptUrl, setReceiptPreview, setUploading, 'Comprovante anexado!');
  };

  const handleBoletoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUpload(file, setBoletoUrl, setBoletoPreview, setUploadingBoleto, 'Boleto anexado!');
  };

  const removeReceipt = () => {
    setReceiptUrl('');
    setReceiptPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeBoleto = () => {
    setBoletoUrl('');
    setBoletoPreview('');
    if (boletoInputRef.current) boletoInputRef.current.value = '';
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatCurrencyInput(e.target.value));
  };

  const handleSubmit = async () => {
    const val = parseCurrencyInput(amount);
    if (!val || !description.trim() || !expenseDate) return;
    // Save new subcategory if typed
    if (subcategory.trim() && expenseType !== 'ajuste') {
      await addSubcategory(subcategory.trim());
    }
    onSubmit({
      description: description.trim(),
      amount: val,
      expense_date: expenseDate,
      category: expenseType === 'ajuste' ? 'ajuste_saldo' : category,
      subcategory: subcategory.trim() || undefined,
      expense_type: expenseType,
      status,
      notes: notes.trim() || undefined,
      receipt_url: receiptUrl || undefined,
      boleto_url: boletoUrl || undefined,
      bank_account_id: bankAccountId || undefined,
    });
    onOpenChange(false);
  };

  const renderUploadField = (
    label: string,
    preview: string,
    inputRef: React.RefObject<HTMLInputElement>,
    isUploading: boolean,
    onRemove: () => void,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    icon: React.ReactNode,
    placeholder: string
  ) => (
    <div>
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
      {!preview ? (
        <Button
          type="button"
          variant="outline"
          className="w-full mt-1 h-16 border-dashed flex flex-col gap-0.5"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              {icon}
              <span className="text-xs text-muted-foreground">{placeholder}</span>
            </>
          )}
        </Button>
      ) : (
        <div className="relative mt-1 rounded-md border overflow-hidden">
          {preview === 'pdf' ? (
            <div className="flex items-center gap-2 p-3 bg-muted/50">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate">PDF anexado</span>
            </div>
          ) : (
            <img src={preview} alt={label} className="w-full max-h-32 object-cover" />
          )}
          <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={onRemove}>
            <X className="h-3 w-3" />
          </Button>
          {isUploading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border/40">
          <DialogTitle className="text-lg font-bold">{defaultValues ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto flex-1 px-6 py-4">
          <div>
            <Label>Tipo de despesa</Label>
            <Select value={expenseType} onValueChange={setExpenseType}>
              <SelectTrigger className="bg-white dark:bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: DJ para festa" className="bg-white dark:bg-background" />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input inputMode="decimal" value={amount} onChange={handleAmountChange} placeholder="0,00" className="bg-white dark:bg-background" />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="w-full min-w-0 bg-white dark:bg-background" />
          </div>
          {expenseType !== 'ajuste' && (
            <>
              <div>
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(val) => { setCategory(val); setSubcategory(''); setSubcategoryInput(''); }}>
                  <SelectTrigger className="bg-white dark:bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subcategoria (opcional)</Label>
                <Popover open={subcategoryOpen} onOpenChange={setSubcategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between font-normal mt-1 bg-white dark:bg-background">
                      {subcategory || 'Digite ou selecione...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar ou criar subcategoria..."
                        value={subcategoryInput}
                        onValueChange={setSubcategoryInput}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {subcategoryInput.trim() ? (
                            <button
                              className="w-full px-3 py-2 text-sm text-left hover:bg-accent cursor-pointer"
                              onClick={() => {
                                setSubcategory(subcategoryInput.trim());
                                setSubcategoryOpen(false);
                              }}
                            >
                              Criar "<strong>{subcategoryInput.trim()}</strong>"
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-sm px-3">Nenhuma subcategoria encontrada</span>
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {subcategories.map(sub => (
                            <CommandItem
                              key={sub}
                              value={sub}
                              onSelect={() => {
                                setSubcategory(sub);
                                setSubcategoryOpen(false);
                              }}
                            >
                              {sub}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-white dark:bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <BankAccountSelect
            value={bankAccountId}
            onValueChange={setBankAccountId}
            label="Conta bancária"
            placeholder="Selecione a conta de saída"
          />

          {/* Seção: Anexos */}
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-4 mt-3">
            <div className="flex items-center gap-2 pb-2 border-b border-primary/15">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FileText className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary/70">Anexos</span>
            </div>

            {renderUploadField(
              'Boleto / Conta',
              boletoPreview,
              boletoInputRef,
              uploadingBoleto,
              removeBoleto,
              handleBoletoChange,
              <FileText className="h-5 w-5 text-muted-foreground" />,
              'Anexar imagem do boleto ou conta'
            )}

            <div className="border-t border-primary/10" />

            {renderUploadField(
              'Comprovante de pagamento',
              receiptPreview,
              fileInputRef,
              uploading,
              removeReceipt,
              handleFileChange,
              <Camera className="h-5 w-5 text-muted-foreground" />,
              'Anexar comprovante de pagamento'
            )}
          </div>

          {/* Seção: Observações */}
          <div className="rounded-xl border-2 border-accent/40 bg-accent/20 p-4 mt-3">
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-accent/30">
              <div className="p-1.5 rounded-md bg-accent/30">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Observações</span>
            </div>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={expenseType === 'ajuste' ? 'Ex: Saldo em caixa na data de início da plataforma' : 'Detalhes adicionais sobre a despesa'}
              rows={2}
              className="bg-white dark:bg-background border-border/60"
            />
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-border/40 bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={uploading || uploadingBoleto}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
