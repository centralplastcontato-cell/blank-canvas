import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  isHolidayEveYmd,
  isHolidayYmd,
  moneyValuesIn,
  quotePackages,
  resolveDayType,
  weekdayYmd,
} from "./package-pricing.ts";

const PACKAGES = [
  { id: "p1", name: "Castelo", valor_pessoa_adicional: 60 },
  { id: "p2", name: "Super Castelo", valor_pessoa_adicional: null },
];
const TIERS = [
  { package_id: "p1", guest_count: 50, day_type: "sab_dom", price: 5000 },
  { package_id: "p1", guest_count: 60, day_type: "sab_dom", price: "5600" },
  { package_id: "p1", guest_count: 100, day_type: "sab_dom", price: 8000 },
  { package_id: "p1", guest_count: 60, day_type: "seg_qui", price: 4000 },
  { package_id: "p1", guest_count: 60, day_type: "feriado", price: 6500 },
  { package_id: "p2", guest_count: 60, day_type: "sab_dom", price: 7000 },
];

Deno.test("feriados e dia da semana por data", () => {
  assertEquals(isHolidayYmd(2026, 11, 2), true); // Finados
  assertEquals(isHolidayYmd(2026, 6, 4), true); // Corpus Christi 2026
  assertEquals(isHolidayYmd(2026, 2, 17), true); // Carnaval (terça) 2026
  assertEquals(isHolidayEveYmd(2026, 11, 14), true); // véspera da Proclamação
  assertEquals(isHolidayYmd(2026, 11, 14), false);
  assertEquals(weekdayYmd(2026, 11, 14), 6); // sábado
});

Deno.test("resolveDayType: feriado vence o dia da semana; grade padrão", () => {
  assertEquals(resolveDayType({ dow: 6 }), "sab_dom");
  assertEquals(resolveDayType({ dow: 3 }), "seg_qui");
  assertEquals(resolveDayType({ dow: 6, holiday: true }), "feriado");
  assertEquals(resolveDayType({ dow: 5, holidayEve: true }), "vespera_feriado");
});

Deno.test("quotePackages: faixa igual ou acima, pacote sem preço fica de fora", () => {
  const q = quotePackages(PACKAGES, TIERS, null, 55, { dow: 6 });
  assertEquals(q.map((x) => [x.packageName, x.tier, x.tierPrice, x.total]), [
    ["Castelo", 60, 5600, 5600],
    ["Super Castelo", 60, 7000, 7000],
  ]);
  // Abaixo do mínimo: menor faixa
  assertEquals(quotePackages(PACKAGES, TIERS, null, 30, { dow: 0 })[0].tier, 50);
  // Feriado usa a coluna de feriado
  assertEquals(quotePackages(PACKAGES, TIERS, null, 60, { dow: 6, holiday: true }).map((x) => x.tierPrice), [6500]);
});

Deno.test("quotePackages: acima da maior faixa soma pessoa adicional", () => {
  const [castelo] = quotePackages(PACKAGES, TIERS, null, 120, { dow: 6 });
  assertEquals([castelo.tier, castelo.extraGuests, castelo.extraUnit, castelo.total], [100, 20, 60, 9200]);
});

Deno.test("quotePackages: grade com almoço/jantar devolve os dois turnos", () => {
  const settings = {
    day_type_config: [
      { key: "sab_alm", label: "Sábado almoço", days: ["6"], shift: "almoco" },
      { key: "sab_jan", label: "Sábado jantar", days: ["6"], shift: "jantar" },
      { key: "outros", label: "Outros", days: ["0", "1", "2", "3", "4", "5"] },
    ],
    guest_tiers: [50, 60],
  };
  const tiers = [
    { package_id: "p1", guest_count: 60, day_type: "sab_alm", price: 5000 },
    { package_id: "p1", guest_count: 60, day_type: "sab_jan", price: 6000 },
  ];
  assertEquals(quotePackages([PACKAGES[0]], tiers, settings, 60, { dow: 6 }).map((x) => [x.shift, x.tierPrice]), [["almoco", 5000], ["jantar", 6000]]);
});

Deno.test("moneyValuesIn: lê valores em reais do texto", () => {
  assertEquals(moneyValuesIn("Fica R$ 5.600,00, ou R$5600 e R$ 60,5 por pessoa"), [5600, 5600, 60.5]);
  assertEquals(moneyValuesIn("Sem valores aqui, só 60 convidados"), []);
});
