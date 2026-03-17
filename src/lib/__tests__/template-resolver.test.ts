import { describe, it, expect } from 'vitest';
import {
  resolveSystemVariables,
  resolveFirstName,
  getAvailableVariables,
  type VariableContext,
} from '@/lib/template-resolver';

describe('resolveFirstName', () => {
  it('extracts first name', () => {
    expect(resolveFirstName('Maria Silva')).toBe('Maria');
  });
  it('handles single name', () => {
    expect(resolveFirstName('João')).toBe('João');
  });
  it('returns empty for null/undefined', () => {
    expect(resolveFirstName(null)).toBe('');
    expect(resolveFirstName(undefined)).toBe('');
    expect(resolveFirstName('')).toBe('');
    expect(resolveFirstName('   ')).toBe('');
  });
});

describe('resolveSystemVariables', () => {
  const baseCtx: VariableContext = {
    lead: { name: 'Maria Silva', month: 'Março', guests: '50', unit: 'Unidade 1' },
    company: { name: 'Castelo da Diversão' },
    visit: { date: '17/03/2026', time: '14:00' },
  };

  // --- Format compatibility ---

  it('resolves {var} format', () => {
    expect(resolveSystemVariables('Olá {nome}!', baseCtx)).toBe('Olá Maria!');
  });

  it('resolves {{var}} format', () => {
    expect(resolveSystemVariables('Olá {{nome}}!', baseCtx)).toBe('Olá Maria!');
  });

  it('resolves {{ var }} format with spaces', () => {
    expect(resolveSystemVariables('Olá {{ nome }}!', baseCtx)).toBe('Olá Maria!');
  });

  // --- Case insensitivity ---

  it('is case-insensitive by default', () => {
    expect(resolveSystemVariables('{Nome}', baseCtx)).toBe('Maria');
    expect(resolveSystemVariables('{NOME}', baseCtx)).toBe('Maria');
    expect(resolveSystemVariables('{{Empresa}}', baseCtx)).toBe('Castelo da Diversão');
  });

  it('respects caseSensitive option', () => {
    expect(resolveSystemVariables('{Nome}', baseCtx, { caseSensitive: true })).toBe('{Nome}');
    expect(resolveSystemVariables('{nome}', baseCtx, { caseSensitive: true })).toBe('Maria');
  });

  // --- Aliases ---

  it('resolves empresa aliases', () => {
    expect(resolveSystemVariables('{buffet}', baseCtx)).toBe('Castelo da Diversão');
    expect(resolveSystemVariables('{nome_empresa}', baseCtx)).toBe('Castelo da Diversão');
    expect(resolveSystemVariables('{nome-empresa}', baseCtx)).toBe('Castelo da Diversão');
    expect(resolveSystemVariables('{nome_buffet}', baseCtx)).toBe('Castelo da Diversão');
  });

  // --- Fallbacks ---

  it('uses fallback for empresa when not provided', () => {
    expect(resolveSystemVariables('{empresa}', {})).toBe('nosso buffet');
  });

  it('uses fallback for unidade when not provided', () => {
    expect(resolveSystemVariables('{unidade}', {})).toBe('nossa unidade');
  });

  it('uses fallback for hora_visita when not provided', () => {
    expect(resolveSystemVariables('{hora_visita}', {})).toBe('horário a confirmar');
  });

  it('uses fallback for nome when not provided', () => {
    expect(resolveSystemVariables('{nome}', {})).toBe('cliente');
  });

  // --- Multiple variables ---

  it('resolves multiple variables in one template', () => {
    const result = resolveSystemVariables(
      'Olá {nome}, sua visita na {empresa} está marcada para {data_visita} às {hora_visita}.',
      baseCtx,
    );
    expect(result).toBe(
      'Olá Maria, sua visita na Castelo da Diversão está marcada para 17/03/2026 às 14:00.',
    );
  });

  // --- Visit variables ---

  it('resolves visit variables', () => {
    expect(resolveSystemVariables('{data_visita}', baseCtx)).toBe('17/03/2026');
    expect(resolveSystemVariables('{hora_visita}', baseCtx)).toBe('14:00');
  });

  // --- Lead variables ---

  it('resolves lead variables', () => {
    expect(resolveSystemVariables('{mes}', baseCtx)).toBe('Março');
    expect(resolveSystemVariables('{convidados}', baseCtx)).toBe('50');
    expect(resolveSystemVariables('{unidade}', baseCtx)).toBe('Unidade 1');
  });

  // --- Custom context ---

  it('resolves custom variables with highest priority', () => {
    const ctx: VariableContext = {
      lead: { name: 'Ana' },
      custom: { nome: 'Override' },
    };
    expect(resolveSystemVariables('{nome}', ctx)).toBe('Override');
  });

  // --- Unresolved variables ---

  it('leaves unknown variables intact by default', () => {
    expect(resolveSystemVariables('{desconhecida}', baseCtx)).toBe('{desconhecida}');
  });

  it('replaces unknown variables with fallback when provided', () => {
    expect(
      resolveSystemVariables('{desconhecida}', baseCtx, { fallbackForUnknown: '' }),
    ).toBe('');
  });

  // --- Empty/null template ---

  it('handles empty template', () => {
    expect(resolveSystemVariables('', baseCtx)).toBe('');
  });

  it('handles template with no variables', () => {
    expect(resolveSystemVariables('Hello world', baseCtx)).toBe('Hello world');
  });

  // --- Contract variables ---

  it('resolves contract variables', () => {
    const ctx: VariableContext = {
      contract: {
        value: 'R$ 5.000,00',
        date: '20/03/2026',
        responsible_name: 'João Silva',
        cpf: '123.456.789-00',
      },
    };
    expect(resolveSystemVariables('{valor_contrato}', ctx)).toBe('R$ 5.000,00');
    expect(resolveSystemVariables('{nome_responsavel}', ctx)).toBe('João Silva');
    expect(resolveSystemVariables('{cpf}', ctx)).toBe('123.456.789-00');
    expect(resolveSystemVariables('{data_contrato}', ctx)).toBe('20/03/2026');
  });

  // --- Schedule variables ---

  it('resolves schedule variables', () => {
    const ctx: VariableContext = {
      schedule: {
        title: 'Escala Março',
        period: '01/03 a 31/03',
        event_count: 12,
        link: 'https://example.com',
        notes: 'Atenção ao horário',
        assigned_list: '• Ana - Monitora\n• João - Recreador',
      },
    };
    expect(resolveSystemVariables('{titulo}', ctx)).toBe('Escala Março');
    expect(resolveSystemVariables('{periodo}', ctx)).toBe('01/03 a 31/03');
    expect(resolveSystemVariables('{qtd_festas}', ctx)).toBe('12');
    expect(resolveSystemVariables('{link}', ctx)).toBe('https://example.com');
    expect(resolveSystemVariables('{lista_escalados}', ctx)).toBe('• Ana - Monitora\n• João - Recreador');
  });

  // --- Mixed formats in same template ---

  it('handles mixed formats in the same template', () => {
    const result = resolveSystemVariables(
      'Oi {nome}, bem-vinda ao {{empresa}}! Visita em {{ data_visita }}.',
      baseCtx,
    );
    expect(result).toBe('Oi Maria, bem-vinda ao Castelo da Diversão! Visita em 17/03/2026.');
  });
});

describe('getAvailableVariables', () => {
  it('returns catalog entries with domains', () => {
    const vars = getAvailableVariables();
    expect(vars.length).toBeGreaterThan(20);

    const empresa = vars.find((v) => v.key === 'empresa');
    expect(empresa).toBeDefined();
    expect(empresa!.domain).toBe('company');
    expect(empresa!.aliases).toContain('buffet');
    expect(empresa!.aliases).toContain('nome_empresa');
  });
});
