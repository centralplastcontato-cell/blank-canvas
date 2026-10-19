/**
 * Link de "Esqueci minha senha" (e-mail do Supabase). Roda antes de tudo
 * (primeiro import do main.tsx), enquanto o #access_token ainda está na URL:
 * marca que é uma recuperação e, se o Supabase mandou para outra página (ex.: a
 * raiz, quando o endereço não está liberado), troca o caminho para
 * /redefinir-senha antes do roteador abrir — senão o login veria a sessão e
 * entraria direto, sem pedir a senha nova.
 */
export const RECOVERY_PATH = "/redefinir-senha";
export const RECOVERY_FLAG = "pw_recovery";

export type RecoveryState = "recovery" | "expired" | null;

export function detectRecovery(hash: string, search: string): RecoveryState {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.get("type") === "recovery") return "recovery";
  const err = params.get("error_code") || new URLSearchParams(search).get("error_code");
  if (err === "otp_expired" || (err && params.get("error") === "access_denied")) return "expired";
  return null;
}

export function readRecoveryFlag(): RecoveryState {
  try { return (sessionStorage.getItem(RECOVERY_FLAG) as RecoveryState) || null; } catch { return null; }
}

export function clearRecoveryFlag() {
  try { sessionStorage.removeItem(RECOVERY_FLAG); } catch { /* sem armazenamento */ }
}

if (typeof window !== "undefined") {
  const state = detectRecovery(window.location.hash, window.location.search);
  // Erro só conta na própria página de redefinir (outros fluxos também usam #error)
  if (state === "recovery" || (state === "expired" && window.location.pathname === RECOVERY_PATH)) {
    try { sessionStorage.setItem(RECOVERY_FLAG, state); } catch { /* sem armazenamento */ }
    if (state === "recovery" && window.location.pathname !== RECOVERY_PATH) {
      window.history.replaceState(null, "", `${RECOVERY_PATH}${window.location.hash}`);
    }
  }
}
