// Rascunho da campanha em criação, guardado neste aparelho. Se a janela fechar sem
// querer (ou o celular trocar de app), ao abrir de novo a pessoa continua de onde parou.

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const key = (companyId: string) => `campanha-rascunho:${companyId}`;

interface DraftLike {
  name: string;
  description: string;
  variations: unknown[];
  selectedLeadIds: string[];
  leads?: unknown[];
  preselectTails?: string[];
}

export interface SavedCampaignDraft<T> {
  step: number;
  draft: T;
  savedAt: string;
}

/** Vale a pena guardar? (algo além da tela vazia) */
export function hasDraftContent(d: DraftLike): boolean {
  return !!(d.name.trim() || d.description.trim() || d.variations.length || d.selectedLeadIds.length);
}

export function saveCampaignDraft<T extends DraftLike>(companyId: string, step: number, draft: T): void {
  try {
    if (!hasDraftContent(draft)) {
      localStorage.removeItem(key(companyId));
      return;
    }
    // A lista de leads é grande e é carregada de novo no passo do público
    const { leads: _leads, preselectTails: _tails, ...rest } = draft;
    localStorage.setItem(key(companyId), JSON.stringify({ step, draft: rest, savedAt: new Date().toISOString() }));
  } catch {
    // Sem espaço ou navegador bloqueando: segue sem rascunho
  }
}

export function loadCampaignDraft<T extends DraftLike>(companyId: string, now = new Date()): SavedCampaignDraft<T> | null {
  try {
    const raw = localStorage.getItem(key(companyId));
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedCampaignDraft<T>;
    if (!saved?.draft || now.getTime() - new Date(saved.savedAt).getTime() > MAX_AGE_MS) {
      localStorage.removeItem(key(companyId));
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

export function clearCampaignDraft(companyId: string): void {
  try {
    localStorage.removeItem(key(companyId));
  } catch {
    // ignora
  }
}
