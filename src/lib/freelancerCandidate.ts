// Candidatura de freelancer (formulário "candidatura" + aba Candidatos):
// distância até o buffet, preenchimento pelo link da Bia e a nota que ordena
// os candidatos.

export interface LatLng { lat: number; lng: number }

/** Distância em linha reta (km) */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Vagas do link ("monitor,garcom") → opções do formulário. "cozinha" marca as
 * duas da cozinha; o que não bate com nenhuma opção é ignorado.
 */
export function matchOptions(raw: string | null | undefined, options: string[]): string[] {
  const tokens = String(raw || "").split(/[,;|]/).map(norm).filter((t) => t.length >= 3);
  if (tokens.length === 0) return [];
  return options.filter((opt) => {
    const o = norm(opt);
    return tokens.some((t) => o === t || o.startsWith(`${t} `) || o.includes(t) || t.includes(o));
  });
}

export interface CandidatePrefill { name: string | null; phone: string | null; roles: string | null; source: "bia" | "link" }

/** Dados que a Bia manda no link (?nome=…&tel=…&vagas=…&via=bia) */
export function readPrefill(search: string): CandidatePrefill {
  const p = new URLSearchParams(search || "");
  const clean = (v: string | null, max: number) => {
    const s = String(v || "").trim().slice(0, max);
    return s || null;
  };
  return {
    name: clean(p.get("nome"), 80),
    phone: clean(p.get("tel"), 20),
    roles: clean(p.get("vagas"), 200),
    source: p.get("via") === "bia" ? "bia" : "link",
  };
}

const withTimeout = async <T>(p: (signal: AbortSignal) => Promise<T>, ms = 6000): Promise<T | null> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await p(ctrl.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** CEP → coordenadas (BrasilAPI; nem todo CEP tem) */
async function geocodeCep(cep: string): Promise<LatLng | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return withTimeout(async (signal) => {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const lat = Number(data?.location?.coordinates?.latitude);
    const lng = Number(data?.location?.coordinates?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0 ? { lat, lng } : null;
  });
}

/** Endereço → coordenadas (OpenStreetMap) */
async function geocodeAddress(q: string): Promise<LatLng | null> {
  if (!q.trim()) return null;
  return withTimeout(async (signal) => {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`, { signal, headers: { "Accept-Language": "pt-BR" } });
    if (!res.ok) return null;
    const rows = await res.json();
    const lat = Number(rows?.[0]?.lat);
    const lng = Number(rows?.[0]?.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  });
}

export interface CandidateAddress { cep: string; street: string; number: string; neighborhood: string; city: string; state: string }

/**
 * Distância (km, 1 casa) do candidato até o buffet. Nunca falha: sem
 * coordenadas de um dos dois, devolve null e o cadastro segue sem a distância.
 */
export async function distanceToBuffet(originAddress: string, addr: CandidateAddress): Promise<number | null> {
  try {
    const [origin, byCep] = await Promise.all([geocodeAddress(originAddress), geocodeCep(addr.cep)]);
    if (!origin) return null;
    const place = [addr.city, addr.state].filter(Boolean).join(", ");
    const candidate = byCep
      || await geocodeAddress([[addr.street, addr.number].filter(Boolean).join(" "), addr.neighborhood, place].filter(Boolean).join(", "))
      || await geocodeAddress([addr.neighborhood, place].filter(Boolean).join(", "));
    if (!candidate) return null;
    return Math.round(haversineKm(origin, candidate) * 10) / 10;
  } catch {
    return null;
  }
}
