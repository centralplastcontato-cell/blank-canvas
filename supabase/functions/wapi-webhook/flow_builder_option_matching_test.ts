import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";

function normalizeChoiceText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchFlowOptionByReply<T extends { label?: string | null; value?: string | null }>(
  input: string,
  options: T[],
): T | null {
  const normalizedInput = normalizeChoiceText(input);
  if (!normalizedInput) return null;

  for (const option of options) {
    const candidates = [option.label, option.value]
      .filter((candidate): candidate is string => Boolean(candidate?.trim()))
      .map((candidate) => normalizeChoiceText(candidate));

    if (candidates.some((candidate) => (
      candidate === normalizedInput ||
      candidate.includes(normalizedInput) ||
      normalizedInput.includes(candidate)
    ))) {
      return option;
    }
  }

  return null;
}

const OPTIONS = [
  { id: '1', label: 'Já sou cliente.', value: 'ja_sou_cliente' },
  { id: '2', label: 'Quero um orçamento.', value: 'quero_orcamento' },
  { id: '3', label: 'Trabalhe conosco.', value: 'trabalhe_conosco' },
];

function getFirstString(values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function extractZapiInteractiveText(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'string') return value.trim();

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractZapiInteractiveText(item);
      if (text) return text;
    }
    return '';
  }

  if (typeof value !== 'object') return '';

  const record = value as Record<string, unknown>;

  const directText = getFirstString([
    record.selectedDisplayText,
    record.selectedButtonText,
    record.displayText,
    record.buttonText,
    record.selectedText,
    record.title,
    record.description,
    record.text,
    record.label,
    record.name,
    record.rowTitle,
    record.optionTitle,
    record.selectedRowTitle,
    record.selectedOptionTitle,
    record.replyTitle,
    record.replyText,
  ]);

  if (directText) return directText;

  const nestedCandidates = [
    record.buttonReply,
    record.selectedButton,
    record.selectedOption,
    record.singleSelectReply,
    record.listResponse,
    record.listReply,
    record.option,
    record.reply,
    record.response,
    record.nativeFlowResponseMessage,
  ];

  for (const candidate of nestedCandidates) {
    const text = extractZapiInteractiveText(candidate);
    if (text) return text;
  }

  return '';
}

Deno.test('matchFlowOptionByReply matches button label text with punctuation', () => {
  const result = matchFlowOptionByReply('Quero um orçamento.', OPTIONS);
  assertEquals(result?.id, '2');
});

Deno.test('matchFlowOptionByReply matches button label text without accent', () => {
  const result = matchFlowOptionByReply('Quero um orcamento', OPTIONS);
  assertEquals(result?.id, '2');
});

Deno.test('matchFlowOptionByReply matches stored option value', () => {
  const result = matchFlowOptionByReply('quero_orcamento', OPTIONS);
  assertEquals(result?.id, '2');
});

Deno.test('matchFlowOptionByReply matches partial user reply', () => {
  const result = matchFlowOptionByReply('sou cliente', OPTIONS);
  assertEquals(result?.id, '1');
});

Deno.test('matchFlowOptionByReply returns null for unrelated text', () => {
  const result = matchFlowOptionByReply('banana azul', OPTIONS);
  assertEquals(result, null);
});

Deno.test('extractZapiInteractiveText prioritizes visible button text over id', () => {
  const result = extractZapiInteractiveText({
    selectedButtonId: '2',
    selectedDisplayText: 'Quero um orçamento',
  });

  assertEquals(result, 'Quero um orçamento');
});

Deno.test('extractZapiInteractiveText supports buttonReply payloads', () => {
  const result = extractZapiInteractiveText({
    buttonReply: {
      id: '2',
      displayText: 'Quero um orçamento',
    },
  });

  assertEquals(result, 'Quero um orçamento');
});

Deno.test('extractZapiInteractiveText supports list singleSelectReply payloads', () => {
  const result = extractZapiInteractiveText({
    singleSelectReply: {
      selectedRowId: '2',
      title: 'Quero um orçamento',
    },
  });

  assertEquals(result, 'Quero um orçamento');
});