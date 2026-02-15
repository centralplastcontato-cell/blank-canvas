import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";

// Copy of validateName for isolated testing
function validateName(input: string): { valid: boolean; value?: string; error?: string } {
  let name = input.trim();
  const namePatterns = [
    /^(?:(?:o\s+)?meu\s+nome\s+(?:é|e)\s+)(.+)/i,
    /^(?:me\s+chamo\s+)(.+)/i,
    /^(?:(?:eu\s+)?sou\s+(?:o|a)\s+)(.+)/i,
    /^(?:pode\s+me\s+chamar\s+(?:de\s+)?)(.+)/i,
    /^(?:é\s+)(.+)/i,
    /^(?:nome:?\s+)(.+)/i,
  ];
  for (const pattern of namePatterns) {
    const match = name.match(pattern);
    if (match && match[1]) { name = match[1].trim(); break; }
  }
  if (name.length < 2) return { valid: false, error: 'too short' };
  if (!/^[\p{L}\s'-]+$/u.test(name)) return { valid: false, error: 'invalid chars' };
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 5) return { valid: false, error: 'too many words' };
  const nonNameWords = [
    'que', 'tem', 'como', 'quero', 'queria', 'gostaria', 'preciso',
    'vi', 'vou', 'estou', 'tenho', 'pode', 'posso', 'sobre',
    'instagram', 'facebook', 'whatsapp', 'site', 'promoção', 'promocao',
    'preço', 'preco', 'valor', 'orçamento', 'orcamento',
    'festa', 'evento', 'buffet', 'aniversário', 'aniversario',
    'obrigado', 'obrigada', 'por favor', 'bom dia', 'boa tarde', 'boa noite',
    'olá', 'ola', 'oi', 'hey', 'hello',
  ];
  const lowerName = name.toLowerCase();
  const hasNonNameWord = nonNameWords.some(w => {
    const regex = new RegExp(`\\b${w}\\b`, 'i');
    return regex.test(lowerName);
  });
  if (hasNonNameWord) return { valid: false, error: 'non-name word' };
  name = name.replace(/\b\w/g, (c) => c.toUpperCase());
  return { valid: true, value: name };
}

// === SHOULD REJECT ===
Deno.test("rejects: 'Vi que tem promoção no Instagram'", () => {
  const r = validateName("Vi que tem promoção no Instagram");
  assertEquals(r.valid, false);
});

Deno.test("rejects: 'Quero saber o valor'", () => {
  const r = validateName("Quero saber o valor");
  assertEquals(r.valid, false);
});

Deno.test("rejects: 'Oi bom dia'", () => {
  const r = validateName("Oi bom dia");
  assertEquals(r.valid, false);
});

Deno.test("rejects: 'Olá tenho interesse'", () => {
  const r = validateName("Olá tenho interesse");
  assertEquals(r.valid, false);
});

Deno.test("rejects: 'Vi no instagram sobre o buffet'", () => {
  const r = validateName("Vi no instagram sobre o buffet");
  assertEquals(r.valid, false);
});

Deno.test("rejects: 'Quanto custa uma festa de aniversário'", () => {
  const r = validateName("Quanto custa uma festa de aniversário");
  assertEquals(r.valid, false);
});

// === SHOULD ACCEPT ===
Deno.test("accepts: 'Maria Clara'", () => {
  const r = validateName("Maria Clara");
  assertEquals(r.valid, true);
  assertEquals(r.value, "Maria Clara");
});

Deno.test("accepts: 'João Pedro'", () => {
  const r = validateName("João Pedro");
  assertEquals(r.valid, true);
});

Deno.test("accepts: 'Ana'", () => {
  const r = validateName("Ana");
  assertEquals(r.valid, true);
});

Deno.test("accepts: 'Valentina'", () => {
  const r = validateName("Valentina");
  assertEquals(r.valid, true);
});

Deno.test("accepts: 'Maria Luísa dos Santos'", () => {
  const r = validateName("Maria Luísa dos Santos");
  assertEquals(r.valid, true);
});

Deno.test("accepts: 'meu nome é Victor'", () => {
  const r = validateName("meu nome é Victor");
  assertEquals(r.valid, true);
  assertEquals(r.value, "Victor");
});

Deno.test("accepts: 'Amanda Tagawa'", () => {
  const r = validateName("Amanda Tagawa");
  assertEquals(r.valid, true);
});
