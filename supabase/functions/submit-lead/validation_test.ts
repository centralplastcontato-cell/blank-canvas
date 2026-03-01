import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";

// ===== Copied from submit-lead/index.ts for isolated testing =====

function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Nome é obrigatório' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Nome deve ter pelo menos 2 caracteres' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Nome deve ter no máximo 100 caracteres' };
  }
  if (/[<>{}]/.test(trimmed)) {
    return { valid: false, error: 'Nome contém caracteres inválidos' };
  }
  return { valid: true };
}

function validateWhatsApp(phone: string): { valid: boolean; error?: string; normalized?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'WhatsApp é obrigatório' };
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return { valid: false, error: 'Número de WhatsApp inválido' };
  }
  return { valid: true, normalized: digits };
}

function validateCampaignId(campaignId: string): { valid: boolean; error?: string } {
  if (!campaignId || typeof campaignId !== 'string') {
    return { valid: false, error: 'ID da campanha é obrigatório' };
  }
  if (campaignId.length > 100) {
    return { valid: false, error: 'ID da campanha inválido' };
  }
  return { valid: true };
}

function validateUnit(unit: string | null): { valid: boolean; error?: string } {
  if (!unit) return { valid: true };
  if (typeof unit !== 'string' || unit.length > 100) {
    return { valid: false, error: 'Unidade inválida' };
  }
  return { valid: true };
}

function validateMonth(month: string | null): { valid: boolean; error?: string } {
  if (!month) return { valid: true };
  const validMonths = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthName = month.split('/')[0].trim();
  if (!validMonths.includes(monthName)) {
    return { valid: false, error: 'Mês inválido' };
  }
  return { valid: true };
}

function validateDayOfMonth(day: number | null): { valid: boolean; error?: string } {
  if (day === null || day === undefined) return { valid: true };
  if (typeof day !== 'number' || day < 1 || day > 31) {
    return { valid: false, error: 'Dia do mês inválido' };
  }
  return { valid: true };
}

function validateGuests(guests: string | null): { valid: boolean; error?: string } {
  if (!guests) return { valid: true };
  if (typeof guests !== 'string' || guests.length > 50) {
    return { valid: false, error: 'Número de convidados inválido' };
  }
  return { valid: true };
}

// ===== Tests =====

// --- validateName ---
Deno.test("validateName: rejects empty string", () => {
  assertEquals(validateName("").valid, false);
});

Deno.test("validateName: rejects single char", () => {
  assertEquals(validateName("A").valid, false);
});

Deno.test("validateName: accepts 2-char name", () => {
  assertEquals(validateName("Lu").valid, true);
});

Deno.test("validateName: accepts normal name", () => {
  assertEquals(validateName("Maria Clara").valid, true);
});

Deno.test("validateName: rejects name > 100 chars", () => {
  assertEquals(validateName("A".repeat(101)).valid, false);
});

Deno.test("validateName: rejects < in name", () => {
  assertEquals(validateName("Test<script>").valid, false);
});

Deno.test("validateName: rejects > in name", () => {
  assertEquals(validateName("Test>alert").valid, false);
});

Deno.test("validateName: rejects { in name", () => {
  assertEquals(validateName("Test{inject}").valid, false);
});

Deno.test("validateName: rejects } in name", () => {
  assertEquals(validateName("Test}").valid, false);
});

// --- validateWhatsApp ---
Deno.test("validateWhatsApp: rejects empty", () => {
  assertEquals(validateWhatsApp("").valid, false);
});

Deno.test("validateWhatsApp: rejects short number", () => {
  assertEquals(validateWhatsApp("12345").valid, false);
});

Deno.test("validateWhatsApp: accepts 10-digit number", () => {
  const r = validateWhatsApp("1199998888");
  assertEquals(r.valid, true);
  assertEquals(r.normalized, "1199998888");
});

Deno.test("validateWhatsApp: accepts 11-digit BR mobile", () => {
  const r = validateWhatsApp("11999998888");
  assertEquals(r.valid, true);
  assertEquals(r.normalized, "11999998888");
});

Deno.test("validateWhatsApp: normalizes formatted number", () => {
  const r = validateWhatsApp("(11) 99999-8888");
  assertEquals(r.valid, true);
  assertEquals(r.normalized, "11999998888");
});

Deno.test("validateWhatsApp: accepts intl number with country code", () => {
  const r = validateWhatsApp("+5511999998888");
  assertEquals(r.valid, true);
  assertEquals(r.normalized, "5511999998888");
});

Deno.test("validateWhatsApp: rejects > 15 digits", () => {
  assertEquals(validateWhatsApp("1234567890123456").valid, false);
});

// --- validateCampaignId ---
Deno.test("validateCampaignId: rejects empty", () => {
  assertEquals(validateCampaignId("").valid, false);
});

Deno.test("validateCampaignId: accepts valid id", () => {
  assertEquals(validateCampaignId("camp-123").valid, true);
});

Deno.test("validateCampaignId: rejects > 100 chars", () => {
  assertEquals(validateCampaignId("x".repeat(101)).valid, false);
});

// --- validateUnit ---
Deno.test("validateUnit: accepts null (optional)", () => {
  assertEquals(validateUnit(null).valid, true);
});

Deno.test("validateUnit: accepts valid unit", () => {
  assertEquals(validateUnit("Unidade Centro").valid, true);
});

Deno.test("validateUnit: rejects > 100 chars", () => {
  assertEquals(validateUnit("U".repeat(101)).valid, false);
});

// --- validateMonth ---
Deno.test("validateMonth: accepts null (optional)", () => {
  assertEquals(validateMonth(null).valid, true);
});

Deno.test("validateMonth: accepts 'Março'", () => {
  assertEquals(validateMonth("Março").valid, true);
});

Deno.test("validateMonth: accepts 'Março/27' (with year suffix)", () => {
  assertEquals(validateMonth("Março/27").valid, true);
});

Deno.test("validateMonth: accepts 'Dezembro/2027'", () => {
  assertEquals(validateMonth("Dezembro/2027").valid, true);
});

Deno.test("validateMonth: rejects 'Foo'", () => {
  assertEquals(validateMonth("Foo").valid, false);
});

Deno.test("validateMonth: rejects 'March' (English)", () => {
  assertEquals(validateMonth("March").valid, false);
});

// --- validateDayOfMonth ---
Deno.test("validateDayOfMonth: accepts null (optional)", () => {
  assertEquals(validateDayOfMonth(null).valid, true);
});

Deno.test("validateDayOfMonth: accepts day 1", () => {
  assertEquals(validateDayOfMonth(1).valid, true);
});

Deno.test("validateDayOfMonth: accepts day 31", () => {
  assertEquals(validateDayOfMonth(31).valid, true);
});

Deno.test("validateDayOfMonth: rejects day 0", () => {
  assertEquals(validateDayOfMonth(0).valid, false);
});

Deno.test("validateDayOfMonth: rejects day 32", () => {
  assertEquals(validateDayOfMonth(32).valid, false);
});

// --- validateGuests ---
Deno.test("validateGuests: accepts null (optional)", () => {
  assertEquals(validateGuests(null).valid, true);
});

Deno.test("validateGuests: accepts '80 pessoas'", () => {
  assertEquals(validateGuests("80 pessoas").valid, true);
});

Deno.test("validateGuests: rejects > 50 chars", () => {
  assertEquals(validateGuests("G".repeat(51)).valid, false);
});
