import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Upload, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BankAccountSelect } from './BankAccountSelect';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string;
  expenseDescription: string;
  onConfirm: (id: string, data: { status: string; receipt_url?: string; bank_account_id?: string }) => void;
}

export function MarkExpensePaidDialog({ open, onOpenChange, expenseId, expenseDescription, onConfirm }: Props) {
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [bankAccountId, setBankAccountId] = useState<string>('');

  const handleFile = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${expenseId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('expense-receipts').upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('expense-receipts').getPublicUrl(path);
    setReceiptUrl(urlData.publicUrl);
    setPreview(URL.createObjectURL(file));
    setUploading(false);
  };

  const handleConfirm = () => {
    const data: { status: string; receipt_url?: string; bank_account_id?: string } = { status: 'pago' };
    if (receiptUrl) data.receipt_url = receiptUrl;
    if (bankAccountId) data.bank_account_id = bankAccountId;
    onConfirm(expenseId, data);
    handleClose();
  };

  const handleClose = () => {
    setReceiptUrl(null);
    setPreview(null);
    setBankAccountId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-500" />
            Marcar como Pago
          </DialogTitle>
          <DialogDescription className="truncate">{expenseDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Comprovante (opcional)</label>
            {preview ? (
              <div className="relative rounded-lg border border-border overflow-hidden">
                <img src={preview} alt="Comprovante" className="w-full max-h-48 object-contain bg-muted" />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-1 right-1 h-7 w-7 p-0 bg-background/80 hover:bg-background"
                  onClick={() => { setPreview(null); setReceiptUrl(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-muted-foreground hover:border-primary/40 hover:bg-accent/30 transition-all"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-6 w-6" />
                    <span className="text-xs">Toque para anexar foto ou arquivo</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
          </div>

          <BankAccountSelect
            value={bankAccountId || null}
            onValueChange={setBankAccountId}
            label="De qual conta saiu?"
          />

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>Cancelar</Button>
            <Button className="flex-1 gap-1.5" onClick={handleConfirm} disabled={uploading}>
              <Check className="h-4 w-4" /> Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
