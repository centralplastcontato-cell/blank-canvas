import { supabase } from "@/integrations/supabase/client";

// Histórico de Senhas (Hub → Usuários): o banco registra toda troca de senha
// (gatilho em auth.users); aqui a tela completa o registro com por onde foi
// trocada e em qual aparelho, para saber quem fez a troca.

export type PasswordChangeMethod = "perfil" | "esqueci_senha";

export const PASSWORD_METHOD_LABELS: Record<string, string> = {
  perfil: "Perfil (já logado)",
  esqueci_senha: "Esqueci minha senha (e-mail)",
  admin: "Admin (tela de Usuários)",
  sistema: "Não identificado",
};

/** "iPad · Safari", "Android · Chrome", "Windows · Edge"… */
export function deviceLabel(ua: string): string {
  const os = /iPad/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua)) ? "iPad"
    : /iPhone/.test(ua) ? "iPhone"
    : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "Mac"
    : /Linux/.test(ua) ? "Linux"
    : "Outro";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /SamsungBrowser/.test(ua) ? "Samsung"
    : /CriOS|Chrome\//.test(ua) ? "Chrome"
    : /FxiOS|Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "navegador";
  return `${os} · ${browser}`;
}

/** Depois de trocar a senha: completa o registro (sem travar a tela se falhar) */
export async function logPasswordChange(method: PasswordChangeMethod): Promise<void> {
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    await (supabase as any).rpc("log_my_password_change", { _method: method, _device: deviceLabel(ua) });
  } catch {
    /* registro é extra: a troca de senha já deu certo */
  }
}
