import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface SendVisitConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: {
    id: string;
    lead_id: string;
    lead_name?: string | null;
    lead_phone?: string | null;
    data_visita: string;
    horario_visita: string | null;
    company_id: string;
  } | null;
  onSent?: () => void;
}

function interpolate(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"), v);
  }
  return out;
}

function resolveDiaVisita(visitDate: string): string {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");
  if (visitDate === todayStr) return "hoje";
  if (visitDate === tomorrowStr) return "amanhã";
  const [y, m, d] = visitDate.split("-");
  return `${d}/${m}/${y}`;
}

const DEFAULT_TEMPLATE =
  "Olá {{nome}}! 👋 Passando para confirmar sua visita {{dia_visita}} às {{hora_visita}} no {{nome_buffet}}. Posso confirmar sua presença?";

export function SendVisitConfirmationDialog({ open, onOpenChange, visit, onSent }: SendVisitConfirmationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    if (!open || !visit) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [{ data: settings }, { data: company }] = await Promise.all([
        (supabase as any)
          .from("visit_confirmation_settings")
          .select("confirmation_message")
          .eq("company_id", visit.company_id)
          .maybeSingle(),
        supabase.from("companies").select("name").eq("id", visit.company_id).single(),
      ]);
      if (cancelled) return;
      const cName = company?.name || "nosso buffet";
      setCompanyName(cName);
      const template = settings?.confirmation_message || DEFAULT_TEMPLATE;
      const firstName = (visit.lead_name || "cliente").trim().split(" ")[0] || "cliente";
      const [y, m, d] = visit.data_visita.split("-");
      const interpolated = interpolate(template, {
        nome: firstName,
        data_visita: `${d}/${m}/${y}`,
        hora_visita: visit.horario_visita || "horário a confirmar",
        nome_buffet: cName,
        dia_visita: resolveDiaVisita(visit.data_visita),
      });
      setMessage(interpolated);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, visit]);

  const handleSend = async () => {
    if (!visit || !message.trim()) return;
    setSending(true);
    try {
      // 1) Find conversation for this lead
      const { data: conv } = await (supabase as any)
        .from("wapi_conversations")
        .select("id, remote_jid, instance_id")
        .eq("lead_id", visit.lead_id)
        .not("remote_jid", "like", "%@g.us%")
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!conv) {
        toast({
          title: "Conversa não encontrada",
          description: "Este lead ainda não possui conversa no WhatsApp. Inicie pelo módulo Atendimento.",
          variant: "destructive",
        });
        setSending(false);
        return;
      }

      // 2) Get instance details
      const { data: instance } = await (supabase as any)
        .from("wapi_instances")
        .select("instance_id, status")
        .eq("id", conv.instance_id)
        .maybeSingle();

      if (!instance) {
        toast({ title: "Instância não encontrada", variant: "destructive" });
        setSending(false);
        return;
      }
      if (instance.status !== "connected") {
        toast({
          title: "Instância desconectada",
          description: "Conecte o WhatsApp da unidade antes de enviar.",
          variant: "destructive",
        });
        setSending(false);
        return;
      }

      const phone = conv.remote_jid.replace("@s.whatsapp.net", "").replace("@c.us", "");

      // 3) Send via wapi-send
      const { data: sendData, error: sendErr } = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "send-text",
          instance_id: instance.instance_id,
          phone,
          message,
          conversation_id: conv.id,
          metadata: { source: "visit_confirmation", type: "manual", visit_id: visit.id },
        },
      });

      if (sendErr || (sendData && sendData.error)) {
        const errMsg = sendErr?.message || sendData?.error || "erro desconhecido";
        toast({ title: "Falha ao enviar", description: errMsg, variant: "destructive" });
        setSending(false);
        return;
      }

      // 4) Record in history
      await (supabase as any).from("visit_confirmation_history").insert({
        visit_id: visit.id,
        company_id: visit.company_id,
        message_type: "manual",
        sent_at: new Date().toISOString(),
        status: "sent",
      });

      toast({
        title: "✅ Confirmação enviada!",
        description: `Mensagem enviada para ${visit.lead_name || "o cliente"}.`,
      });
      onSent?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro inesperado", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (!visit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            Enviar confirmação de visita
          </DialogTitle>
          <DialogDescription>
            Envia a mensagem manualmente via WhatsApp para <strong>{visit.lead_name || "o cliente"}</strong>
            {visit.horario_visita && ` (visita às ${visit.horario_visita})`}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
              <p>
                <strong>Data:</strong>{" "}
                {format(parseISO(visit.data_visita + "T12:00:00"), "dd/MM/yyyy")}
                {visit.horario_visita && ` às ${visit.horario_visita}`}
              </p>
              <p>
                <strong>Buffet:</strong> {companyName}
              </p>
            </div>
            <div>
              <Label htmlFor="confirmation-message" className="text-xs">
                Mensagem (você pode editar antes de enviar)
              </Label>
              <Textarea
                id="confirmation-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="mt-1 bg-white text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading || sending || !message.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Enviando..." : "Enviar agora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
