// Quais unidades a pessoa pode ver nas visitas (mesma regra da aba Visitas).
// "As duas", "all" e canais de venda ("Vendas 1"...) não restringem nada.
// Visita sem unidade continua aparecendo, para não sumir nada que ninguém sabe de quem é.
const norm = (u: string) => u.toLowerCase().trim();

export function visitUnitAccess(canViewAll: boolean, allowedUnits: string[], loading: boolean) {
  const permitted = allowedUnits.filter((u) => u !== "As duas" && u !== "all" && !norm(u).includes("vendas")).map(norm);
  const restrict = !canViewAll && !loading && permitted.length > 0;
  return (unit: string | null | undefined) => !restrict || !unit || permitted.includes(norm(unit));
}
