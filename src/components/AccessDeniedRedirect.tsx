import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface AccessDeniedRedirectProps {
  message?: string;
  title?: string;
  /** Fallback route if no previous history is available. */
  fallback?: string;
}

/**
 * Em vez de exibir uma tela cheia de "Acesso restrito", dispara um toast
 * e devolve o usuário para a tela anterior — evitando que ele fique preso
 * em uma página vazia quando clica em um item sem permissão.
 */
export function AccessDeniedRedirect({
  message = "Você não tem permissão para acessar esta área.",
  title = "Acesso restrito",
  fallback = "/atendimento",
}: AccessDeniedRedirectProps) {
  const navigate = useNavigate();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    toast({
      title,
      description: message,
      variant: "destructive",
    });

    // Volta para a tela anterior; se não houver histórico, usa fallback.
    const hasHistory = typeof window !== "undefined" && window.history.length > 1;
    if (hasHistory) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  }, [navigate, message, title, fallback]);

  return null;
}
