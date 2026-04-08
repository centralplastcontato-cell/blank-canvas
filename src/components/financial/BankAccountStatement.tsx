import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUpCircle, ArrowDownCircle, Loader2, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/currency-input';
import { EventFinancialTab } from './EventFinancialTab';
import type { BankAccountBalance } from '@/hooks/useBankAccounts';

interface Props {
  account: BankAccountBalance;
  onBalanceChanged?: () => void;
}

interface Movement {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'entry' | 'exit';
  source: string;
  eventId?: string;
  eventTitle?: string;
  eventDate?: string;
  expenseId?: string;
  expenseCategory?: string;
  expenseNotes?: string;
  expenseReceiptUrl?: string;
  expenseBoletoUrl?: string;
  expenseUnit?: string;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function BankAccountStatement({ account, onBalanceChanged }: Props) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState('');

  // Balance before the filtered window (for running balance)
  const [balanceBefore, setBalanceBefore] = useState(account.initial_balance);

  // Adjust balance dialog
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<'entry' | 'exit'>('entry');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [adjustAuthor, setAdjustAuthor] = useState('');
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<{ id: string; title: string } | null>(null);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [eventClientData, setEventClientData] = useState<any>(null);

  // Expense detail sheet
  const [selectedExpense, setSelectedExpense] = useState<Movement | null>(null);

  const fetchMovements = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build queries with date filters pushed to the server
      let entriesQuery = supabase
        .from('event_payments')
        .select('id, amount, paid_at, type, notes, event_id, company_events(id, title, event_date, total_value)')
        .eq('bank_account_id', account.id)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false });

      let exitsQuery = supabase
        .from('company_expenses')
        .select('id, amount, expense_date, description, category, notes, receipt_url, boleto_url, unit, expense_type')
        .eq('bank_account_id', account.id)
        .eq('status', 'pago')
        .order('expense_date', { ascending: false });

      if (dateFrom) {
        entriesQuery = entriesQuery.gte('paid_at', dateFrom);
        exitsQuery = exitsQuery.gte('expense_date', dateFrom);
      }
      if (dateTo) {
        entriesQuery = entriesQuery.lte('paid_at', dateTo);
        exitsQuery = exitsQuery.lte('expense_date', dateTo);
      }

      // Also fetch aggregates for everything BEFORE dateFrom to compute running balance
      let preEntriesQuery = supabase
        .from('event_payments')
        .select('amount')
        .eq('bank_account_id', account.id)
        .eq('status', 'paid');
      let preExitsQuery = supabase
        .from('company_expenses')
        .select('amount')
        .eq('bank_account_id', account.id)
        .eq('status', 'pago');

      if (dateFrom) {
        preEntriesQuery = preEntriesQuery.lt('paid_at', dateFrom);
        preExitsQuery = preExitsQuery.lt('expense_date', dateFrom);
      }

      const [entriesRes, exitsRes, preEntriesRes, preExitsRes] = await Promise.all([
        entriesQuery,
        exitsQuery,
        dateFrom ? preEntriesQuery : Promise.resolve({ data: [] }),
        dateFrom ? preExitsQuery : Promise.resolve({ data: [] }),
      ]);

      // Pre-period balance
      const preEntries = (preEntriesRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
      const preExits = (preExitsRes.data || []).reduce((s: number, e: any) => {
        const amt = Number(e.amount);
        return amt < 0 ? s - Math.abs(amt) : s + amt; // negative = transfer credit
      }, 0);
      setBalanceBefore(account.initial_balance + preEntries - preExits);

      const entries: Movement[] = (entriesRes.data || []).map((p: any) => {
        const evt = p.company_events;
        return {
          id: p.id,
          date: p.paid_at?.split('T')[0] || '',
          description: `${p.type === 'entrada' ? 'Entrada' : 'Parcela'}${p.notes ? ' — ' + p.notes : ''}`,
          amount: Number(p.amount),
          type: 'entry' as const,
          source: 'Recebimento',
          eventId: evt?.id || p.event_id,
          eventTitle: evt?.title || undefined,
          eventDate: evt?.event_date || undefined,
        };
      });

      const exits: Movement[] = (exitsRes.data || []).map((e: any) => {
        const amt = Number(e.amount);
        const expenseExtra = {
          expenseId: e.id,
          expenseCategory: e.category,
          expenseNotes: e.notes || undefined,
          expenseReceiptUrl: e.receipt_url || undefined,
          expenseBoletoUrl: e.boleto_url || undefined,
          expenseUnit: e.unit || undefined,
        };
        if (amt < 0) {
          return {
            id: e.id,
            date: e.expense_date,
            description: e.description,
            amount: Math.abs(amt),
            type: 'entry' as const,
            source: e.category || 'Transferência',
            ...expenseExtra,
          };
        }
        return {
          id: e.id,
          date: e.expense_date,
          description: e.description,
          amount: amt,
          type: 'exit' as const,
          source: e.category || 'Despesa',
          ...expenseExtra,
        };
      });

      setMovements([...entries, ...exits].sort((a, b) => b.date.localeCompare(a.date)));
    } finally {
      setIsLoading(false);
    }
  }, [account.id, account.initial_balance, dateFrom, dateTo]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  // Fetch event details + client data when event sheet opens
  useEffect(() => {
    if (!selectedEvent) {
      setEventDetails(null);
      setEventClientData(null);
      return;
    }
    (async () => {
      const [evtRes, cdrRes] = await Promise.all([
        supabase.from('company_events').select('*').eq('id', selectedEvent.id).single(),
        supabase.from('client_data_requests').select('client_data').eq('event_id', selectedEvent.id).eq('status', 'completed').maybeSingle(),
      ]);
      setEventDetails(evtRes.data || null);
      setEventClientData(cdrRes.data?.client_data || null);
    })();
  }, [selectedEvent]);

  // Live totals from filtered movements
  const liveTotals = useMemo(() => {
    const totalEntries = movements.filter(m => m.type === 'entry').reduce((s, m) => s + m.amount, 0);
    const totalExits = movements.filter(m => m.type === 'exit').reduce((s, m) => s + m.amount, 0);
    const currentBalance = balanceBefore + totalEntries - totalExits;
    return { totalEntries, totalExits, currentBalance };
  }, [movements, balanceBefore]);

  // Running balance
  const movementsWithBalance = useMemo(() => {
    const sorted = [...movements].sort((a, b) => a.date.localeCompare(b.date));
    let balance = balanceBefore;
    return sorted.map(m => {
      if (m.type === 'entry') balance += m.amount;
      else balance -= m.amount;
      return { ...m, balance };
    }).reverse();
  }, [movements, balanceBefore]);

  // Handle balance adjustment
  const handleAdjust = async () => {
    const amount = parseCurrencyInput(adjustAmount);
    if (!amount || amount <= 0) { toast.error('Informe um valor válido'); return; }
    if (!adjustDescription.trim()) { toast.error('Informe uma descrição'); return; }
    if (!adjustAuthor.trim()) { toast.error('Informe o nome de quem está fazendo o ajuste'); return; }

    setAdjustSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const expenseAmount = adjustType === 'exit' ? amount : -amount; // negative = credit entry

      const { error } = await supabase.from('company_expenses').insert({
        company_id: account.company_id,
        bank_account_id: account.id,
        amount: expenseAmount,
        expense_date: today,
        description: adjustDescription.trim(),
        category: 'ajuste',
        expense_type: 'fixa',
        status: 'pago',
        notes: `Ajuste por: ${adjustAuthor.trim()}`,
      });

      if (error) throw error;
      toast.success('Ajuste de saldo realizado');
      setAdjustOpen(false);
      setAdjustAmount('');
      setAdjustDescription('');
      setAdjustAuthor('');
      fetchMovements();
      onBalanceChanged?.();
    } catch (err: any) {
      toast.error('Erro ao salvar ajuste: ' + err.message);
    } finally {
      setAdjustSaving(false);
    }
  };

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
          <p className="text-sm font-bold text-emerald-500">+{fmt(liveTotals.totalEntries)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] text-red-400 uppercase">Saídas</p>
          <p className="text-sm font-bold text-red-400">-{fmt(liveTotals.totalExits)}</p>
        </Card>
      </div>

      {/* Current balance */}
      <Card className={`p-4 text-center ${liveTotals.currentBalance >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
        <p className="text-xs text-muted-foreground">Saldo Atual</p>
        <p className={`text-2xl font-bold ${liveTotals.currentBalance >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
          {fmt(liveTotals.currentBalance)}
        </p>
      </Card>

      {/* Adjust balance button */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => setAdjustOpen(true)}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Ajustar Saldo
      </Button>

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
            <div
              key={m.id}
              className={`flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card ${(m.eventId || m.expenseId) ? 'cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-colors' : ''}`}
              onClick={() => {
                if (m.eventId) {
                  setSelectedEvent({ id: m.eventId, title: m.eventTitle || 'Festa' });
                } else if (m.expenseId) {
                  setSelectedExpense(m);
                }
              }}
            >
              {m.type === 'entry' ? (
                <ArrowUpCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <ArrowDownCircle className="h-5 w-5 text-red-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {m.eventTitle && (
                  <p className="text-xs font-semibold text-primary truncate mb-0.5">🎉 {m.eventTitle}</p>
                )}
                <p className="text-sm font-medium text-foreground truncate">{m.description}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {m.date ? format(new Date(m.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                  </span>
                  <Badge variant="secondary" className="text-[9px] h-4">{m.source}</Badge>
                  {m.eventId && (
                    <Badge variant="outline" className="text-[9px] h-4 text-primary border-primary/30">Ver festa</Badge>
                  )}
                  {!m.eventId && m.expenseId && (
                    <Badge variant="outline" className="text-[9px] h-4 text-muted-foreground border-border">Detalhes</Badge>
                  )}
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

      {/* Adjust balance dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar Saldo</DialogTitle>
          </DialogHeader>

          {/* Balance preview card */}
          {(() => {
            const parsed = parseCurrencyInput(adjustAmount);
            const delta = adjustType === 'entry' ? parsed : -parsed;
            const projected = liveTotals.currentBalance + delta;
            return (
              <Card className="p-3 bg-muted/30 border-dashed">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Saldo atual</span>
                  <span className={`font-semibold ${liveTotals.currentBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {fmt(liveTotals.currentBalance)}
                  </span>
                </div>
                {parsed > 0 && (
                  <>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Ajuste</span>
                      <span className={adjustType === 'entry' ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                        {adjustType === 'entry' ? '+' : '-'}{fmt(parsed)}
                      </span>
                    </div>
                    <div className="border-t border-border my-2" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">Saldo projetado</span>
                      <span className={`font-bold text-base ${projected >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmt(projected)}
                      </span>
                    </div>
                  </>
                )}
              </Card>
            );
          })()}

          <div className="space-y-3">
            <div>
              <Label>Tipo de ajuste</Label>
              <Select value={adjustType} onValueChange={v => setAdjustType(v as 'entry' | 'exit')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">➕ Crédito (aumentar saldo)</SelectItem>
                  <SelectItem value="exit">➖ Débito (diminuir saldo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  className="pl-10"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(formatCurrencyInput(e.target.value))}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input
                value={adjustDescription}
                onChange={e => setAdjustDescription(e.target.value)}
                placeholder="Ex: Ajuste de saldo inicial, correção, depósito não rastreado..."
              />
            </div>
            <div>
              <Label>Responsável pelo ajuste *</Label>
              <Input
                value={adjustAuthor}
                onChange={e => setAdjustAuthor(e.target.value)}
                placeholder="Nome de quem está fazendo o ajuste"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdjust} disabled={adjustSaving || !adjustDescription.trim() || !adjustAuthor.trim() || !adjustAmount}>
              {adjustSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event financial sheet */}
      <Sheet open={!!selectedEvent} onOpenChange={open => { if (!open) setSelectedEvent(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>🎉 {selectedEvent?.title}</SheetTitle>
          </SheetHeader>
          {selectedEvent && (
            <div className="mt-4 space-y-4">
              {/* Event info card */}
              {eventDetails && (
                <Card className="p-4 space-y-2.5 border-primary/20 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">📅 Data da Festa</span>
                    <span className="text-sm font-semibold">
                      {eventDetails.event_date ? format(new Date(eventDetails.event_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                      {eventDetails.start_time ? ` às ${eventDetails.start_time.slice(0, 5)}` : ''}
                    </span>
                  </div>
                  {eventDetails.data_fechamento_venda && (
                    <>
                      <div className="border-t border-border/50" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">🤝 Fechamento</span>
                        <span className="text-sm font-medium">
                          {format(new Date(eventDetails.data_fechamento_venda + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </>
                  )}
                  {eventDetails.package_name && (
                    <>
                      <div className="border-t border-border/50" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">📦 Pacote</span>
                        <span className="text-sm font-medium">{eventDetails.package_name}</span>
                      </div>
                    </>
                  )}
                  {eventDetails.guest_count && (
                    <>
                      <div className="border-t border-border/50" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">👥 Convidados</span>
                        <span className="text-sm font-medium">{eventDetails.guest_count} pessoas</span>
                      </div>
                    </>
                  )}
                  {eventDetails.unit && (
                    <>
                      <div className="border-t border-border/50" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">📍 Unidade</span>
                        <span className="text-sm font-medium">{eventDetails.unit}</span>
                      </div>
                    </>
                  )}
                  {/* Birthday children */}
                  {(() => {
                    const children = eventDetails.birthday_children as any[] | null;
                    if (children && children.length > 0) {
                      return (
                        <>
                          <div className="border-t border-border/50" />
                          <div>
                            <span className="text-xs text-muted-foreground">🎂 Aniversariante(s)</span>
                            <div className="mt-1 space-y-0.5">
                              {children.map((c: any, i: number) => (
                                <p key={i} className="text-sm font-medium">
                                  {c.name}{c.age ? ` — ${c.age}` : ''}
                                </p>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    }
                    if (eventDetails.child_name) {
                      return (
                        <>
                          <div className="border-t border-border/50" />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">🎂 Aniversariante</span>
                            <span className="text-sm font-medium">
                              {eventDetails.child_name}{eventDetails.child_age ? ` — ${eventDetails.child_age}` : ''}
                            </span>
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                  {/* Client data - responsáveis */}
                  {eventClientData && (
                    <>
                      <div className="border-t border-border/50" />
                      <div>
                        <span className="text-xs text-muted-foreground">👤 Responsável</span>
                        <p className="text-sm font-medium mt-0.5">
                          {eventClientData.nome_completo || eventClientData.name || '—'}
                        </p>
                        {eventClientData.telefone && (
                          <p className="text-xs text-muted-foreground">{eventClientData.telefone}</p>
                        )}
                        {eventClientData.cpf && (
                          <p className="text-xs text-muted-foreground">CPF: {eventClientData.cpf}</p>
                        )}
                      </div>
                      {eventClientData.responsaveis_adicionais?.length > 0 && (
                        <>
                          <div className="border-t border-border/50" />
                          <div>
                            <span className="text-xs text-muted-foreground">👥 Responsáveis adicionais</span>
                            {eventClientData.responsaveis_adicionais.map((r: any, i: number) => (
                              <p key={i} className="text-sm mt-0.5">
                                {r.nome}{r.parentesco ? ` (${r.parentesco})` : ''}{r.telefone ? ` — ${r.telefone}` : ''}
                              </p>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                  {eventDetails.parent_names && !eventClientData && (() => {
                    let parsed: any[] | null = null;
                    try { parsed = JSON.parse(eventDetails.parent_names); } catch {}
                    if (Array.isArray(parsed)) {
                      const valid = parsed.filter((r: any) => r.name?.trim());
                      if (valid.length === 0) return null;
                      return (
                        <>
                          <div className="border-t border-border/50" />
                          <div>
                            <span className="text-xs text-muted-foreground">👤 Responsável</span>
                            {valid.map((r: any, i: number) => (
                              <p key={i} className="text-sm font-medium mt-0.5">
                                {r.name}{r.relation ? ` (${r.relation})` : ''}{r.phone ? ` — ${r.phone}` : ''}
                              </p>
                            ))}
                          </div>
                        </>
                      );
                    }
                    return (
                      <>
                        <div className="border-t border-border/50" />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">👤 Responsável</span>
                          <span className="text-sm font-medium">{eventDetails.parent_names}</span>
                        </div>
                      </>
                    );
                  })()}
                </Card>
              )}

              <EventFinancialTab
                eventId={selectedEvent.id}
                companyId={account.company_id}
                baseValue={eventDetails?.total_value || 0}
                canEdit={false}
                canPay={false}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Expense detail sheet */}
      <Sheet open={!!selectedExpense} onOpenChange={open => { if (!open) setSelectedExpense(null); }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedExpense?.type === 'exit' ? (
                <ArrowDownCircle className="h-5 w-5 text-red-400" />
              ) : (
                <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
              )}
              Detalhes da Movimentação
            </SheetTitle>
          </SheetHeader>
          {selectedExpense && (
            <div className="mt-4 space-y-4">
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Descrição</span>
                  <span className="text-sm font-medium text-foreground text-right max-w-[60%] truncate">{selectedExpense.description}</span>
                </div>
                <div className="border-t border-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <span className={`text-lg font-bold ${selectedExpense.type === 'exit' ? 'text-red-400' : 'text-emerald-500'}`}>
                    {selectedExpense.type === 'exit' ? '-' : '+'}{fmt(selectedExpense.amount)}
                  </span>
                </div>
                <div className="border-t border-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Data</span>
                  <span className="text-sm font-medium">
                    {selectedExpense.date ? format(new Date(selectedExpense.date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                  </span>
                </div>
                <div className="border-t border-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Categoria</span>
                  <Badge variant="secondary">{selectedExpense.expenseCategory || selectedExpense.source}</Badge>
                </div>
                {selectedExpense.expenseUnit && (
                  <>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Unidade</span>
                      <span className="text-sm font-medium">{selectedExpense.expenseUnit}</span>
                    </div>
                  </>
                )}
                {selectedExpense.expenseNotes && (
                  <>
                    <div className="border-t border-border" />
                    <div>
                      <span className="text-sm text-muted-foreground">Observações</span>
                      <p className="text-sm mt-1 text-foreground bg-muted/30 p-2 rounded-lg">{selectedExpense.expenseNotes}</p>
                    </div>
                  </>
                )}
              </Card>

              {(selectedExpense.expenseReceiptUrl || selectedExpense.expenseBoletoUrl) && (
                <Card className="p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Anexos</p>
                  {selectedExpense.expenseBoletoUrl && (
                    <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                      <a href={selectedExpense.expenseBoletoUrl} target="_blank" rel="noopener noreferrer">
                        📄 Ver Boleto
                      </a>
                    </Button>
                  )}
                  {selectedExpense.expenseReceiptUrl && (
                    <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                      <a href={selectedExpense.expenseReceiptUrl} target="_blank" rel="noopener noreferrer">
                        🧾 Ver Comprovante
                      </a>
                    </Button>
                  )}
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
