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
    // Sem cabeçalho próprio: um cabeçalho extra faz o navegador pedir permissão (preflight) e o serviço recusa
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&accept-language=pt-BR&q=${encodeURIComponent(q)}`, { signal });
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
/** Endereço do buffet → coordenadas (sem achar o número, tenta só a rua e depois o bairro) */
export async function geocodeOrigin(originAddress: string): Promise<LatLng | null> {
  const parts = originAddress.split(",").map((p) => p.trim()).filter(Boolean);
  const attempts = [
    originAddress,
    parts.filter((p) => !/^\d+[a-z]?$/i.test(p)).join(", "), // sem o número
    parts.slice(-3).join(", "), // bairro, cidade, UF
  ].filter((q, i, all) => q && all.indexOf(q) === i);
  for (const q of attempts) {
    const hit = await geocodeAddress(q);
    if (hit) return hit;
  }
  return null;
}

/** Endereço salvo ("Rua X, 12, Bairro, Cidade, UF") → partes (para recalcular a distância depois) */
export function splitSavedAddress(address: string | null | undefined, cep: string | null | undefined): CandidateAddress {
  const parts = String(address || "").split(",").map((p) => p.trim()).filter(Boolean);
  const state = parts.length >= 1 && /^[A-Z]{2}$/.test(parts[parts.length - 1]) ? parts.pop() as string : "";
  const city = parts.length >= 1 ? parts.pop() as string : "";
  const neighborhood = parts.length >= 1 ? parts.pop() as string : "";
  const number = parts.length >= 2 && /^\d+[a-z]?$/i.test(parts[parts.length - 1]) ? parts.pop() as string : "";
  return { cep: String(cep || ""), street: parts.join(", "), number, neighborhood, city, state };
}

export async function distanceToBuffet(originAddress: string, addr: CandidateAddress): Promise<number | null> {
  try {
    const [origin, byCep] = await Promise.all([geocodeOrigin(originAddress), geocodeCep(addr.cep)]);
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

// ---- Nota do candidato (0 a 100): ordena a aba Candidatos ----

export const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
const DAY_PREFIX = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
/** Dias de festa: sexta, sábado e domingo */
export const PARTY_DAYS = new Set([4, 5, 6]);

/** "Sábado", "sab", "Domingo" → índice 0 (seg) … 6 (dom); null se não for dia */
export function dayIndex(label: string): number | null {
  const n = norm(label).slice(0, 3);
  const i = DAY_PREFIX.indexOf(n);
  return i >= 0 ? i : null;
}

export interface CandidateFacts {
  days: string[]; // como respondido ("Sábado", "Domingo"…)
  km: number | null; // distância até o buffet (null = não calculada)
  workedBuffet: boolean;
  experience: boolean;
}

export interface ScorePart { key: "dias" | "distancia" | "buffet" | "experiencia"; label: string; got: number; max: number; why: string }

export function distancePoints(km: number | null): number {
  if (km === null || !Number.isFinite(km)) return 0;
  return km <= 5 ? 30 : km <= 10 ? 20 : km <= 15 ? 10 : 0;
}

export function candidateScore(f: CandidateFacts): { total: number; parts: ScorePart[] } {
  const idx = [...new Set(f.days.map(dayIndex).filter((i): i is number => i !== null))];
  const party = idx.filter((i) => PARTY_DAYS.has(i)).length;
  const week = idx.length - party;
  const daysPts = party * 9 + Math.min(8, week * 2);
  const distPts = distancePoints(f.km);
  const parts: ScorePart[] = [
    { key: "dias", label: "Disponibilidade", got: daysPts, max: 35, why: `${party} de 3 dias de festa + ${week} dia(s) de semana` },
    { key: "distancia", label: "Distância", got: distPts, max: 30, why: f.km === null ? "distância não calculada" : `${f.km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km até o buffet` },
    { key: "buffet", label: "Já trabalhou em buffet", got: f.workedBuffet ? 20 : 0, max: 20, why: f.workedBuffet ? "sim" : "não" },
    { key: "experiencia", label: "Experiência", got: f.experience ? 15 : 0, max: 15, why: f.experience ? "sim" : "não" },
  ];
  return { total: parts.reduce((n, p) => n + p.got, 0), parts };
}

/** Idade na data de hoje (data de nascimento AAAA-MM-DD) */
export function ageOn(born: string | null | undefined, today: Date): number | null {
  const m = String(born || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) age--;
  return age >= 0 && age < 120 ? age : null;
}
