import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Type, Save, X, LayoutTemplate, Move, ALargeSmall, Square, Eye, Maximize2, Sparkles, GripVertical, Sun, Contrast, Moon, Smile, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ── Types ──────────────────────────────────────────────── */

type TemplateId = "oferta" | "escassez" | "sazonal" | "minimalista" | "neon";
type PositionY = "top" | "center" | "bottom";
type PositionX = "left" | "center" | "right";

interface TextLayer {
  id: string;
  label: string;
  content: string;
  placeholder: string;
  fontSize: number;
  fontFamily: string;
  color: string;           // per-layer text color
  customY?: number;
  customX?: number;
  shadowEnabled?: boolean;
  shadowIntensity?: number;
}

interface Sticker {
  id: string;
  emoji: string;
  x: number;   // 0-1 ratio
  y: number;   // 0-1 ratio
  size: number; // 20-120 px on canvas
}

interface TemplateConfig {
  id: TemplateId;
  label: string;
  description: string;
  layers: TextLayer[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onSave: (finalUrl: string) => void;
  companyId: string;
  campaignType?: string;
}

type TextPreset = { title: string; subtitle: string; cta: string };

const CAMPAIGN_PRESETS: Record<string, TextPreset[]> = {
  "Esquenta de Carnaval": [
    { title: "ESQUENTA DE CARNAVAL", subtitle: "Descontos especiais para sua festa!", cta: "GARANTA SUA VAGA" },
    { title: "CARNAVAL ANTECIPADO", subtitle: "Festa com preço especial de carnaval!", cta: "RESERVE AGORA" },
    { title: "PRÉ-CARNAVAL", subtitle: "Comece a folia com desconto!", cta: "APROVEITE JÁ" },
    { title: "FOLIA GARANTIDA", subtitle: "Pacotes promocionais de carnaval!", cta: "CONFIRA" },
    { title: "CARNAVAL NO BUFFET", subtitle: "A diversão começa aqui!", cta: "AGENDE SUA FESTA" },
  ],
  "Volta às Aulas": [
    { title: "VOLTA ÀS AULAS", subtitle: "Celebre o novo ciclo com diversão!", cta: "RESERVE AGORA" },
    { title: "ANO NOVO, FESTA NOVA", subtitle: "Comece o ano festejando!", cta: "GARANTA SUA DATA" },
    { title: "ESPECIAL VOLTA ÀS AULAS", subtitle: "Descontos para começar bem o ano!", cta: "APROVEITE" },
    { title: "PROMOÇÃO ESCOLAR", subtitle: "Festas com preços especiais!", cta: "AGENDE JÁ" },
    { title: "NOVO CICLO", subtitle: "Uma festa para celebrar o recomeço!", cta: "CONFIRA" },
  ],
  "Dia das Mães": [
    { title: "ESPECIAL DIA DAS MÃES", subtitle: "Uma festa inesquecível para as mamães!", cta: "AGENDE JÁ" },
    { title: "MAMÃE MERECE", subtitle: "Comemore com quem mais ama!", cta: "RESERVE AGORA" },
    { title: "FESTA DAS MÃES", subtitle: "O presente perfeito é uma festa!", cta: "GARANTA SUA VAGA" },
    { title: "MÃE, EU TE AMO", subtitle: "Surpreenda com uma festa especial!", cta: "APROVEITE" },
    { title: "HOMENAGEM ÀS MÃES", subtitle: "Descontos exclusivos neste mês!", cta: "CONFIRA" },
  ],
  "Dia dos Pais": [
    { title: "ESPECIAL DIA DOS PAIS", subtitle: "Comemore com quem você ama!", cta: "GARANTA SUA DATA" },
    { title: "PAPAI MERECE", subtitle: "Uma festa para o melhor pai!", cta: "RESERVE AGORA" },
    { title: "FESTA DOS PAIS", subtitle: "Celebre em grande estilo!", cta: "AGENDE JÁ" },
    { title: "SUPER PAI", subtitle: "Descontos imperdíveis para papai!", cta: "APROVEITE" },
    { title: "PAI HERÓI", subtitle: "O presente que ele merece!", cta: "CONFIRA" },
  ],
  "Férias de Julho": [
    { title: "FÉRIAS DE JULHO", subtitle: "Diversão garantida para toda família!", cta: "RESERVE AGORA" },
    { title: "FÉRIAS NO BUFFET", subtitle: "A melhor diversão das férias!", cta: "GARANTA SUA VAGA" },
    { title: "JULHO DIVERTIDO", subtitle: "Pacotes especiais de férias!", cta: "APROVEITE JÁ" },
    { title: "ESPECIAL FÉRIAS", subtitle: "Preços imperdíveis neste julho!", cta: "CONFIRA" },
    { title: "DIVERSÃO DE FÉRIAS", subtitle: "As crianças merecem festejar!", cta: "AGENDE AGORA" },
  ],
  "Mês das Crianças": [
    { title: "MÊS DAS CRIANÇAS", subtitle: "O mês mais divertido do ano!", cta: "APROVEITE" },
    { title: "OUTUBRO MÁGICO", subtitle: "Festas com preços especiais!", cta: "RESERVE AGORA" },
    { title: "DIA DAS CRIANÇAS", subtitle: "O melhor presente é diversão!", cta: "GARANTA JÁ" },
    { title: "FESTA DA CRIANÇADA", subtitle: "Descontos exclusivos de outubro!", cta: "AGENDE JÁ" },
    { title: "FELIZ DIA DAS CRIANÇAS", subtitle: "Uma festa inesquecível!", cta: "CONFIRA" },
  ],
  "Black Friday": [
    { title: "BLACK FRIDAY", subtitle: "Os melhores preços do ano!", cta: "GARANTA JÁ" },
    { title: "BLACK FRIDAY KIDS", subtitle: "Descontos de até 30%!", cta: "APROVEITE AGORA" },
    { title: "MEGA BLACK FRIDAY", subtitle: "Oportunidade única para festejar!", cta: "RESERVE AGORA" },
    { title: "FRIDAY ESPECIAL", subtitle: "Pacotes com preços imbatíveis!", cta: "CONFIRA" },
    { title: "BLACK NOVEMBER", subtitle: "O mês inteiro de ofertas!", cta: "NÃO PERCA" },
  ],
  "Natal Mágico": [
    { title: "NATAL MÁGICO", subtitle: "A magia do Natal na sua festa!", cta: "RESERVE SUA DATA" },
    { title: "FELIZ NATAL", subtitle: "Festas encantadas de fim de ano!", cta: "AGENDE JÁ" },
    { title: "NATAL ENCANTADO", subtitle: "Celebre com diversão e magia!", cta: "GARANTA SUA VAGA" },
    { title: "ESPECIAL DE NATAL", subtitle: "Pacotes natalinos imperdíveis!", cta: "APROVEITE" },
    { title: "NOITE FELIZ", subtitle: "A festa mais mágica do ano!", cta: "CONFIRA" },
  ],
  "Promoção de Natal": [
    { title: "PROMOÇÃO DE NATAL", subtitle: "Descontos especiais de fim de ano!", cta: "APROVEITE AGORA" },
    { title: "NATAL COM DESCONTO", subtitle: "Preços especiais para sua festa!", cta: "RESERVE AGORA" },
    { title: "OFERTA NATALINA", subtitle: "Condições exclusivas de dezembro!", cta: "GARANTA JÁ" },
    { title: "PROMO DE NATAL", subtitle: "As melhores ofertas do ano!", cta: "CONFIRA" },
    { title: "PRESENTE DE NATAL", subtitle: "Desconto que é presente!", cta: "AGENDE AGORA" },
  ],
  "Liquidação de Verão": [
    { title: "LIQUIDAÇÃO DE VERÃO", subtitle: "Os melhores preços da temporada!", cta: "CONFIRA" },
    { title: "VERÃO COM DESCONTO", subtitle: "Festas refrescantes a preços quentes!", cta: "APROVEITE" },
    { title: "SUPER VERÃO", subtitle: "Pacotes promocionais de verão!", cta: "RESERVE AGORA" },
    { title: "FÉRIAS DE VERÃO", subtitle: "Diversão garantida com desconto!", cta: "GARANTA JÁ" },
    { title: "PROMOÇÃO VERÃO", subtitle: "Condições imperdíveis!", cta: "AGENDE JÁ" },
  ],
  "Especial Primavera": [
    { title: "ESPECIAL PRIMAVERA", subtitle: "Festas floridas com preços especiais!", cta: "RESERVE JÁ" },
    { title: "PRIMAVERA EM FESTA", subtitle: "A estação mais colorida do ano!", cta: "GARANTA SUA DATA" },
    { title: "FLORES E FESTAS", subtitle: "Celebre com descontos de primavera!", cta: "APROVEITE" },
    { title: "PROMOÇÃO PRIMAVERA", subtitle: "Pacotes especiais da estação!", cta: "CONFIRA" },
    { title: "PRIMAVERA KIDS", subtitle: "Diversão que floresce!", cta: "AGENDE AGORA" },
  ],
  "Feriado Prolongado": [
    { title: "FERIADO PROLONGADO", subtitle: "Aproveite o feriado para festejar!", cta: "GARANTA SUA VAGA" },
    { title: "FERIADÃO DE FESTA", subtitle: "Diversão garantida no feriado!", cta: "RESERVE AGORA" },
    { title: "ESPECIAL FERIADO", subtitle: "Pacotes promocionais para o feriado!", cta: "APROVEITE" },
    { title: "FESTÃO NO FERIADO", subtitle: "As melhores datas estão acabando!", cta: "GARANTA JÁ" },
    { title: "PROMO FERIADO", subtitle: "Não perca essa oportunidade!", cta: "AGENDE AGORA" },
  ],
  "Mês do Consumidor": [
    { title: "MÊS DO CONSUMIDOR", subtitle: "Condições exclusivas para você!", cta: "APROVEITE" },
    { title: "SEMANA DO CONSUMIDOR", subtitle: "Descontos especiais de março!", cta: "GARANTA JÁ" },
    { title: "ESPECIAL CONSUMIDOR", subtitle: "Ofertas imperdíveis para sua festa!", cta: "RESERVE AGORA" },
    { title: "CONSUMIDOR VIP", subtitle: "Você merece o melhor preço!", cta: "CONFIRA" },
    { title: "PROMO MARÇO", subtitle: "O mês do consumidor no buffet!", cta: "AGENDE JÁ" },
  ],
  "Semana do Cliente": [
    { title: "SEMANA DO CLIENTE", subtitle: "Ofertas especiais só esta semana!", cta: "RESERVE AGORA" },
    { title: "CLIENTE ESPECIAL", subtitle: "Descontos exclusivos para você!", cta: "GARANTA JÁ" },
    { title: "VOCÊ MERECE", subtitle: "Condições únicas esta semana!", cta: "APROVEITE" },
    { title: "ESPECIAL CLIENTES", subtitle: "Uma semana de ofertas incríveis!", cta: "CONFIRA" },
    { title: "VIP DA SEMANA", subtitle: "Preços especiais por tempo limitado!", cta: "AGENDE AGORA" },
  ],
  "Promo Aniversário": [
    { title: "ANIVERSÁRIO DO BUFFET", subtitle: "Comemore com a gente com descontos!", cta: "GARANTA JÁ" },
    { title: "NIVER DO BUFFET", subtitle: "Quem ganha o presente é você!", cta: "APROVEITE" },
    { title: "ANIVERSÁRIO ESPECIAL", subtitle: "Festejamos juntos com descontos!", cta: "RESERVE AGORA" },
    { title: "PARABÉNS PRA NÓS", subtitle: "O presente é para você!", cta: "CONFIRA" },
    { title: "FESTA DE ANIVERSÁRIO", subtitle: "Descontos de aniversário do buffet!", cta: "AGENDE JÁ" },
  ],
  "Super Promoção": [
    { title: "SUPER PROMOÇÃO", subtitle: "Condições imperdíveis por tempo limitado!", cta: "NÃO PERCA" },
    { title: "MEGA PROMOÇÃO", subtitle: "Os melhores preços que você já viu!", cta: "GARANTA JÁ" },
    { title: "PROMOÇÃO IMPERDÍVEL", subtitle: "Desconto especial para sua festa!", cta: "APROVEITE AGORA" },
    { title: "OFERTA ESPECIAL", subtitle: "Condições únicas para você!", cta: "RESERVE AGORA" },
    { title: "PROMO RELÂMPAGO", subtitle: "Só hoje com preço especial!", cta: "CONFIRA" },
  ],
  "Festival de Descontos": [
    { title: "FESTIVAL DE DESCONTOS", subtitle: "Até 15% OFF em pacotes selecionados!", cta: "CONFIRA AGORA" },
    { title: "MEGA FESTIVAL", subtitle: "Descontos de até 20% em tudo!", cta: "GARANTA JÁ" },
    { title: "FESTIVAL KIDS", subtitle: "Pacotes com preços imbatíveis!", cta: "APROVEITE" },
    { title: "DESCONTÃO", subtitle: "As melhores ofertas do mês!", cta: "RESERVE AGORA" },
    { title: "FESTIVAL DE OFERTAS", subtitle: "Condições exclusivas!", cta: "AGENDE JÁ" },
  ],
  "Oportunidade Relâmpago": [
    { title: "OPORTUNIDADE RELÂMPAGO", subtitle: "Vagas limitadas com desconto!", cta: "FECHE AGORA" },
    { title: "FLASH SALE", subtitle: "Oferta por tempo limitado!", cta: "GARANTA JÁ" },
    { title: "OFERTA RELÂMPAGO", subtitle: "Desconto exclusivo hoje!", cta: "APROVEITE" },
    { title: "ÚLTIMAS HORAS", subtitle: "Preço especial acabando!", cta: "NÃO PERCA" },
    { title: "CORRA!", subtitle: "Poucas vagas com desconto!", cta: "RESERVE AGORA" },
  ],
  "Últimos Contratos": [
    { title: "ÚLTIMOS CONTRATOS", subtitle: "Poucas vagas restantes no mês!", cta: "GARANTA A SUA" },
    { title: "VAGAS ACABANDO", subtitle: "Não fique de fora!", cta: "RESERVE AGORA" },
    { title: "RESTAM POUCAS", subtitle: "Últimas oportunidades do mês!", cta: "FECHE AGORA" },
    { title: "CORRA QUE ACABA", subtitle: "Agenda quase lotada!", cta: "GARANTA JÁ" },
    { title: "ÚLTIMA CHANCE", subtitle: "Restam poucas datas disponíveis!", cta: "APROVEITE" },
  ],
  "Última Chance": [
    { title: "ÚLTIMA CHANCE", subtitle: "Antes do reajuste de preços!", cta: "APROVEITE AGORA" },
    { title: "ÚLTIMOS DIAS", subtitle: "Preço antigo só até amanhã!", cta: "GARANTA JÁ" },
    { title: "NÃO PERCA", subtitle: "Última oportunidade com desconto!", cta: "RESERVE AGORA" },
    { title: "AVISO FINAL", subtitle: "Depois não tem mais esse preço!", cta: "FECHE AGORA" },
    { title: "ATENÇÃO!", subtitle: "Preços vão subir, aproveite agora!", cta: "CONFIRA" },
  ],
  "Queima de Estoque": [
    { title: "QUEIMA DE DATAS", subtitle: "Descontos agressivos para fechar!", cta: "CONFIRA" },
    { title: "QUEIMÃO DE DATAS", subtitle: "Preços que você nunca viu!", cta: "GARANTA JÁ" },
    { title: "LIQUIDAÇÃO TOTAL", subtitle: "Tudo com desconto para fechar!", cta: "APROVEITE" },
    { title: "DATAS EM PROMOÇÃO", subtitle: "Pacotes com preço de custo!", cta: "RESERVE AGORA" },
    { title: "MEGA QUEIMA", subtitle: "Descontos de até 25%!", cta: "AGENDE JÁ" },
  ],
  "Fecha em 25": [
    { title: "FECHA EM R$25", subtitle: "Entrada especial por convidado!", cta: "SAIBA MAIS" },
    { title: "R$25 POR PESSOA", subtitle: "Pacote completo a partir de R$25!", cta: "GARANTA JÁ" },
    { title: "A PARTIR DE R$25", subtitle: "O melhor custo-benefício!", cta: "RESERVE AGORA" },
    { title: "OFERTA R$25", subtitle: "Festa completa por convidado!", cta: "CONFIRA" },
    { title: "SÓ R$25", subtitle: "Preço imbatível por pessoa!", cta: "APROVEITE" },
  ],
  "Lote Promocional": [
    { title: "LOTE PROMOCIONAL", subtitle: "Vagas limitadas com desconto!", cta: "GARANTA JÁ" },
    { title: "1º LOTE", subtitle: "Preços do primeiro lote!", cta: "RESERVE AGORA" },
    { title: "LOTE ESPECIAL", subtitle: "Condições exclusivas deste lote!", cta: "APROVEITE" },
    { title: "ÚLTIMO LOTE", subtitle: "Não perca o lote promocional!", cta: "FECHE AGORA" },
    { title: "LOTE VIP", subtitle: "Pacote premium com desconto!", cta: "CONFIRA" },
  ],
  "Convite Especial": [
    { title: "CONVITE ESPECIAL", subtitle: "Uma oferta exclusiva para você!", cta: "AGENDE SUA VISITA" },
    { title: "VOCÊ FOI CONVIDADO", subtitle: "Venha conhecer nosso espaço!", cta: "AGENDE AGORA" },
    { title: "CONVITE VIP", subtitle: "Condição especial para convidados!", cta: "RESERVE SUA DATA" },
    { title: "EXCLUSIVO PARA VOCÊ", subtitle: "Um convite que não pode recusar!", cta: "CONFIRA" },
    { title: "VENHA NOS VISITAR", subtitle: "Descubra o espaço perfeito!", cta: "AGENDE JÁ" },
  ],
  "Reativação de Leads": [
    { title: "OFERTA EXCLUSIVA", subtitle: "Voltamos com uma proposta especial!", cta: "ENTRE EM CONTATO" },
    { title: "SENTIMOS SUA FALTA", subtitle: "Preparamos algo especial!", cta: "FALE CONOSCO" },
    { title: "VOLTAMOS!", subtitle: "Uma nova proposta para você!", cta: "CONFIRA AGORA" },
    { title: "PROPOSTA ESPECIAL", subtitle: "Condições melhores que antes!", cta: "GARANTA JÁ" },
    { title: "SEGUNDA CHANCE", subtitle: "Desconto exclusivo de reativação!", cta: "APROVEITE" },
  ],
};

/* ── Constants ──────────────────────────────────────────── */

const CANVAS_SIZE = 1080;
const DPR = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
const MAX_STICKERS = 5;

const COLOR_PRESETS = [
  { value: "#FFFFFF", label: "Branco" },
  { value: "#FF3333", label: "Vermelho" },
  { value: "#FF6B00", label: "Laranja" },
  { value: "#FFD700", label: "Amarelo" },
  { value: "#00CC66", label: "Verde" },
  { value: "#00CED1", label: "Turquesa" },
  { value: "#3399FF", label: "Azul" },
  { value: "#1E3A8A", label: "Azul Escuro" },
  { value: "#9B59B6", label: "Roxo" },
  { value: "#FF69B4", label: "Rosa" },
  { value: "#000000", label: "Preto" },
  { value: "#C0C0C0", label: "Prata" },
];

const FONT_OPTIONS = [
  { value: "Montserrat", label: "Montserrat" },
  { value: "Bebas Neue", label: "Bebas Neue" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Oswald", label: "Oswald" },
  { value: "Dancing Script", label: "Dancing Script" },
  { value: "Permanent Marker", label: "Permanent Marker" },
  { value: "Poppins", label: "Poppins" },
  { value: "Roboto Condensed", label: "Roboto Condensed" },
  { value: "Arial Black", label: "Arial Black" },
  { value: "Georgia", label: "Georgia" },
  { value: "Impact", label: "Impact" },
];

const POSITION_OPTIONS: { value: PositionY; label: string }[] = [
  { value: "top", label: "Topo" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Base" },
];

const POSITION_X_OPTIONS: { value: PositionX; label: string }[] = [
  { value: "left", label: "Esquerda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Direita" },
];

const POS_X_MAP: Record<PositionX, number> = {
  left: 0.25,
  center: 0.5,
  right: 0.75,
};

const FONT_RANGES: Record<string, [number, number]> = {
  title: [40, 140],
  subtitle: [28, 80],
  cta: [24, 60],
};

function layerFontPx(layerId: string, sliderVal: number): number {
  const [min, max] = FONT_RANGES[layerId] ?? [28, 80];
  return Math.round(min + (sliderVal / 100) * (max - min));
}

const DEFAULT_LAYER_COLORS: Record<string, string> = {
  title: "#FFFFFF",
  subtitle: "#FFFFFF",
  cta: "#00CED1",
};

const defaultLayer = (id: string, label: string, placeholder: string, defaultSize = 50): TextLayer => ({
  id, label, content: "", placeholder, fontSize: defaultSize, fontFamily: "Montserrat", color: DEFAULT_LAYER_COLORS[id] ?? "#FFFFFF", shadowEnabled: true, shadowIntensity: 50,
});

const TEMPLATES: TemplateConfig[] = [
  {
    id: "oferta",
    label: "Oferta Forte",
    description: "Gradiente + CTA botão",
    layers: [
      defaultLayer("title", "Título", "PROMOÇÃO ESPECIAL", 55),
      defaultLayer("subtitle", "Subtítulo", "Até 20% OFF em todos os pacotes", 50),
      defaultLayer("cta", "Botão CTA", "GARANTA SUA VAGA", 50),
    ],
  },
  {
    id: "escassez",
    label: "Escassez",
    description: "Card central + validade",
    layers: [
      defaultLayer("title", "Título", "ÚLTIMAS VAGAS", 55),
      defaultLayer("subtitle", "Subtítulo", "Apenas 3 datas disponíveis em Abril", 50),
      defaultLayer("cta", "Validade", "Válido até 30/04", 50),
    ],
  },
  {
    id: "sazonal",
    label: "Sazonal",
    description: "Título topo + botão inferior",
    layers: [
      defaultLayer("title", "Título", "FÉRIAS DE JULHO", 55),
      defaultLayer("subtitle", "Subtítulo", "Diversão garantida para toda família", 50),
      defaultLayer("cta", "Botão CTA", "RESERVE AGORA", 50),
    ],
  },
  {
    id: "minimalista",
    label: "Minimalista",
    description: "Clean, sem gradiente",
    layers: [
      defaultLayer("title", "Título", "PROMOÇÃO ESPECIAL", 55),
      defaultLayer("subtitle", "Subtítulo", "Condições exclusivas para você", 50),
      defaultLayer("cta", "Botão CTA", "SAIBA MAIS", 50),
    ],
  },
  {
    id: "neon",
    label: "Neon",
    description: "Brilho colorido futurista",
    layers: [
      defaultLayer("title", "Título", "MEGA PROMOÇÃO", 55),
      defaultLayer("subtitle", "Subtítulo", "Oferta por tempo limitado!", 50),
      defaultLayer("cta", "Botão CTA", "GARANTA JÁ", 50),
    ],
  },
];

/* ── Sticker emoji library ──────────────────────────────── */

const STICKER_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: "Festa", emojis: ["🎈", "🎉", "🎊", "🎁", "🎂", "🧁"] },
  { label: "Decoração", emojis: ["⭐", "🌟", "✨", "💫", "🎀", "🎯"] },
  { label: "Corações", emojis: ["❤️", "💛", "💜", "🩷", "🧡"] },
  { label: "Natureza", emojis: ["🌺", "🌈", "☀️", "🦋"] },
];

/* ── Drawing helpers ────────────────────────────────────── */

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTextWithShadow(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  color: string, strokeColor = "rgba(0,0,0,0.6)", strokeWidth = 2,
  layer?: TextLayer
) {
  ctx.save();
  const shadowOn = layer?.shadowEnabled !== false;
  const intensity = (layer?.shadowIntensity ?? 50) / 100;
  if (shadowOn) {
    ctx.shadowColor = `rgba(0,0,0,${(0.5 * intensity).toFixed(2)})`;
    ctx.shadowBlur = 8 * intensity;
    ctx.shadowOffsetX = 2 * intensity;
    ctx.shadowOffsetY = 2 * intensity;
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.strokeText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawNeonText(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  color: string, glowColor: string, layer?: TextLayer
) {
  ctx.save();
  const intensity = (layer?.shadowIntensity ?? 70) / 100;
  for (let i = 3; i >= 1; i--) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = (20 * i) * intensity;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = i === 1 ? color : "transparent";
    ctx.fillText(text, x, y);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawCTAButton(
  ctx: CanvasRenderingContext2D, text: string, centerX: number, centerY: number,
  bgColor: string, textColor: string, fontSize: number, fontFamily: string
) {
  const font = `bold ${fontSize}px ${fontFamily}, sans-serif`;
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const paddingH = 40;
  const paddingV = 22;
  const btnW = metrics.width + paddingH * 2;
  const btnH = fontSize + paddingV * 2;
  const btnX = centerX - btnW / 2;
  const btnY = centerY - btnH / 2;
  const radius = 18;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = bgColor;
  drawRoundedRect(ctx, btnX, btnY, btnW, btnH, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = textColor;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, centerX, centerY + 2);
}

function drawGradientOverlay(ctx: CanvasRenderingContext2D, size: number, position: "top" | "bottom" | "both") {
  if (position === "top" || position === "both") {
    const grad = ctx.createLinearGradient(0, 0, 0, size * 0.45);
    grad.addColorStop(0, "rgba(0,0,0,0.75)");
    grad.addColorStop(0.6, "rgba(0,0,0,0.25)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size * 0.45);
  }
  if (position === "bottom" || position === "both") {
    const grad = ctx.createLinearGradient(0, size * 0.55, 0, size);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.4, "rgba(0,0,0,0.25)");
    grad.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, size * 0.55, size, size * 0.45);
  }
}

/* ── Y position map ──────────────────────────────────────── */

const POS_MAP: Record<PositionY, { title: number; subtitle: number; cta: number }> = {
  top:    { title: 0.15, subtitle: 0.26, cta: 0.40 },
  center: { title: 0.38, subtitle: 0.50, cta: 0.64 },
  bottom: { title: 0.60, subtitle: 0.72, cta: 0.86 },
};

/* ── Render functions per template ───────────────────────── */

function getLayerY(layer: TextLayer, layerId: string, pos: Record<string, number>, size: number): number {
  if (layer.customY !== undefined) return size * layer.customY;
  return size * (pos[layerId] ?? 0.5);
}

function getLayerX(layer: TextLayer, size: number, posX: PositionX): number {
  if (layer.customX !== undefined) return size * layer.customX;
  return size * POS_X_MAP[posX];
}

function renderOferta(ctx: CanvasRenderingContext2D, size: number, layers: TextLayer[], accentColor: string, posY: PositionY, _cs?: CardSettings, posX: PositionX = "center") {
  const title = layers.find((l) => l.id === "title")!;
  const subtitle = layers.find((l) => l.id === "subtitle")!;
  const cta = layers.find((l) => l.id === "cta")!;
  const pos = POS_MAP[posY];

  drawGradientOverlay(ctx, size, "both");
  ctx.textBaseline = "middle";

  if (title.content.trim()) {
    const px = layerFontPx("title", title.fontSize);
    ctx.font = `bold ${px}px ${title.fontFamily}, sans-serif`;
    const x = getLayerX(title, size, posX);
    ctx.textAlign = posX === "left" ? "left" : posX === "right" ? "right" : "center";
    drawTextWithShadow(ctx, title.content.trim().toUpperCase(), x, getLayerY(title, "title", pos, size), title.color, "rgba(0,0,0,0.6)", 2, title);
  }
  if (subtitle.content.trim()) {
    const px = layerFontPx("subtitle", subtitle.fontSize);
    ctx.font = `600 ${px}px ${subtitle.fontFamily}, sans-serif`;
    const x = getLayerX(subtitle, size, posX);
    ctx.textAlign = posX === "left" ? "left" : posX === "right" ? "right" : "center";
    drawTextWithShadow(ctx, subtitle.content.trim(), x, getLayerY(subtitle, "subtitle", pos, size), subtitle.color, "rgba(0,0,0,0.4)", 1, subtitle);
  }
  if (cta.content.trim()) {
    const px = layerFontPx("cta", cta.fontSize);
    const x = getLayerX(cta, size, posX);
    drawCTAButton(ctx, cta.content.trim().toUpperCase(), x, getLayerY(cta, "cta", pos, size), cta.color, "#FFFFFF", px, cta.fontFamily);
  }
}

function renderEscassez(ctx: CanvasRenderingContext2D, size: number, layers: TextLayer[], accentColor: string, posY: PositionY, cardSettings?: CardSettings, posX: PositionX = "center") {
  const title = layers.find((l) => l.id === "title")!;
  const subtitle = layers.find((l) => l.id === "subtitle")!;
  const cta = layers.find((l) => l.id === "cta")!;
  const showCard = cardSettings?.showCard ?? true;
  const cardOpacity = (cardSettings?.opacity ?? 65) / 100;
  const cardSizeFactor = 0.5 + (cardSettings?.cardSize ?? 50) / 100 * 0.5;

  if (showCard) {
    ctx.fillStyle = `rgba(0,0,0,${(cardOpacity * 0.45).toFixed(2)})`;
    ctx.fillRect(0, 0, size, size);

    const cardW = size * 0.78 * cardSizeFactor;
    const cardH = size * 0.48 * cardSizeFactor;
    const cardX = (size - cardW) / 2;
    const cardY = (size - cardH) / 2;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = `rgba(0,0,0,${cardOpacity.toFixed(2)})`;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = cta.color;
    drawRoundedRect(ctx, cardX, cardY, cardW, 6, 20);
    ctx.fill();
    ctx.fillRect(cardX + 20, cardY, cardW - 40, 6);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (title.content.trim()) {
      const px = layerFontPx("title", title.fontSize);
      ctx.font = `bold ${px}px ${title.fontFamily}, sans-serif`;
      ctx.fillStyle = title.color;
      ctx.fillText(title.content.trim().toUpperCase(), size / 2, cardY + cardH * 0.32);
    }
    if (subtitle.content.trim()) {
      const px = layerFontPx("subtitle", subtitle.fontSize);
      ctx.font = `500 ${px}px ${subtitle.fontFamily}, sans-serif`;
      ctx.fillStyle = subtitle.color;
      ctx.fillText(subtitle.content.trim(), size / 2, cardY + cardH * 0.55);
    }
    if (cta.content.trim()) {
      const px = layerFontPx("cta", cta.fontSize);
      ctx.font = `bold ${px}px ${cta.fontFamily}, sans-serif`;
      ctx.fillStyle = cta.color;
      ctx.fillText(cta.content.trim(), size / 2, cardY + cardH * 0.78);
    }
  } else {
    const pos = POS_MAP[posY];
    drawGradientOverlay(ctx, size, "both");
    ctx.textBaseline = "middle";

    if (title.content.trim()) {
      const px = layerFontPx("title", title.fontSize);
      ctx.font = `bold ${px}px ${title.fontFamily}, sans-serif`;
      const x = getLayerX(title, size, posX);
      ctx.textAlign = posX === "left" ? "left" : posX === "right" ? "right" : "center";
      drawTextWithShadow(ctx, title.content.trim().toUpperCase(), x, getLayerY(title, "title", pos, size), title.color, "rgba(0,0,0,0.6)", 2, title);
    }
    if (subtitle.content.trim()) {
      const px = layerFontPx("subtitle", subtitle.fontSize);
      ctx.font = `500 ${px}px ${subtitle.fontFamily}, sans-serif`;
      const x = getLayerX(subtitle, size, posX);
      ctx.textAlign = posX === "left" ? "left" : posX === "right" ? "right" : "center";
      drawTextWithShadow(ctx, subtitle.content.trim(), x, getLayerY(subtitle, "subtitle", pos, size), subtitle.color, "rgba(0,0,0,0.3)", 1, subtitle);
    }
    if (cta.content.trim()) {
      const px = layerFontPx("cta", cta.fontSize);
      ctx.font = `bold ${px}px ${cta.fontFamily}, sans-serif`;
      const x = getLayerX(cta, size, posX);
      ctx.textAlign = posX === "left" ? "left" : posX === "right" ? "right" : "center";
      drawTextWithShadow(ctx, cta.content.trim(), x, getLayerY(cta, "cta", pos, size), cta.color, "rgba(0,0,0,0.3)", 1, cta);
    }
  }
}

function renderSazonal(ctx: CanvasRenderingContext2D, size: number, layers: TextLayer[], accentColor: string, posY: PositionY, _cs?: CardSettings, posX: PositionX = "center") {
  const title = layers.find((l) => l.id === "title")!;
  const subtitle = layers.find((l) => l.id === "subtitle")!;
  const cta = layers.find((l) => l.id === "cta")!;
  const pos = POS_MAP[posY];

  drawGradientOverlay(ctx, size, "both");
  ctx.textBaseline = "middle";

  if (title.content.trim()) {
    const px = layerFontPx("title", title.fontSize);
    ctx.font = `bold ${px}px ${title.fontFamily}, sans-serif`;
    const x = getLayerX(title, size, posX);
    ctx.textAlign = posX === "left" ? "left" : posX === "right" ? "right" : "center";
    drawTextWithShadow(ctx, title.content.trim().toUpperCase(), x, getLayerY(title, "title", pos, size), title.color, "rgba(0,0,0,0.6)", 2, title);
  }
  if (subtitle.content.trim()) {
    const px = layerFontPx("subtitle", subtitle.fontSize);
    ctx.font = `500 ${px}px ${subtitle.fontFamily}, sans-serif`;
    const x = getLayerX(subtitle, size, posX);
    ctx.textAlign = posX === "left" ? "left" : posX === "right" ? "right" : "center";
    drawTextWithShadow(ctx, subtitle.content.trim(), x, getLayerY(subtitle, "subtitle", pos, size), subtitle.color, "rgba(0,0,0,0.3)", 1, subtitle);
  }
  if (cta.content.trim()) {
    const px = layerFontPx("cta", cta.fontSize);
    const x = getLayerX(cta, size, posX);
    drawCTAButton(ctx, cta.content.trim().toUpperCase(), x, getLayerY(cta, "cta", pos, size), cta.color, "#FFFFFF", px, cta.fontFamily);
  }
}

interface CardSettings {
  showCard: boolean;
  opacity: number;
  cardSize: number;
}

type RenderFn = (ctx: CanvasRenderingContext2D, size: number, layers: TextLayer[], accent: string, posY: PositionY, cardSettings?: CardSettings, posX?: PositionX) => void;

function renderMinimalista(ctx: CanvasRenderingContext2D, size: number, layers: TextLayer[], accentColor: string, posY: PositionY, _cs?: CardSettings, posX: PositionX = "center") {
  const title = layers.find((l) => l.id === "title")!;
  const subtitle = layers.find((l) => l.id === "subtitle")!;
  const cta = layers.find((l) => l.id === "cta")!;
  const pos = POS_MAP[posY];

  const grad = ctx.createLinearGradient(0, size * 0.6, 0, size);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.textBaseline = "middle";

  if (title.content.trim()) {
    const px = layerFontPx("title", title.fontSize);
    ctx.font = `bold ${px}px ${title.fontFamily}, sans-serif`;
    const x = getLayerX(title, size, posX);
    ctx.textAlign = posX === "left" ? "left" : posX === "right" ? "right" : "center";
    drawTextWithShadow(ctx, title.content.trim().toUpperCase(), x, getLayerY(title, "title", pos, size), title.color, "rgba(0,0,0,0.2)", 1, title);
  }
  if (subtitle.content.trim()) {
    const px = layerFontPx("subtitle", subtitle.fontSize);
    ctx.font = `400 ${px}px ${subtitle.fontFamily}, sans-serif`;
    const x = getLayerX(subtitle, size, posX);
    ctx.textAlign = posX === "left" ? "left" : posX === "right" ? "right" : "center";
    drawTextWithShadow(ctx, subtitle.content.trim(), x, getLayerY(subtitle, "subtitle", pos, size), subtitle.color, "rgba(0,0,0,0.15)", 0.5, subtitle);
  }
  if (cta.content.trim()) {
    const px = layerFontPx("cta", cta.fontSize);
    ctx.font = `600 ${px}px ${cta.fontFamily}, sans-serif`;
    const x = getLayerX(cta, size, posX);
    const y = getLayerY(cta, "cta", pos, size);
    ctx.textAlign = posX === "left" ? "left" : posX === "right" ? "right" : "center";
    drawTextWithShadow(ctx, cta.content.trim().toUpperCase(), x, y, cta.color, "rgba(0,0,0,0.15)", 0.5, cta);
    const metrics = ctx.measureText(cta.content.trim().toUpperCase());
    ctx.strokeStyle = cta.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const underlineX = posX === "left" ? x : posX === "right" ? x - metrics.width : x - metrics.width / 2;
    ctx.moveTo(underlineX, y + px * 0.4);
    ctx.lineTo(underlineX + metrics.width, y + px * 0.4);
    ctx.stroke();
  }
}

function renderNeon(ctx: CanvasRenderingContext2D, size: number, layers: TextLayer[], accentColor: string, posY: PositionY, _cs?: CardSettings, posX: PositionX = "center") {
  const title = layers.find((l) => l.id === "title")!;
  const subtitle = layers.find((l) => l.id === "subtitle")!;
  const cta = layers.find((l) => l.id === "cta")!;
  const pos = POS_MAP[posY];

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, size, size);

  ctx.textBaseline = "middle";

  if (title.content.trim()) {
    const px = layerFontPx("title", title.fontSize);
    ctx.font = `bold ${px}px ${title.fontFamily}, sans-serif`;
    const x = getLayerX(title, size, posX);
    ctx.textAlign = posX === "left" ? "left" : posX === "right" ? "right" : "center";
    drawNeonText(ctx, title.content.trim().toUpperCase(), x, getLayerY(title, "title", pos, size), title.color, cta.color, title);
  }
  if (subtitle.content.trim()) {
    const px = layerFontPx("subtitle", subtitle.fontSize);
    ctx.font = `500 ${px}px ${subtitle.fontFamily}, sans-serif`;
    const x = getLayerX(subtitle, size, posX);
    ctx.textAlign = posX === "left" ? "left" : posX === "right" ? "right" : "center";
    drawNeonText(ctx, subtitle.content.trim(), x, getLayerY(subtitle, "subtitle", pos, size), subtitle.color, cta.color, subtitle);
  }
  if (cta.content.trim()) {
    const px = layerFontPx("cta", cta.fontSize);
    ctx.font = `bold ${px}px ${cta.fontFamily}, sans-serif`;
    const x = getLayerX(cta, size, posX);
    const metrics = ctx.measureText(cta.content.trim().toUpperCase());
    const btnW = metrics.width + 80;
    const btnH = px + 44;
    const y = getLayerY(cta, "cta", pos, size);
    const btnX = x - btnW / 2;
    const btnY = y - btnH / 2;

    ctx.save();
    ctx.shadowColor = cta.color;
    ctx.shadowBlur = 20;
    ctx.strokeStyle = cta.color;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 14);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = "center";
    drawNeonText(ctx, cta.content.trim().toUpperCase(), x, y + 2, "#FFFFFF", cta.color, cta);
  }
}

const RENDER_MAP: Record<TemplateId, RenderFn> = {
  oferta: renderOferta,
  escassez: renderEscassez,
  sazonal: renderSazonal,
  minimalista: renderMinimalista,
  neon: renderNeon,
};

/* ── Component ───────────────────────────────────────────── */

export function CampaignTextOverlayEditor({ open, onOpenChange, imageUrl, onSave, companyId, campaignType }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [template, setTemplate] = useState<TemplateId>("oferta");
  const [layers, setLayers] = useState<TextLayer[]>(TEMPLATES[0].layers.map((l) => ({ ...l })));
  const accentColor = "#FFFFFF"; // kept for type compatibility, per-layer colors now used
  const [positionY, setPositionY] = useState<PositionY>("top");
  const [positionX, setPositionX] = useState<PositionX>("center");
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [cardSettings, setCardSettings] = useState<CardSettings>({ showCard: true, opacity: 65, cardSize: 50 });
  const appliedPresetRef = useRef<string | null>(null);

  // Photo filters
  const [brightness, setBrightness] = useState(0);     // -50 to +50
  const [contrast, setContrast] = useState(0);          // -50 to +50
  const [darken, setDarken] = useState(0);              // 0 to 80

  // Stickers
  const [stickers, setStickers] = useState<Sticker[]>([]);

  // Reset appliedPresetRef when dialog closes so it re-applies on reopen
  useEffect(() => {
    if (!open) {
      appliedPresetRef.current = null;
    }
  }, [open]);

  // Pre-fill layers from campaign type when editor opens
  useEffect(() => {
    if (!open || !campaignType) return;
    if (appliedPresetRef.current === campaignType) return;
    const presets = CAMPAIGN_PRESETS[campaignType];
    if (presets && presets.length > 0) {
      const preset = presets[0];
      setLayers((prev) => prev.map((l) => {
        if (l.id === "title") return { ...l, content: preset.title };
        if (l.id === "subtitle") return { ...l, content: preset.subtitle };
        if (l.id === "cta") return { ...l, content: preset.cta };
        return l;
      }));
      appliedPresetRef.current = campaignType;
    }
  }, [open, campaignType]);

  // Load base image
  useEffect(() => {
    if (!open || !imageUrl) return;
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgRef.current = img; setImageLoaded(true); };
    img.onerror = () => toast.error("Erro ao carregar imagem base");
    img.src = imageUrl;
  }, [open, imageUrl]);

  // Load fonts
  useEffect(() => {
    if (!open) return;
    const googleFonts: { family: string; weights: string[]; url: string }[] = [
      { family: "Montserrat", weights: ["500", "600", "700"], url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&display=swap" },
      { family: "Bebas Neue", weights: ["400"], url: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" },
      { family: "Playfair Display", weights: ["400", "700"], url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" },
      { family: "Oswald", weights: ["400", "600", "700"], url: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&display=swap" },
      { family: "Dancing Script", weights: ["400", "700"], url: "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap" },
      { family: "Permanent Marker", weights: ["400"], url: "https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap" },
      { family: "Poppins", weights: ["400", "600", "700"], url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" },
      { family: "Roboto Condensed", weights: ["400", "700"], url: "https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700&display=swap" },
    ];
    googleFonts.forEach((gf) => {
      if (!document.querySelector(`link[href="${gf.url}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = gf.url;
        document.head.appendChild(link);
      }
    });
    document.fonts.ready.then(() => {
      renderCanvas();
    });
  }, [open]);

  const switchTemplate = (id: TemplateId) => {
    setTemplate(id);
    const tpl = TEMPLATES.find((t) => t.id === id)!;
    setLayers(tpl.layers.map((l) => ({ ...l })));
  };

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = CANVAS_SIZE;
    canvas.width = size * DPR;
    canvas.height = size * DPR;
    canvas.style.width = "";
    canvas.style.height = "";
    ctx.scale(DPR, DPR);

    // 1. Draw base image with brightness/contrast filters
    const bVal = 100 + brightness;
    const cVal = 100 + contrast;
    ctx.filter = `brightness(${bVal}%) contrast(${cVal}%)`;

    const scale = Math.max(size / img.width, size / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

    // 2. Reset filter
    ctx.filter = "none";

    // 3. Darken overlay
    if (darken > 0) {
      ctx.fillStyle = `rgba(0,0,0,${darken / 100})`;
      ctx.fillRect(0, 0, size, size);
    }

    // 4. Render template (text layers)
    RENDER_MAP[template](ctx, size, layers, accentColor, positionY, cardSettings, positionX);

    // 5. Render stickers
    stickers.forEach((s) => {
      ctx.save();
      ctx.font = `${s.size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.emoji, s.x * size, s.y * size);
      ctx.restore();
    });
  }, [layers, imageLoaded, template, positionY, positionX, cardSettings, brightness, contrast, darken, stickers]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  const updateLayer = (id: string, updates: Partial<TextLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  /* ── Drag-to-reposition logic (text layers + stickers) ── */
  const draggingRef = useRef<{ type: "layer" | "sticker"; id: string; startMouseY: number; startCustomY: number; startMouseX: number; startCustomX: number } | null>(null);

  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }, []);

  const findClosestDraggable = useCallback((xRatio: number, yRatio: number): { type: "layer" | "sticker"; id: string } | null => {
    let closest: { type: "layer" | "sticker"; id: string } | null = null;
    let minDist = 0.08;

    // Check stickers first (they're on top)
    for (const s of stickers) {
      const dist = Math.sqrt((xRatio - s.x) ** 2 + (yRatio - s.y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closest = { type: "sticker", id: s.id };
      }
    }

    // Check text layers
    const pos = POS_MAP[positionY];
    for (const layer of layers) {
      if (!layer.content.trim()) continue;
      const layerYRatio = layer.customY ?? pos[layer.id as keyof typeof pos] ?? 0.5;
      const layerXRatio = layer.customX ?? POS_X_MAP[positionX];
      const dist = Math.sqrt((xRatio - layerXRatio) ** 2 + (yRatio - layerYRatio) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closest = { type: "layer", id: layer.id };
      }
    }
    return closest;
  }, [layers, positionY, positionX, stickers]);

  const handleCanvasPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCanvasCoords(e);
    const target = findClosestDraggable(x, y);
    if (!target) return;
    e.preventDefault();

    if (target.type === "sticker") {
      const s = stickers.find((st) => st.id === target.id)!;
      draggingRef.current = { type: "sticker", id: s.id, startMouseY: y, startCustomY: s.y, startMouseX: x, startCustomX: s.x };
    } else {
      const layer = layers.find((l) => l.id === target.id)!;
      const currentY = layer.customY ?? POS_MAP[positionY][layer.id as keyof (typeof POS_MAP)["top"]] ?? 0.5;
      const currentX = layer.customX ?? POS_X_MAP[positionX];
      draggingRef.current = { type: "layer", id: layer.id, startMouseY: y, startCustomY: currentY, startMouseX: x, startCustomX: currentX };
    }
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  }, [getCanvasCoords, findClosestDraggable, positionY, positionX, layers, stickers]);

  const handleCanvasPointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingRef.current) {
      const { x, y } = getCanvasCoords(e);
      const target = findClosestDraggable(x, y);
      if (canvasRef.current) canvasRef.current.style.cursor = target ? "grab" : "default";
      return;
    }
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    const deltaY = y - draggingRef.current.startMouseY;
    const deltaX = x - draggingRef.current.startMouseX;
    const newY = Math.max(0.05, Math.min(0.95, draggingRef.current.startCustomY + deltaY));
    const newX = Math.max(0.05, Math.min(0.95, draggingRef.current.startCustomX + deltaX));

    if (draggingRef.current.type === "sticker") {
      setStickers((prev) => prev.map((s) => s.id === draggingRef.current!.id ? { ...s, x: newX, y: newY } : s));
    } else {
      updateLayer(draggingRef.current.id, { customY: newY, customX: newX });
    }
  }, [getCanvasCoords, findClosestDraggable]);

  const handleCanvasPointerUp = useCallback(() => {
    draggingRef.current = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "default";
  }, []);

  // Global mouseup/touchend
  useEffect(() => {
    const handleUp = () => {
      draggingRef.current = null;
      if (canvasRef.current) canvasRef.current.style.cursor = "default";
    };
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
    };
  }, []);

  const resetPositions = useCallback(() => {
    setLayers((prev) => prev.map((l) => ({ ...l, customY: undefined, customX: undefined })));
  }, []);

  const resetFilters = useCallback(() => {
    setBrightness(0);
    setContrast(0);
    setDarken(0);
  }, []);

  const addSticker = useCallback((emoji: string) => {
    if (stickers.length >= MAX_STICKERS) {
      toast.error(`Máximo de ${MAX_STICKERS} stickers`);
      return;
    }
    setStickers((prev) => [...prev, { id: `sticker-${Date.now()}`, emoji, x: 0.5, y: 0.5, size: 60 }]);
  }, [stickers.length]);

  const removeSticker = useCallback((id: string) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateStickerSize = useCallback((id: string, size: number) => {
    setStickers((prev) => prev.map((s) => s.id === id ? { ...s, size } : s));
  }, []);

  const handleSaveWithText = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Erro ao exportar canvas");
      const path = `campaigns/text-overlay-${Date.now()}.png`;
      const { error } = await supabase.storage.from("sales-materials").upload(path, blob, { contentType: "image/png" });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("sales-materials").getPublicUrl(path);
      onSave(urlData.publicUrl);
      onOpenChange(false);
      toast.success("Arte profissional salva! 🎨");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWithoutText = () => {
    onSave(imageUrl);
    onOpenChange(false);
  };

  const hasAnyText = layers.some((l) => l.content.trim());
  const hasFilters = brightness !== 0 || contrast !== 0 || darken !== 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" />
            Editor de Arte Profissional
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4">
          {/* LEFT sidebar — Filters + Stickers (desktop only) */}
          <div className="hidden md:block md:w-56 shrink-0 space-y-4 overflow-y-auto md:max-h-[65vh] pr-1">
            {/* Photo filters */}
            <div className="space-y-3 p-3 rounded-xl border border-border/40 bg-muted/5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5" /> Ajustes da foto
                </p>
                {hasFilters && (
                  <button type="button" onClick={resetFilters} className="text-[10px] text-primary hover:underline">Resetar</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground shrink-0 w-14">Brilho</span>
                <Slider value={[brightness]} onValueChange={([v]) => setBrightness(v)} min={-50} max={50} step={1} className="flex-1" />
                <span className="text-[10px] text-muted-foreground w-6 text-right">{brightness}</span>
              </div>
              <div className="flex items-center gap-2">
                <Contrast className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground shrink-0 w-14">Contraste</span>
                <Slider value={[contrast]} onValueChange={([v]) => setContrast(v)} min={-50} max={50} step={1} className="flex-1" />
                <span className="text-[10px] text-muted-foreground w-6 text-right">{contrast}</span>
              </div>
              <div className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground shrink-0 w-14">Escurecer</span>
                <Slider value={[darken]} onValueChange={([v]) => setDarken(v)} min={0} max={80} step={1} className="flex-1" />
                <span className="text-[10px] text-muted-foreground w-6 text-right">{darken}%</span>
              </div>
            </div>

            {/* Stickers */}
            <div className="space-y-3 p-3 rounded-xl border border-border/40 bg-muted/5">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5" /> Stickers ({stickers.length}/{MAX_STICKERS})
              </p>
              <div className="space-y-2">
                {STICKER_CATEGORIES.map((cat) => (
                  <div key={cat.label}>
                    <span className="text-[10px] text-muted-foreground font-medium">{cat.label}</span>
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {cat.emojis.map((emoji) => (
                        <button key={emoji} type="button" onClick={() => addSticker(emoji)} disabled={stickers.length >= MAX_STICKERS}
                          className="w-7 h-7 flex items-center justify-center text-base rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {stickers.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/30">
                  {stickers.map((s) => (
                    <div key={s.id} className="flex items-center gap-1.5">
                      <span className="text-base">{s.emoji}</span>
                      <Slider value={[s.size]} onValueChange={([v]) => updateStickerSize(s.id, v)} min={20} max={120} step={2} className="flex-1" />
                      <span className="text-[10px] text-muted-foreground w-7 text-right">{s.size}px</span>
                      <button type="button" onClick={() => removeSticker(s.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Canvas preview */}
          <div className="flex-1 min-w-0">
            <div className="rounded-xl border overflow-hidden bg-muted/20">
              <canvas
                ref={canvasRef}
                className="w-full h-auto block touch-none"
                onMouseDown={handleCanvasPointerDown}
                onMouseMove={handleCanvasPointerMove}
                onMouseUp={handleCanvasPointerUp}
                onTouchStart={handleCanvasPointerDown}
                onTouchMove={handleCanvasPointerMove}
                onTouchEnd={handleCanvasPointerUp}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <GripVertical className="w-3 h-3" />
                Arraste textos e stickers para reposicionar
              </p>
              {layers.some((l) => l.customY !== undefined || l.customX !== undefined) && (
                <button type="button" onClick={resetPositions} className="text-[10px] text-primary hover:underline">Resetar posições</button>
              )}
            </div>
          </div>

          {/* RIGHT sidebar — Template + Position + Texts */}
          <div className="md:w-72 shrink-0 space-y-4 overflow-y-auto md:max-h-[65vh] pr-1">
            {/* Template selector */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <LayoutTemplate className="w-3.5 h-3.5" /> Template
              </p>
              <div className="grid grid-cols-3 md:grid-cols-1 gap-1.5">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => switchTemplate(tpl.id)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      template === tpl.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border/60 bg-muted/10 hover:border-primary/40"
                    }`}
                  >
                    <span className="text-[11px] font-bold block">{tpl.label}</span>
                    <span className="text-[10px] text-muted-foreground">{tpl.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5" /> Posição do texto
              </p>
              <div className="flex gap-1.5 mb-1.5">
                {POSITION_OPTIONS.map((p) => (
                  <button key={p.value} type="button" onClick={() => setPositionY(p.value)}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-all ${positionY === p.value ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {POSITION_X_OPTIONS.map((p) => (
                  <button key={p.value} type="button" onClick={() => setPositionX(p.value)}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-all ${positionX === p.value ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preset texts */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Textos prontos
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    {campaignType || "Escolher modelo de texto"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <ScrollArea className="max-h-64">
                    <div className="p-1">
                      {Object.entries(CAMPAIGN_PRESETS).map(([key, presets]) => (
                        <div key={key} className="mb-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase px-3 py-1 block">{key}</span>
                          {presets.map((preset, idx) => (
                            <button key={`${key}-${idx}`} type="button"
                              onClick={() => {
                                setLayers((prev) => prev.map((l) => {
                                  if (l.id === "title") return { ...l, content: preset.title };
                                  if (l.id === "subtitle") return { ...l, content: preset.subtitle };
                                  if (l.id === "cta") return { ...l, content: preset.cta };
                                  return l;
                                }));
                              }}
                              className="w-full text-left rounded-lg px-3 py-1.5 hover:bg-primary/10 transition-colors">
                              <span className="text-xs font-semibold block">{preset.title}</span>
                              <span className="text-[10px] text-muted-foreground line-clamp-1">{preset.subtitle} · {preset.cta}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            {/* Card settings — only for Escassez */}
            {template === "escassez" && (
              <div className="space-y-3 p-3 rounded-xl border border-border/40 bg-muted/5">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Square className="w-3.5 h-3.5" /> Card central
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Exibir card</span>
                  <Switch checked={cardSettings.showCard} onCheckedChange={(v) => setCardSettings((s) => ({ ...s, showCard: v }))} />
                </div>
                {cardSettings.showCard && (
                  <>
                    <div className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[10px] text-muted-foreground shrink-0 w-14">Opacidade</span>
                      <Slider value={[cardSettings.opacity]} onValueChange={([v]) => setCardSettings((s) => ({ ...s, opacity: v }))} min={10} max={100} step={5} className="flex-1" />
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{cardSettings.opacity}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-[10px] text-muted-foreground shrink-0 w-14">Tamanho</span>
                      <Slider value={[cardSettings.cardSize]} onValueChange={([v]) => setCardSettings((s) => ({ ...s, cardSize: v }))} min={20} max={100} step={5} className="flex-1" />
                      <span className="text-[10px] text-muted-foreground w-8 text-right">{cardSettings.cardSize}%</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Text layers */}
            <div className="space-y-4">
              {layers.map((layer) => (
                <div key={layer.id} className="space-y-2 p-3 rounded-xl border border-border/40 bg-muted/5">
                  <Badge variant="outline" className="text-[10px]">{layer.label}</Badge>
                  <Input placeholder={layer.placeholder} value={layer.content} onChange={(e) => updateLayer(layer.id, { content: e.target.value })} className="h-9 text-sm" />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground shrink-0 w-10">Fonte</span>
                    <Select value={layer.fontFamily} onValueChange={(v) => updateLayer(layer.id, { fontFamily: v })}>
                      <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value} className="text-xs">
                            <span style={{ fontFamily: f.value }}>{f.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground mb-1 block">Cor</span>
                    <div className="flex gap-1 flex-wrap">
                      {COLOR_PRESETS.map((c) => (
                        <button key={c.value} type="button" title={c.label}
                          className={`rounded-full border-2 transition-transform ${layer.color === c.value ? "scale-125 border-primary ring-2 ring-primary/30" : "border-border/50 hover:scale-110"}`}
                          style={{ backgroundColor: c.value, width: 22, height: 22 }}
                          onClick={() => updateLayer(layer.id, { color: c.value })} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ALargeSmall className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <Slider value={[layer.fontSize]} onValueChange={([v]) => updateLayer(layer.id, { fontSize: v })} min={0} max={100} step={1} className="flex-1" />
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{layerFontPx(layer.id, layer.fontSize)}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground shrink-0">Sombra</span>
                    <Switch checked={layer.shadowEnabled !== false} onCheckedChange={(v) => updateLayer(layer.id, { shadowEnabled: v })} />
                    {layer.shadowEnabled !== false && (
                      <Slider value={[layer.shadowIntensity ?? 50]} onValueChange={([v]) => updateLayer(layer.id, { shadowIntensity: v })} min={0} max={100} step={5} className="flex-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile-only: Filters + Stickers */}
            <div className="md:hidden space-y-4">
              <div className="space-y-3 p-3 rounded-xl border border-border/40 bg-muted/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Sun className="w-3.5 h-3.5" /> Ajustes da foto</p>
                  {hasFilters && <button type="button" onClick={resetFilters} className="text-[10px] text-primary hover:underline">Resetar</button>}
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span className="text-[10px] text-muted-foreground shrink-0 w-14">Brilho</span>
                  <Slider value={[brightness]} onValueChange={([v]) => setBrightness(v)} min={-50} max={50} step={1} className="flex-1" />
                  <span className="text-[10px] text-muted-foreground w-6 text-right">{brightness}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Contrast className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span className="text-[10px] text-muted-foreground shrink-0 w-14">Contraste</span>
                  <Slider value={[contrast]} onValueChange={([v]) => setContrast(v)} min={-50} max={50} step={1} className="flex-1" />
                  <span className="text-[10px] text-muted-foreground w-6 text-right">{contrast}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span className="text-[10px] text-muted-foreground shrink-0 w-14">Escurecer</span>
                  <Slider value={[darken]} onValueChange={([v]) => setDarken(v)} min={0} max={80} step={1} className="flex-1" />
                  <span className="text-[10px] text-muted-foreground w-6 text-right">{darken}%</span>
                </div>
              </div>
              <div className="space-y-3 p-3 rounded-xl border border-border/40 bg-muted/5">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Smile className="w-3.5 h-3.5" /> Stickers ({stickers.length}/{MAX_STICKERS})</p>
                <div className="space-y-2">
                  {STICKER_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <span className="text-[10px] text-muted-foreground font-medium">{cat.label}</span>
                      <div className="flex gap-1 flex-wrap mt-0.5">
                        {cat.emojis.map((emoji) => (
                          <button key={emoji} type="button" onClick={() => addSticker(emoji)} disabled={stickers.length >= MAX_STICKERS}
                            className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">{emoji}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {stickers.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/30">
                    {stickers.map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="text-lg">{s.emoji}</span>
                        <Slider value={[s.size]} onValueChange={([v]) => updateStickerSize(s.id, v)} min={20} max={120} step={2} className="flex-1" />
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{s.size}px</span>
                        <button type="button" onClick={() => removeSticker(s.id)} className="text-destructive hover:text-destructive/80 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSaveWithoutText} disabled={saving} className="gap-1.5">
            <X className="w-3.5 h-3.5" />
            Salvar sem texto
          </Button>
          <Button onClick={handleSaveWithText} disabled={saving || !hasAnyText} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar arte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
