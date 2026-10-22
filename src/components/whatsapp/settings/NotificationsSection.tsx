import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, BellRing, Check, Smartphone, Volume2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useChatNotificationToggle } from "@/hooks/useChatNotificationToggle";

// Som e avisos de novas mensagens. O liga/desliga é o MESMO do sininho da
// Central de Atendimento (antes esta tela salvava volume e "leads não
// respondidos" num lugar que nada lia). O alerta de cliente sem resposta que
// funciona é o da IA (Configurar a IA).

const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInstalledApp = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

function playTestBeep() {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  const ctx = new Ctor();
  [0, 0.18].forEach((start, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = i === 0 ? 880 : 1175;
    gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + 0.15);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + 0.16);
  });
}

export function NotificationsSection() {
  const { notificationsEnabled, toggleNotifications } = useChatNotificationToggle();
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : "denied");
  const needsInstall = isIos() && !isInstalledApp();

  useEffect(() => {
    if (supported) setPermission(Notification.permission);
  }, [supported]);

  const askPermission = async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    toast(result === "granted"
      ? { title: "Avisos ativados", description: "Você vai receber os avisos mesmo com o Celebrei em segundo plano." }
      : { title: "Avisos bloqueados", description: "Libere as notificações do Celebrei nas configurações do navegador.", variant: "destructive" });
  };

  return (
    <div className="space-y-4">
      {/* Som e avisos de novas mensagens (o mesmo sininho da Central) */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Volume2 className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">Som e avisos de novas mensagens</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Toca um som quando chega mensagem nova ou aviso (IA, visitas, dados recebidos). É o mesmo sininho da Central de Atendimento.
                </p>
              </div>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={() => void toggleNotifications()} aria-label="Som e avisos de novas mensagens" />
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={playTestBeep}>
            <BellRing className="w-4 h-4" />
            Testar som
          </Button>
          <p className="text-[11px] text-muted-foreground">
            O volume é o do seu celular ou computador. A preferência vale para este aparelho.
          </p>
        </CardContent>
      </Card>

      {/* Avisos com o Celebrei fechado / em segundo plano */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">Avisos no celular ou computador</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Recebe o aviso do sistema mesmo com o Celebrei minimizado ou em outra aba.
              </p>
            </div>
          </div>

          {needsInstall ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs sm:text-sm space-y-1">
              <p className="font-medium flex items-center gap-1.5"><Smartphone className="w-4 h-4" /> No iPhone, instale o Celebrei primeiro</p>
              <p className="text-muted-foreground">
                No Safari, toque em <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong>. Abra o Celebrei pelo ícone novo e volte aqui para ativar os avisos.
              </p>
            </div>
          ) : !supported ? (
            <p className="text-xs text-muted-foreground">Este navegador não aceita avisos do sistema.</p>
          ) : permission === "granted" ? (
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1.5"><Check className="w-4 h-4" /> Avisos ativados neste aparelho</p>
          ) : permission === "denied" ? (
            <p className="text-xs sm:text-sm text-muted-foreground">
              Os avisos estão bloqueados. Libere as notificações do Celebrei nas configurações do navegador (cadeado ao lado do endereço) e recarregue a página.
            </p>
          ) : (
            <Button size="sm" className="gap-2" onClick={askPermission}>
              <Bell className="w-4 h-4" />
              Ativar avisos
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
