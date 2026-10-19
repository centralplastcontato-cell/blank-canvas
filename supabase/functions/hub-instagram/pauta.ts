import type { Publico, TipoPost } from "./catalogo.ts";

// Ritmo igual ao da Prospecta (mantido para a Celebrei em 19/10/2026), horário de Brasília:
// 1ª semana 3 posts/dia, 2ª semana 2/dia, depois 1/dia. A contagem das semanas começa no dia
// salvo em hub_instagram_config.inicio (gravado quando a automação é ligada pela primeira vez).
type Slot = { hora: string; tipo: TipoPost | "pergunta-ou-carrossel" | "rodizio" };

export const SEMANA_1: Slot[] = [
  { hora: "09:00", tipo: "foto" },
  { hora: "12:30", tipo: "pergunta-ou-carrossel" },
  { hora: "18:30", tipo: "foto" },
];
export const SEMANA_2: Slot[] = [
  { hora: "12:00", tipo: "pergunta-ou-carrossel" },
  { hora: "18:30", tipo: "foto" },
];
export const DEPOIS: Slot[] = [{ hora: "12:00", tipo: "rodizio" }];

/** Ordem do rodízio de 1 post por dia (a partir da 3ª semana). */
const RODIZIO: TipoPost[] = ["foto", "carrossel", "pergunta"];

export type Vaga = { vaga: Date; tipo: TipoPost; publico: Publico; ordem: number };

const DIA = 24 * 3600e3;
const BRASILIA = -3 * 3600e3;

/** "AAAA-MM-DD" de hoje em Brasília. */
export function hojeBrasilia(agora = new Date()) {
  return new Date(agora.getTime() + BRASILIA).toISOString().slice(0, 10);
}

function instante(dia: string, hora: string) {
  return new Date(`${dia}T${hora}:00-03:00`);
}

function somaDias(dia: string, n: number) {
  return new Date(new Date(`${dia}T12:00:00Z`).getTime() + n * DIA).toISOString().slice(0, 10);
}

function idadeDe(dia: string, inicio: string) {
  return Math.round((new Date(`${dia}T12:00:00Z`).getTime() - new Date(`${inicio}T12:00:00Z`).getTime()) / DIA);
}

export function slotsDoDia(idade: number): Slot[] {
  const i = Math.max(0, idade);
  return i < 7 ? SEMANA_1 : i < 14 ? SEMANA_2 : DEPOIS;
}

/** Quantos posts couberam nos dias antes deste (para alternar o público pela ordem). */
function postsAntes(idade: number) {
  let n = 0;
  for (let d = 0; d < Math.max(0, idade); d++) n += slotsDoDia(d).length;
  return n;
}

function tipoDoSlot(slot: Slot, idade: number): TipoPost {
  if (slot.tipo === "pergunta-ou-carrossel") return idade % 2 === 0 ? "carrossel" : "pergunta";
  if (slot.tipo === "rodizio") return RODIZIO[Math.max(0, idade) % RODIZIO.length];
  return slot.tipo;
}

/** Assunto pela ordem do post: 2 de vendas (atendimento, funil, visita) para 1 de gestão (agenda, contrato, festa). */
export function publicoDaOrdem(ordem: number): Publico {
  return ordem % 3 === 2 ? "gestao" : "vendas";
}

/**
 * Vagas dos próximos `dias` dias (contando hoje), só as que ainda estão a pelo
 * menos `folgaMin` minutos no futuro.
 */
export function vagasProximas(inicio: string, dias = 3, agora = new Date(), folgaMin = 45): Vaga[] {
  const hoje = hojeBrasilia(agora);
  const vagas: Vaga[] = [];
  for (let d = 0; d < dias; d++) {
    const dia = somaDias(hoje, d);
    const idade = idadeDe(dia, inicio);
    const antes = postsAntes(idade);
    slotsDoDia(idade).forEach((slot, i) => {
      const vaga = instante(dia, slot.hora);
      if (vaga.getTime() - agora.getTime() < folgaMin * 60e3) return;
      const ordem = antes + i;
      vagas.push({ vaga, tipo: tipoDoSlot(slot, idade), publico: publicoDaOrdem(ordem), ordem });
    });
  }
  return vagas;
}

/** ISO com o fuso de Brasília, como o Postaí pede ("2026-10-05T10:00:00-03:00"). */
export function horarioBrasilia(date: Date) {
  return new Date(date.getTime() + BRASILIA).toISOString().slice(0, 19) + "-03:00";
}

/** Horário do post de teste: daqui a `minutos`, arredondado para cima nos próximos 5 min. */
export function horarioDeTeste(agora = new Date(), minutos = 30) {
  const passo = 5 * 60e3;
  return new Date(Math.ceil((agora.getTime() + minutos * 60e3) / passo) * passo);
}

/** Texto do ritmo para o painel. */
export const RITMO_TEXTO = "3 por dia na 1ª semana, 2 na 2ª, depois 1 por dia";
