import { useState, useEffect, useCallback } from "react";
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

  const fetchQrCode = useCallback(async (instance: ConnectableInstance) => {
    setQrLoading(true);
    try {
      // Client-side timeout protection (12s)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_CLIENT')), 12000)
      );

      const fetchPromise = supabase.functions.invoke("wapi-send", {
        body: {
          action: "get-qr",
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
        },
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (response.error) throw new Error(response.error.message);

      // Handle TIMEOUT_OR_GATEWAY from edge function
      if (response.data?.errorType === 'TIMEOUT_OR_GATEWAY') {
        toast({ title: "⚠️ W-API instável", description: "Tente novamente ou conecte por Telefone." });
        return;
      }

      // Handle RESTARTING — instance was auto-restarted
      if (response.data?.errorType === 'RESTARTING' || response.data?.errorType === 'INSTANCE_ERROR') {
        toast({ title: "🔄 Reiniciando instância", description: "Aguarde alguns segundos e tente novamente." });
        return;
      }

      if (response.data?.connected === true || response.data?.details?.connected === true) {
        toast({ title: "Já conectado!", description: "Esta instância já está conectada ao WhatsApp." });
        await supabase
          .from("wapi_instances")
          .update({ status: "connected", connected_at: new Date().toISOString() })
          .eq("id", instance.id);
        closeDialog();
        onConnected?.();
        return;
      }

      if (response.data?.qrCode) {
        setQrCode(response.data.qrCode);
      } else if (response.data?.error) {
        const msg = response.data.error?.toLowerCase() || "";
        if (msg.includes("conectad") || msg.includes("connected")) {
          toast({ title: "Já conectado", description: "A instância já está conectada ao WhatsApp." });
          closeDialog();
          onConnected?.();
        } else {
          toast({ title: "Aviso", description: response.data.error, variant: "destructive" });
        }
      }
    } catch (error: any) {
      console.error("Error fetching QR code:", error);
      if (error.message === 'TIMEOUT_CLIENT') {
        toast({ title: "⚠️ W-API instável", description: "QR Code demorou demais. Tente novamente ou conecte por Telefone." });
      } else {
        toast({ title: "Erro", description: error.message || "Erro ao obter QR Code.", variant: "destructive" });
      }
    } finally {
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
        return true;
      }
    } catch (error) {
      console.error("Error polling status:", error);
    }
    return false;
  }, [onConnected]);

  const openDialog = (instance: ConnectableInstance) => {
    setQrInstance(instance);
    setQrCode(null);
    setPairingCode(null);
    setPhoneNumber("");
    setConnectionMode("qr");
    setQrDialogOpen(true);
    setQrPolling(true);
    fetchQrCode(instance);
  };

  const closeDialog = () => {
    setQrDialogOpen(false);
    setQrPolling(false);
    setQrCode(null);
    setPairingCode(null);
    setPhoneNumber("");
    setConnectionMode("qr");
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

  // Connection status polling (every 3s) — pause while typing phone number
  const shouldPoll = qrDialogOpen && qrInstance && qrPolling && (connectionMode === "qr" || !!pairingCode);
  
  useEffect(() => {
    if (!shouldPoll || !qrInstance) return;
    const initialTimeout = setTimeout(async () => {
      await pollConnectionStatus(qrInstance);
    }, 2000);
    const interval = setInterval(async () => {
      const connected = await pollConnectionStatus(qrInstance);
      if (connected) clearInterval(interval);
    }, 3000);
    return () => { clearTimeout(initialTimeout); clearInterval(interval); };
  }, [shouldPoll, qrInstance, pollConnectionStatus]);

  // QR code refresh (every 15s)
  useEffect(() => {
    if (!qrDialogOpen || !qrInstance || !qrPolling || connectionMode !== "qr") return;
    const interval = setInterval(() => fetchQrCode(qrInstance), 15000);
    return () => clearInterval(interval);
  }, [qrDialogOpen, qrInstance, qrPolling, connectionMode, fetchQrCode]);

  return {
    qrDialogOpen,
    qrLoading,
    qrCode,
    qrInstance,
    connectionMode,
    phoneNumber,
    pairingCode,
    isPairingLoading,
    openDialog,
    closeDialog,
    setConnectionMode,
    setPhoneNumber,
    requestPairingCode,
    fetchQrCode,
  };
}
