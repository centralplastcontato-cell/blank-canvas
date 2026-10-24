// Aviso de "alterações não salvas" ao trocar de item em Configurações.
// A página com rascunho marca dirty; o hub pergunta antes de sair dela.

let dirty = false;

export function setUnsavedChanges(value: boolean): void {
  dirty = value;
}

/** true = pode sair (não havia nada ou a pessoa confirmou) */
export function confirmLeaveUnsaved(): boolean {
  if (!dirty) return true;
  const ok = window.confirm("Você tem alterações não salvas. Sair sem salvar?");
  if (ok) dirty = false;
  return ok;
}
