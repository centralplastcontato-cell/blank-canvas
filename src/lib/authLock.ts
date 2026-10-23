import { navigatorLock } from "@supabase/supabase-js";

/**
 * Trava da sessão do Supabase (compartilhada entre as abas do navegador) que se
 * recupera sozinha.
 *
 * Toda leitura/gravação passa por essa trava. Quando uma aba congelada ou
 * fechada no meio de uma operação não a solta, a versão 2.95 da biblioteca
 * espera 10 s e desiste: "AbortError: signal is aborted without reason" (Castelo,
 * 23/10, ao marcar uma visita como "Veio"). Versões novas resolvem roubando a
 * trava presa (supabase/supabase#42505); aqui fazemos o mesmo sem trocar a
 * biblioteca inteira.
 */
export async function recoveringNavigatorLock<R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) return fn();
  try {
    return await navigatorLock(name, acquireTimeout, fn);
  } catch (e) {
    const isAbort = e !== null && typeof e === "object" && "name" in e && (e as { name: string }).name === "AbortError";
    if (!isAbort || acquireTimeout <= 0) throw e;
    console.warn(`[supabase] Trava "${name}" presa há ${acquireTimeout} ms — assumindo a trava para continuar`);
    return await locks.request(name, { mode: "exclusive", steal: true }, () => fn());
  }
}
