import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankAccountSelect } from "./BankAccountSelect";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { type: string; amount: number; due_date: string; payment_method: string; notes?: string; bank_account_id?: string }) => void;
  defaultValues?: { type?: string; amount?: number; due_date?: string; payment_method?: string; notes?: string; bank_account_id?: string };
}

export function PaymentFormDialog({ open, onOpenChange, onSubmit, defaultValues }: Props) {
  const [type, setType] = useState(defaultValues?.type || "parcela");
  const [amount, setAmount] = useState(defaultValues?.amount?.toString() || "");
  const [dueDate, setDueDate] = useState(defaultValues?.due_date || "");
  const [method, setMethod] = useState(defaultValues?.payment_method || "pix");
  const [notes, setNotes] = useState(defaultValues?.notes || "");
  const [bankAccountId, setBankAccountId] = useState(defaultValues?.bank_account_id || "");

  const handleSubmit = () => {
    const val = parseFloat(amount);
    if (!val || !dueDate) return;
    onSubmit({
      type, amount: val, due_date: dueDate, payment_method: method,
      notes: notes.trim() || undefined,
      bank_account_id: bankAccountId || undefined,
    });
    onOpenChange(false);
    setAmount(""); setDueDate(""); setNotes(""); setBankAccountId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{defaultValues ? "Editar Parcela" : "Nova Parcela"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="parcela">Parcela</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <Label>Vencimento</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Anotações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre a parcela"
              rows={2}
            />
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
