import { useState, useRef, useCallback, memo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  QrCode, Loader2, Phone, Smartphone, RefreshCw, WifiOff, AlertTriangle,
} from "lucide-react";
import type { ConnectableInstance } from "@/hooks/useWhatsAppConnection";

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instance: ConnectableInstance | null;
  qrCode: string | null;
  qrLoading: boolean;
  connectionMode: "qr" | "phone";
  phoneNumber: string;
  pairingCode: string | null;
  isPairingLoading: boolean;
  retryCount: number;
  isRetrying: boolean;
  isWapiUnstable: boolean;
  connectionStage: "connecting" | "generating" | "retrying" | "failed" | "idle";
  onClose: () => void;
  onSetConnectionMode: (mode: "qr" | "phone") => void;
  onSetPhoneNumber: (phone: string) => void;
  onRequestPairingCode: () => void;
  onRetryQr: () => void;
}

function ConnectionProgress({ stage, retryCount, isRetrying }: { stage: string; retryCount: number; isRetrying: boolean }) {
  const progressMap: Record<string, number> = {
    connecting: 25,
    generating: 60,
    retrying: 40 + retryCount * 15,
    idle: 100,
    failed: 100,
  };

  const labelMap: Record<string, string> = {
    connecting: "Conectando ao servidor...",
    generating: "Gerando QR Code...",
    retrying: isRetrying
      ? `Aguardando para tentar novamente (${retryCount + 1}/3)...`
      : `Tentativa ${retryCount + 2} de 3...`,
    idle: "",
    failed: "",
  };

  if (stage === "idle" || stage === "failed") return null;

  return (
    <div className="space-y-2 px-1">
      <Progress value={progressMap[stage] || 0} className="h-2" />
      <p className="text-xs text-muted-foreground text-center animate-pulse">{labelMap[stage]}</p>
    </div>
  );
}

function FailedState({ onRetryQr, onSwitchToPhone }: { onRetryQr: () => void; onSwitchToPhone: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
        <WifiOff className="w-7 h-7 text-destructive" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">Não foi possível gerar o QR Code</p>
        <p className="text-xs text-muted-foreground">O servidor W-API está instável no momento.</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button onClick={onSwitchToPhone} className="w-full">
          <Phone className="w-4 h-4 mr-2" />
          Conectar por Telefone
        </Button>
        <Button variant="outline" onClick={onRetryQr} className="w-full">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar QR novamente
        </Button>
      </div>
    </div>
  );
}

// Elapsed time counter
function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`}
    </span>
  );
}

const PhoneSection = memo(function PhoneSection({
  onSubmitPhone,
  isPairingLoading,
  pairingCode,
}: {
  onSubmitPhone: (phone: string) => void;
  isPairingLoading: boolean;
  pairingCode: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  const handleInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const cleaned = el.value.replace(/\D/g, "").slice(0, 11);
    if (cleaned !== el.value) el.value = cleaned;
    setCanSubmit(cleaned.length >= 10);
  }, []);

  const handleSubmit = useCallback(() => {
    const phone = inputRef.current?.value.replace(/\D/g, "") || "";
    if (phone.length >= 10) onSubmitPhone(phone);
  }, [onSubmitPhone]);

  return (
    <div className="flex flex-col gap-4 py-4">
      <p className="text-sm text-muted-foreground text-center">
        Informe o número que deseja conectar (o mesmo presente no seu WhatsApp)
      </p>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-input shrink-0">
            <span className="text-lg">🇧🇷</span>
            <span className="text-sm font-medium">+55</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="11999999999"
            maxLength={11}
            onInput={handleInput}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex-1 min-w-0"
          />
        </div>
        <Button onClick={handleSubmit} disabled={isPairingLoading || !canSubmit} className="w-full">
          {isPairingLoading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Solicitando código...</>
          ) : (
            <><Phone className="w-4 h-4 mr-2" />Solicitar código</>
          )}
        </Button>
      </div>

      {pairingCode && (
        <div className="mt-4 p-4 bg-primary/10 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">Código de pareamento:</p>
          <p className="text-3xl font-bold tracking-widest text-primary font-mono">{pairingCode}</p>
          <p className="text-xs text-muted-foreground mt-3">
            No seu WhatsApp: Configurações → Aparelhos conectados → Conectar aparelho → Conectar com número de telefone
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Aguardando conexão...</span>
          </div>
        </div>
      )}
    </div>
  );
});

export function ConnectionDialog({
  open,
  onOpenChange,
  instance,
  qrCode,
  qrLoading,
  connectionMode,
  phoneNumber: _phoneNumber,
  pairingCode,
  isPairingLoading,
  retryCount = 0,
  isRetrying = false,
  isWapiUnstable = false,
  connectionStage = "idle",
  onClose,
  onSetConnectionMode,
  onSetPhoneNumber,
  onRequestPairingCode,
  onRetryQr,
}: ConnectionDialogProps) {
  const isLoadingQr = (qrLoading || connectionStage === "connecting" || connectionStage === "generating" || connectionStage === "retrying") && !qrCode;
  const isFailed = connectionStage === "failed" && !qrCode;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Conectar WhatsApp — {instance?.unit}
            {isWapiUnstable && (
              <Badge variant="outline" className="ml-auto border-yellow-500 text-yellow-600 text-xs gap-1">
                <AlertTriangle className="w-3 h-3" />
                Instável
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja conectar o WhatsApp desta instância
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={connectionMode === "qr" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => {
              onSetConnectionMode("qr");
              if (instance && !qrCode) onRetryQr();
            }}
          >
            <QrCode className="w-4 h-4 mr-2" />
            QR Code
          </Button>
          <Button
            variant={connectionMode === "phone" ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => onSetConnectionMode("phone")}
          >
            <Phone className="w-4 h-4 mr-2" />
            Telefone
          </Button>
        </div>

        {connectionMode === "qr" ? (
          <div className="flex flex-col items-center justify-center py-4 gap-3">
            {isFailed ? (
              <FailedState
                onRetryQr={onRetryQr}
                onSwitchToPhone={() => onSetConnectionMode("phone")}
              />
            ) : isLoadingQr ? (
              <div className="flex flex-col items-center gap-4 py-6 w-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <ConnectionProgress stage={connectionStage} retryCount={retryCount} isRetrying={isRetrying} />
                <ElapsedTimer />
                {/* Show phone fallback early during loading */}
                {(retryCount > 0 || isWapiUnstable) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => onSetConnectionMode("phone")}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Tentar por Telefone
                  </Button>
                )}
              </div>
            ) : qrCode ? (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <img
                    src={qrCode.startsWith("data:image") ? qrCode : qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className={`w-4 h-4 ${qrLoading ? "animate-spin" : ""}`} />
                  <span>Aguardando conexão...</span>
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Abra o WhatsApp no celular, vá em Configurações → Aparelhos conectados → Conectar aparelho
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <WifiOff className="w-12 h-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Não foi possível gerar o QR Code</p>
                <Button variant="outline" onClick={onRetryQr}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            )}
          </div>
        ) : (
          <PhoneSection
            onSubmitPhone={(phone) => {
              onSetPhoneNumber(phone);
              setTimeout(onRequestPairingCode, 50);
            }}
            isPairingLoading={isPairingLoading}
            pairingCode={pairingCode}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
