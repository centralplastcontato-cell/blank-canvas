import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, Loader2, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrencyInput, parseCurrencyInput, numberToCurrencyDisplay } from '@/lib/currency-input';
import { BankAccountSelect } from './BankAccountSelect';

export interface RevenueFormData {
  description: string;
  amount: number;
  revenue_date: string;
  bank_account_id?: string;
  receipt_url?: string;
  notes?: string;
  status: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RevenueFormData) => void;
  defaultValues?: Partial<RevenueFormData>;
}

export function RevenueFormDialog({ open, onOpenChange, onSubmit, defaultValues }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [revenueDate, setRevenueDate] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [status, setStatus] = useState('recebido');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptPreview, setReceiptPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && defaultValues) {
      setDescription(defaultValues.description || '');
      setAmount(defaultValues.amount ? numberToCurrencyDisplay(defaultValues.amount) : '');
      setRevenueDate(defaultValues.revenue_date || '');
      setBankAccountId(defaultValues.bank_account_id || '');
      setStatus(defaultValues.status || 'recebido');
      setNotes(defaultValues.notes || '');
      setReceiptUrl(defaultValues.receipt_url || '');
      setReceiptPreview(defaultValues.receipt_url || '');
    } else if (open) {
      setDescription('');
      setAmount('');
      setRevenueDate(new Date().toISOString().split('T')[0]);
      setBankAccountId('');
      setStatus('recebido');
      setNotes('');
      setReceiptUrl('');
      setReceiptPreview('');
    }
  }, [open, defaultValues]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview('pdf');
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('expense-receipts')
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('expense-receipts').getPublicUrl(filePath);
      setReceiptUrl(urlData.publicUrl);
      toast.success('Comprovante anexado!');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar arquivo');
      setReceiptPreview('');
      setReceiptUrl('');
    } finally {
      setUploading(false);
    }
  };

  const removeReceipt = () => {
    setReceiptUrl('');
    setReceiptPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    const val = parseCurrencyInput(amount);
    if (!val || !description.trim() || !revenueDate) return;
    onSubmit({
      description: description.trim(),
      amount: val,
      revenue_date: revenueDate,
      bank_account_id: bankAccountId || undefined,
      receipt_url: receiptUrl || undefined,
      notes: notes.trim() || undefined,
      status,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Aluguel do espaço, patrocínio..." />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input inputMode="decimal" value={amount} onChange={e => setAmount(formatCurrencyInput(e.target.value))} placeholder="0,00" />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={revenueDate} onChange={e => setRevenueDate(e.target.value)} className="w-full min-w-0" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="recebido">Recebido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <BankAccountSelect
            value={bankAccountId}
            onValueChange={setBankAccountId}
            label="Conta bancária"
            placeholder="Selecione a conta de entrada"
          />

          <div>
            <Label>Comprovante (opcional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            {!receiptPreview ? (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-1 h-16 border-dashed flex flex-col gap-0.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Anexar comprovante</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="relative mt-1 rounded-md border overflow-hidden">
                {receiptPreview === 'pdf' ? (
                  <div className="flex items-center gap-2 p-3 bg-muted/50">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate">PDF anexado</span>
                  </div>
                ) : (
                  <img src={receiptPreview} alt="Comprovante" className="w-full max-h-32 object-cover" />
                )}
                <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={removeReceipt}>
                  <X className="h-3 w-3" />
                </Button>
                {uploading && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalhes sobre esta receita"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={uploading}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
