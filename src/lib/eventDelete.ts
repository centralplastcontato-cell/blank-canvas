// Exclusão de festa: o que pode ser apagado para a festa sair.

/** Contratos e formulários da festa que podem ser apagados para a festa poder ser excluída */
export const CLEARABLE_EVENT_CHILDREN = new Set([
  "generated_contracts",
  "contrato_responses",
  "cardapio_responses",
  "freelancer_evaluations",
  "event_info_entries",
  "attendance_entries",
  "maintenance_entries",
  "party_monitoring_entries",
]);

/** Tabela que ainda aponta para a festa (erro 23503 do banco) */
export function blockingTable(error: { details?: string | null; message?: string | null }): string | null {
  const fromDetails = /referenced from table "([^"]+)"/.exec(error.details || "")?.[1];
  if (fromDetails) return fromDetails;
  const matches = [...(error.message || "").matchAll(/table "([^"]+)"/g)];
  return matches.length > 1 ? matches[matches.length - 1][1] : null;
}
