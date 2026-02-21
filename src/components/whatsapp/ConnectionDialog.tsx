import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  QrCode, Loader2, Phone, Smartphone, RefreshCw, WifiOff,
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
  onClose: () => void;
  onSetConnectionMode: (mode: "qr" | "phone") => void;
  onSetPhoneNumber: (phone: string) => void;
  onRequestPairingCode: () => void;
  onRetryQr: () => void;
}

function PhoneInput({ 
  initialValue, 
  onPhoneChange, 
  onRequestPairingCode, 
  isPairingLoading, 
  pairingCode 
}: { 
  initialValue: string;
  onPhoneChange: (phone: string) => void;
  onRequestPairingCode: () => void;
  isPairingLoading: boolean;
  pairingCode: string | null;
}) {
  const [localPhone, setLocalPhone] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const onPhoneChangeRef = useRef(onPhoneChange);
  onPhoneChangeRef.current = onPhoneChange;

  // Sync local → parent via ref (no re-render loop)
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, "");
    setLocalPhone(cleaned);
    onPhoneChangeRef.current(cleaned);
  }, []);

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
          <Input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            placeholder="11999999999"
            value={localPhone}
            onChange={handleChange}
            className="flex-1 text-base min-w-0"
            maxLength={11}
          />
        </div>
        <Button
          onClick={onRequestPairingCode}
          disabled={isPairingLoading || localPhone.length < 10}
          className="w-full"
        >
          {isPairingLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Solicitando código...
            </>
          ) : (
            <>
              <Phone className="w-4 h-4 mr-2" />
              Solicitar código
            </>
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
}

export function ConnectionDialog({
  open,
  onOpenChange,
  instance,
  qrCode,
  qrLoading,
  connectionMode,
  phoneNumber,
  pairingCode,
  isPairingLoading,
  onClose,
  onSetConnectionMode,
  onSetPhoneNumber,
  onRequestPairingCode,
  onRetryQr,
}: ConnectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Conectar WhatsApp — {instance?.unit}
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
          <div className="flex flex-col items-center justify-center py-4">
            {qrLoading && !qrCode ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
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
          <PhoneInput
            initialValue={phoneNumber}
            onPhoneChange={onSetPhoneNumber}
            onRequestPairingCode={onRequestPairingCode}
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
