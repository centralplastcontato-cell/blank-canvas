import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";

// ===== Copied from wapi-webhook/index.ts for isolated testing =====

function emojiDigitsToNumber(text: string): number | null {
  if (text.includes('🔟')) return 10;
  const keycapPattern = /([\d])\uFE0F?\u20E3/g;
  let digits = '';
  let m: RegExpExecArray | null;
  while ((m = keycapPattern.exec(text)) !== null) {
    digits += m[1];
  }
  return digits ? parseInt(digits, 10) : null;
}

function extractOptionsFromQuestion(questionText: string): { num: number; value: string }[] | null {
  const lines = questionText.split('\n');
  const options: { num: number; value: string }[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^\*?(\d+)\*?\s*[-\.]\s*(.+)$/);
    if (match) {
      options.push({ num: parseInt(match[1]), value: match[2].trim() });
      continue;
    }
    const emojiNum = emojiDigitsToNumber(trimmed);
    if (emojiNum !== null) {
      const label = trimmed
        .replace(/🔟/g, '')
        .replace(/[\d]\uFE0F?\u20E3/g, '')
        .replace(/^\s*[-\.]\s*/, '')
        .trim();
      if (label) {
        options.push({ num: emojiNum, value: label });
      }
    }
  }
  return options.length > 0 ? options : null;
}

function numToKeycap(n: number): string {
  if (n === 10) return '🔟';
  return String(n).split('').map(d => `${d}\uFE0F\u20E3`).join('');
}

function buildMenuText(options: { num: number; value: string }[]): string {
  return options.map(opt => `${numToKeycap(opt.num)} - ${opt.value}`).join('\n');
}

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

function validateMenuChoice(input: string, options: { num: number; value: string }[], stepName: string): { valid: boolean; value?: string; error?: string } {
  const normalized = input.trim();
  const numMatch = normalized.match(/^(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    const option = options.find(opt => opt.num === num);
    if (option) return { valid: true, value: option.value };
  }
  const lower = normalized.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (lower.length >= 3) {
    for (const opt of options) {
      const optLower = opt.value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
      if (optLower === lower || optLower.includes(lower) || lower.includes(optLower)) {
        return { valid: true, value: opt.value };
      }
    }
  }
  const validNumbers = options.map(opt => opt.num).join(', ');
  return { valid: false, error: `Invalid choice for ${stepName}` };
}

const MONTH_OPTIONS = [
  { num: 1, value: 'Fevereiro' }, { num: 2, value: 'Março' }, { num: 3, value: 'Abril' },
  { num: 4, value: 'Maio' }, { num: 5, value: 'Junho' }, { num: 6, value: 'Julho' },
  { num: 7, value: 'Agosto' }, { num: 8, value: 'Setembro' }, { num: 9, value: 'Outubro' },
  { num: 10, value: 'Novembro' }, { num: 11, value: 'Dezembro' },
];

const TIPO_OPTIONS = [
  { num: 1, value: 'Já sou cliente' },
  { num: 2, value: 'Quero um orçamento' },
  { num: 3, value: 'Trabalhe Conosco' },
];

const PROXIMO_PASSO_OPTIONS = [
  { num: 1, value: 'Agendar visita' },
  { num: 2, value: 'Tirar dúvidas' },
  { num: 3, value: 'Analisar com calma' },
];

function validateAnswer(step: string, input: string, questionText?: string): { valid: boolean; value?: string; error?: string } {
  switch (step) {
    case 'nome': return validateName(input);
    case 'tipo': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateMenuChoice(input, customOptions || TIPO_OPTIONS, 'tipo');
    }
    case 'mes': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateMenuChoice(input, customOptions || MONTH_OPTIONS, 'mês');
    }
    case 'proximo_passo': {
      const customOptions = questionText ? extractOptionsFromQuestion(questionText) : null;
      return validateMenuChoice(input, customOptions || PROXIMO_PASSO_OPTIONS, 'próximo passo');
    }
    default: return { valid: true, value: input.trim() };
  }
}

// ===== Tests =====

// --- emojiDigitsToNumber ---
Deno.test("emojiDigitsToNumber: single keycap 2️⃣ → 2", () => {
  assertEquals(emojiDigitsToNumber("2\uFE0F\u20E3"), 2);
});

Deno.test("emojiDigitsToNumber: keycap 1️⃣2️⃣ → 12", () => {
  assertEquals(emojiDigitsToNumber("1\uFE0F\u20E32\uFE0F\u20E3"), 12);
});

Deno.test("emojiDigitsToNumber: 🔟 → 10", () => {
  assertEquals(emojiDigitsToNumber("🔟"), 10);
});

Deno.test("emojiDigitsToNumber: plain text → null", () => {
  assertEquals(emojiDigitsToNumber("hello"), null);
});

Deno.test("emojiDigitsToNumber: plain digit '3' → null", () => {
  assertEquals(emojiDigitsToNumber("3"), null);
});

// --- numToKeycap ---
Deno.test("numToKeycap: 1 → 1️⃣", () => {
  assertEquals(numToKeycap(1), "1\uFE0F\u20E3");
});

Deno.test("numToKeycap: 10 → 🔟", () => {
  assertEquals(numToKeycap(10), "🔟");
});

Deno.test("numToKeycap: 12 → 1️⃣2️⃣", () => {
  assertEquals(numToKeycap(12), "1\uFE0F\u20E32\uFE0F\u20E3");
});

// --- buildMenuText ---
Deno.test("buildMenuText: formats options correctly", () => {
  const opts = [{ num: 1, value: 'Opção A' }, { num: 2, value: 'Opção B' }];
  const result = buildMenuText(opts);
  assertEquals(result.includes('Opção A'), true);
  assertEquals(result.includes('Opção B'), true);
});

// --- extractOptionsFromQuestion ---
Deno.test("extractOptionsFromQuestion: parses '1 - Opção A'", () => {
  const text = "Escolha:\n1 - Opção A\n2 - Opção B";
  const opts = extractOptionsFromQuestion(text);
  assertEquals(opts?.length, 2);
  assertEquals(opts?.[0].num, 1);
  assertEquals(opts?.[0].value, "Opção A");
});

Deno.test("extractOptionsFromQuestion: parses '*1* - Opção A'", () => {
  const text = "*1* - Sim\n*2* - Não";
  const opts = extractOptionsFromQuestion(text);
  assertEquals(opts?.length, 2);
  assertEquals(opts?.[0].value, "Sim");
});

Deno.test("extractOptionsFromQuestion: returns null for no options", () => {
  assertEquals(extractOptionsFromQuestion("Just plain text"), null);
});

// --- validateName (bot version) ---
Deno.test("bot validateName: accepts 'Maria Clara'", () => {
  const r = validateName("Maria Clara");
  assertEquals(r.valid, true);
  assertEquals(r.value, "Maria Clara");
});

Deno.test("bot validateName: accepts 'meu nome é Victor'", () => {
  const r = validateName("meu nome é Victor");
  assertEquals(r.valid, true);
  assertEquals(r.value, "Victor");
});

Deno.test("bot validateName: accepts 'me chamo Ana'", () => {
  const r = validateName("me chamo Ana");
  assertEquals(r.valid, true);
  assertEquals(r.value, "Ana");
});

Deno.test("bot validateName: rejects 'Quero saber o valor'", () => {
  assertEquals(validateName("Quero saber o valor").valid, false);
});

Deno.test("bot validateName: rejects 'Vi no Instagram'", () => {
  assertEquals(validateName("Vi no Instagram").valid, false);
});

Deno.test("bot validateName: rejects 'Oi bom dia'", () => {
  assertEquals(validateName("Oi bom dia").valid, false);
});

Deno.test("bot validateName: rejects numbers in name", () => {
  assertEquals(validateName("Maria123").valid, false);
});

Deno.test("bot validateName: rejects single letter", () => {
  assertEquals(validateName("A").valid, false);
});

// --- validateMenuChoice ---
Deno.test("validateMenuChoice: accepts correct number '1'", () => {
  const r = validateMenuChoice("1", TIPO_OPTIONS, "tipo");
  assertEquals(r.valid, true);
  assertEquals(r.value, "Já sou cliente");
});

Deno.test("validateMenuChoice: accepts '2'", () => {
  const r = validateMenuChoice("2", TIPO_OPTIONS, "tipo");
  assertEquals(r.valid, true);
  assertEquals(r.value, "Quero um orçamento");
});

Deno.test("validateMenuChoice: accepts text 'cliente'", () => {
  const r = validateMenuChoice("cliente", TIPO_OPTIONS, "tipo");
  assertEquals(r.valid, true);
});

Deno.test("validateMenuChoice: rejects invalid number '9'", () => {
  assertEquals(validateMenuChoice("9", TIPO_OPTIONS, "tipo").valid, false);
});

Deno.test("validateMenuChoice: rejects gibberish 'xyz'", () => {
  assertEquals(validateMenuChoice("xyz", TIPO_OPTIONS, "tipo").valid, false);
});

// --- validateAnswer routing ---
Deno.test("validateAnswer: routes 'nome' step correctly", () => {
  const r = validateAnswer("nome", "Maria Clara");
  assertEquals(r.valid, true);
  assertEquals(r.value, "Maria Clara");
});

Deno.test("validateAnswer: routes 'tipo' step with number", () => {
  const r = validateAnswer("tipo", "2");
  assertEquals(r.valid, true);
  assertEquals(r.value, "Quero um orçamento");
});

Deno.test("validateAnswer: routes 'mes' step with number", () => {
  const r = validateAnswer("mes", "2");
  assertEquals(r.valid, true);
  assertEquals(r.value, "Março");
});

Deno.test("validateAnswer: routes 'proximo_passo' step", () => {
  const r = validateAnswer("proximo_passo", "1");
  assertEquals(r.valid, true);
  assertEquals(r.value, "Agendar visita");
});

Deno.test("validateAnswer: unknown step passes through", () => {
  const r = validateAnswer("unknown_step", "anything");
  assertEquals(r.valid, true);
  assertEquals(r.value, "anything");
});

Deno.test("validateAnswer: 'tipo' with custom question text", () => {
  const questionText = "Escolha:\n1 - Quero festa\n2 - Só orçamento";
  const r = validateAnswer("tipo", "1", questionText);
  assertEquals(r.valid, true);
  assertEquals(r.value, "Quero festa");
});
