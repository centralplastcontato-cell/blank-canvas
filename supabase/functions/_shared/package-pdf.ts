// Qual PDF de pacotes mandar, pela quantidade de convidados (mesma regra do bot
// fixo em qualification-materials): PDF sem faixa vale para todos; senão, o da
// faixa exata, ou a faixa logo acima, ou a maior.

export interface PackagePdf {
  guest_count: number | null;
  [key: string]: unknown;
}

export function parseGuestCount(raw: unknown): number | null {
  const m = String(raw ?? "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** needGuests = só há PDFs por faixa e ainda não se sabe quantos convidados */
export function pickPackagePdfs<T extends PackagePdf>(pdfs: T[], guestCount: number | null): { pdfs: T[]; needGuests: boolean } {
  const universal = pdfs.filter((p) => p.guest_count === null || p.guest_count === undefined);
  if (universal.length) return { pdfs: universal, needGuests: false };
  const specific = pdfs.filter((p) => typeof p.guest_count === "number");
  if (!specific.length) return { pdfs: [], needGuests: false };
  if (!guestCount) return { pdfs: [], needGuests: true };
  const sorted = [...specific].sort((a, b) => (a.guest_count as number) - (b.guest_count as number));
  const pick = sorted.find((p) => p.guest_count === guestCount)
    || sorted.find((p) => (p.guest_count as number) >= guestCount)
    || sorted[sorted.length - 1];
  return { pdfs: [pick], needGuests: false };
}
