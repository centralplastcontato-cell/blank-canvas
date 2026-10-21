// "Nova Festa" de um lead: data (dia/mês do lead, com o ano da próxima vez
// que essa data acontece) e convidados já vêm preenchidos. A equipe confere.

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export interface LeadPartyPrefill {
  day: string | null; // "21"
  month: string | null; // "02"
  year: string | null; // "2027"
  guests: number | null;
}

/**
 * month: "Fevereiro", "Fevereiro/27", "fevereiro de 2027"; day: 21; guests:
 * "50 pessoas", "70 a 90". todayYmd no horário de Brasília.
 */
export function leadPartyPrefill(
  lead: { month?: string | null; day_of_month?: number | null; guests?: string | null },
  todayYmd: string,
): LeadPartyPrefill {
  const text = norm(String(lead.month || ""));
  const mIdx = MONTHS.findIndex((m) => text.includes(norm(m)));
  const dayNum = Number(lead.day_of_month);
  const day = Number.isInteger(dayNum) && dayNum >= 1 && dayNum <= 31 ? String(dayNum).padStart(2, "0") : null;
  let month: string | null = null;
  let year: string | null = null;
  if (mIdx >= 0) {
    month = String(mIdx + 1).padStart(2, "0");
    const y = text.match(/\b(20\d{2})\b/) || text.match(/[/\s-](\d{2})\b/);
    if (y) {
      year = y[1].length === 4 ? y[1] : `20${y[1]}`;
    } else {
      // Sem ano: a próxima vez que essa data (ou esse mês) acontece
      const thisYear = Number(todayYmd.slice(0, 4));
      const candidate = `${thisYear}-${month}-${day || "31"}`;
      year = String(candidate < todayYmd ? thisYear + 1 : thisYear);
    }
  }
  const g = String(lead.guests || "").match(/\d+/);
  const guests = g && Number(g[0]) > 0 && Number(g[0]) < 2000 ? Number(g[0]) : null;
  return { day, month, year, guests };
}
