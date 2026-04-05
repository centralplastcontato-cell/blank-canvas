import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ConnectableInstance {
  id: string;
  instance_id: string;
  instance_token: string;
  status: string | null;
  phone_number: string | null;
  unit: string | null;
}

const RETRY_DELAYS = [3000, 6000, 12000];
const TIMEOUTS = [12000, 18000, 25000];
const MAX_RETRIES = 3;

export function useWhatsAppConnection(onConnected?: () => void) {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrInstance, setQrInstance] = useState<ConnectableInstance | null>(null);
  const [qrPolling, setQrPolling] = useState(false);

  const [connectionMode, setConnectionMode] = useState<"qr" | "phone">("qr");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPairingLoading, setIsPairingLoading] = useState(false);

  // Resilience states
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isWapiUnstable, setIsWapiUnstable] = useState(false);
  const [connectionStage, setConnectionStage] = useState<"connecting" | "generating" | "retrying" | "failed" | "idle">("idle");

  const isFetchingQrRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollFailCountRef = useRef(0);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const fetchQrCode = useCallback(async (instance: ConnectableInstance, attempt = 0) => {
    if (isFetchingQrRef.current && attempt === 0) return;
    isFetchingQrRef.current = true;
    setQrLoading(true);
    setConnectionStage(attempt > 0 ? "retrying" : "connecting");
    setRetryCount(attempt);

    try {
      const timeout = TIMEOUTS[Math.min(attempt, TIMEOUTS.length - 1)];

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_CLIENT')), timeout)
      );

      const fetchPromise = supabase.functions.invoke("wapi-send", {
        body: {
          action: "get-qr",
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
        },
      });

      setConnectionStage("generating");
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (response.error) throw new Error(response.error.message);

      if (response.data?.errorType === 'TIMEOUT_OR_GATEWAY' ||
          response.data?.errorType === 'RESTARTING' ||
          response.data?.errorType === 'INSTANCE_ERROR') {
        throw new Error('WAPI_UNSTABLE');
      }

      if (response.data?.connected === true || response.data?.details?.connected === true) {
        toast({ title: "Já conectado!", description: "Esta instância já está conectada ao WhatsApp." });
        await supabase
          .from("wapi_instances")
          .update({ status: "connected", connected_at: new Date().toISOString() })
          .eq("id", instance.id);
        closeDialog();
        onConnected?.();
        isFetchingQrRef.current = false;
        return;
      }

      if (response.data?.qrCode) {
        setQrCode(response.data.qrCode);
        setIsWapiUnstable(false);
        setConnectionStage("idle");
        setRetryCount(0);
        pollFailCountRef.current = 0;
      } else if (response.data?.error) {
        const msg = response.data.error?.toLowerCase() || "";
        if (msg.includes("conectad") || msg.includes("connected")) {
          toast({ title: "Já conectado", description: "A instância já está conectada ao WhatsApp." });
          closeDialog();
          onConnected?.();
        } else {
          throw new Error('WAPI_UNSTABLE');
        }
      }
    } catch (error: any) {
      const isWapiError = error.message === 'TIMEOUT_CLIENT' || error.message === 'WAPI_UNSTABLE';

      if (isWapiError && attempt < MAX_RETRIES - 1) {
        setIsWapiUnstable(true);
        setIsRetrying(true);
        setConnectionStage("retrying");
        const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
        
        retryTimerRef.current = setTimeout(() => {
          setIsRetrying(false);
          fetchQrCode(instance, attempt + 1);
        }, delay);
        
        isFetchingQrRef.current = false;
        setQrLoading(false);
        return;
      }

      // All retries exhausted or non-WAPI error
      if (isWapiError) {
        setIsWapiUnstable(true);
        setConnectionStage("failed");
        toast({
          title: "⚠️ W-API instável",
          description: "Recomendamos conectar por Telefone — é mais confiável quando o servidor está lento.",
        });
      } else {
        setConnectionStage("failed");
        toast({ title: "Erro", description: error.message || "Erro ao obter QR Code.", variant: "destructive" });
      }
    } finally {
      isFetchingQrRef.current = false;
      setQrLoading(false);
    }
  }, [onConnected]);

  const pollConnectionStatus = useCallback(async (instance: ConnectableInstance) => {
    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "get-status",
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
        },
      });

      if (response.data?.status === "connected" || response.data?.connected === true) {
        const newPhone = response.data.phoneNumber || response.data.phone || null;
        await supabase
          .from("wapi_instances")
          .update({
            status: "connected",
            phone_number: newPhone,
            connected_at: new Date().toISOString(),
          })
          .eq("id", instance.id);

        setQrPolling(false);
        setQrDialogOpen(false);
        toast({
          title: "Conectado!",
          description: `WhatsApp da unidade ${instance.unit} conectado com sucesso!`,
        });
        onConnected?.();
        pollFailCountRef.current = 0;
        return true;
      }
      pollFailCountRef.current = 0;
    } catch (error) {
      console.error("Error polling status:", error);
      pollFailCountRef.current += 1;
    }
    return false;
  }, [onConnected]);

  const openDialog = (instance: ConnectableInstance) => {
    clearRetryTimer();
    setQrInstance(instance);
    setQrCode(null);
    setPairingCode(null);
    setPhoneNumber("");
    setConnectionMode("qr");
    setQrDialogOpen(true);
    setQrPolling(true);
    setRetryCount(0);
    setIsRetrying(false);
    setIsWapiUnstable(false);
    setConnectionStage("idle");
    pollFailCountRef.current = 0;
    fetchQrCode(instance, 0);
  };

  const closeDialog = () => {
    clearRetryTimer();
    setQrDialogOpen(false);
    setQrPolling(false);
    setQrCode(null);
    setPairingCode(null);
    setPhoneNumber("");
    setConnectionMode("qr");
    setRetryCount(0);
    setIsRetrying(false);
    setIsWapiUnstable(false);
    setConnectionStage("idle");
    pollFailCountRef.current = 0;
    isFetchingQrRef.current = false;
  };

  const requestPairingCode = async () => {
    if (!qrInstance || !phoneNumber) {
      toast({ title: "Erro", description: "Informe o número de telefone com DDD.", variant: "destructive" });
      return;
    }
    setIsPairingLoading(true);
    setPairingCode(null);
    try {
      const response = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "request-pairing-code",
          instanceId: qrInstance.instance_id,
          instanceToken: qrInstance.instance_token,
          phoneNumber,
        },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.pairingCode) {
        setPairingCode(response.data.pairingCode);
        toast({ title: "Código gerado!", description: "Use este código no seu WhatsApp para conectar." });
      } else if (response.data?.error) {
        toast({ title: "Erro", description: response.data.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao solicitar código.", variant: "destructive" });
    }
    setIsPairingLoading(false);
  };

  // Connection status polling — adaptive interval (3s normal, 5s on failures)
  const shouldPoll = qrDialogOpen && qrInstance && qrPolling && (connectionMode === "qr" || !!pairingCode);

  useEffect(() => {
    if (!shouldPoll || !qrInstance) return;
    const getInterval = () => pollFailCountRef.current >= 2 ? 5000 : 3000;

    const initialTimeout = setTimeout(async () => {
      await pollConnectionStatus(qrInstance);
    }, 2000);
    const interval = setInterval(async () => {
      const connected = await pollConnectionStatus(qrInstance);
      if (connected) clearInterval(interval);
    }, getInterval());
    return () => { clearTimeout(initialTimeout); clearInterval(interval); };
  }, [shouldPoll, qrInstance, pollConnectionStatus]);

  // QR code refresh (every 15s) — skip if fetch is in progress or retrying
  useEffect(() => {
    if (!qrDialogOpen || !qrInstance || !qrPolling || connectionMode !== "qr") return;
    if (connectionStage === "failed") return;

    const interval = setInterval(() => {
      if (!isFetchingQrRef.current && !isRetrying) {
        fetchQrCode(qrInstance, 0);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [qrDialogOpen, qrInstance, qrPolling, connectionMode, fetchQrCode, isRetrying, connectionStage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearRetryTimer();
  }, [clearRetryTimer]);

  return {
    qrDialogOpen,
    qrLoading,
    qrCode,
    qrInstance,
    connectionMode,
    phoneNumber,
    pairingCode,
    isPairingLoading,
    retryCount,
    isRetrying,
    isWapiUnstable,
    connectionStage,
    openDialog,
    closeDialog,
    setConnectionMode,
    setPhoneNumber,
    requestPairingCode,
    fetchQrCode,
  };
}
