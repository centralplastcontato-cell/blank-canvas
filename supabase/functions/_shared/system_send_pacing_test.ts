import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  brDayKey,
  claimSystemSendSlot,
  decideSystemSend,
  inSystemSendWindow,
  replyOnlyUntil,
  systemDailyCap,
} from "./system-send-pacing.ts";

const VENDAS_2 = "3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7";
// 15/10 14:00 em Brasília
const NOW = Date.parse("2026-10-15T17:00:00Z");
const fresh = { nextAt: null, day: null, count: 0 };

Deno.test("ritmo do sistema: só das 9h às 20h de Brasília", () => {
  assertEquals(inSystemSendWindow(Date.parse("2026-10-15T11:59:00Z")), false); // 8:59
  assertEquals(inSystemSendWindow(Date.parse("2026-10-15T12:00:00Z")), true); // 9:00
  assertEquals(inSystemSendWindow(Date.parse("2026-10-15T22:59:00Z")), true); // 19:59
  assertEquals(inSystemSendWindow(Date.parse("2026-10-15T23:00:00Z")), false); // 20:00
  assertEquals(decideSystemSend(fresh, 80, Date.parse("2026-10-15T23:30:00Z"), 0).ok, false);
});

Deno.test("ritmo do sistema: intervalo de 60 a 180 s sorteado", () => {
  const a = decideSystemSend(fresh, 80, NOW, 0);
  const b = decideSystemSend(fresh, 80, NOW, 0.9999);
  assertEquals(a.ok && (Date.parse(a.nextAt) - NOW) / 1000, 60);
  assertEquals(b.ok && (Date.parse(b.nextAt) - NOW) / 1000, 180);
  // Antes de passar o intervalo: não sai
  const early = decideSystemSend({ nextAt: new Date(NOW + 30000).toISOString(), day: brDayKey(NOW), count: 3 }, 80, NOW, 0);
  assertEquals(early.ok, false);
});

Deno.test("ritmo do sistema: teto por dia, zera no dia seguinte", () => {
  const full = { nextAt: null, day: brDayKey(NOW), count: 40 };
  assertEquals(decideSystemSend(full, 40, NOW, 0), { ok: false, reason: "limite do dia (40)" });
  const ontem = { nextAt: null, day: "2026-10-14", count: 40 };
  const r = decideSystemSend(ontem, 40, NOW, 0);
  assertEquals(r.ok && r.count, 1);
  // 23h de Brasília ainda é o mesmo dia (UTC já virou)
  assertEquals(brDayKey(Date.parse("2026-10-16T02:00:00Z")), "2026-10-15");
});

Deno.test("teto: VENDAS 2 sobe 20 → 40 → 80; VENDAS 1 80", () => {
  assertEquals(systemDailyCap(VENDAS_2, Date.parse("2026-10-17T15:00:00Z")), 20);
  assertEquals(systemDailyCap(VENDAS_2, Date.parse("2026-10-20T02:59:00Z")), 20); // 19/10 23:59
  assertEquals(systemDailyCap(VENDAS_2, Date.parse("2026-10-20T03:00:00Z")), 40); // 20/10 00:00
  assertEquals(systemDailyCap(VENDAS_2, Date.parse("2026-10-24T03:00:00Z")), 80);
  assertEquals(decideSystemSend(fresh, 0, NOW, 0), { ok: false, reason: "envios do sistema pausados neste número" });
  assertEquals(systemDailyCap("vendas-1", NOW), 80);
});

Deno.test("só responde: nenhum número com a trava agora", () => {
  assertEquals(replyOnlyUntil(VENDAS_2, Date.parse("2026-10-17T15:00:00Z")), null);
  assertEquals(replyOnlyUntil("vendas-1", NOW), null);
});

// Banco de mentira só com a linha do ritmo
function fakeDb(row: { lock_until: string | null; detail: Record<string, unknown> | null }) {
  const db = {
    row,
    updates: 0,
    from: () => {
      let mode = "";
      let patch: any = null;
      const q: any = {
        upsert: () => Promise.resolve({ error: null }),
        select: () => q,
        update: (p: any) => { mode = "update"; patch = p; return q; },
        eq: () => q,
        or: () => q,
        maybeSingle: () => Promise.resolve({ data: db.row, error: null }),
        then: (ok: any) => {
          if (mode === "update") {
            const free = !db.row.lock_until || Date.parse(db.row.lock_until) <= NOW;
            if (free) { db.row = { ...db.row, ...patch }; db.updates++; }
            return Promise.resolve({ data: free ? [{ key: "k" }] : [], error: null }).then(ok);
          }
          return Promise.resolve({ data: null, error: null }).then(ok);
        },
      };
      return q;
    },
  };
  return db;
}

Deno.test("pega a vez: um envio por vez, o segundo espera o intervalo", async () => {
  const db = fakeDb({ lock_until: null, detail: null });
  const inst = { id: "vendas-1", provider: "evolution" };
  assertEquals(await claimSystemSendSlot(db, inst, NOW), { ok: true, paced: true });
  assertEquals((db.row.detail as any).count, 1);
  const second = await claimSystemSendSlot(db, inst, NOW);
  assertEquals(second.ok, false);
  assertEquals(db.updates, 1);
});

Deno.test("números da Z-API não passam pelo ritmo novo", async () => {
  const db = fakeDb({ lock_until: new Date(NOW + 999999).toISOString(), detail: { day: brDayKey(NOW), count: 999 } });
  assertEquals(await claimSystemSendSlot(db, { id: "x", provider: "zapi" }, NOW), { ok: true, paced: false });
});
