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