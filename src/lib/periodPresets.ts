import { startOfQuarter, endOfQuarter, addQuarters, startOfYear, endOfYear, subQuarters, endOfMonth } from "date-fns";

// Atalhos calculados na hora (antes a data ficava parada de quando a página abriu)
export function getPeriodPresets(now: Date = new Date()) {
  const currentYear = now.getFullYear();
  const firstHalf = now.getMonth() < 6;
  return [
    { label: "Último trimestre", from: startOfQuarter(subQuarters(now, 1)), to: endOfQuarter(subQuarters(now, 1)) },
    { label: "Próximo trimestre", from: startOfQuarter(addQuarters(now, 1)), to: endOfQuarter(addQuarters(now, 1)) },
    // 1º semestre: janeiro a junho; 2º: julho a dezembro
    {
      label: "Semestre atual",
      from: new Date(currentYear, firstHalf ? 0 : 6, 1),
      to: endOfMonth(new Date(currentYear, firstHalf ? 5 : 11, 1)),
    },
    { label: `Ano ${currentYear} inteiro`, from: startOfYear(now), to: endOfYear(now) },
  ];
}
