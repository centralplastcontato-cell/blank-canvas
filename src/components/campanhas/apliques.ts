/* ── Apliques Decorativos — Canvas 2D vector overlays ──── */

export type ApliqueTipo =
  | "wave-top"
  | "wave-bottom"
  | "splash-corner"
  | "confetti"
  | "zigzag-top"
  | "zigzag-bottom"
  | "circles"
  | "diagonal-stripes"
  | "frame-festive"
  | "dots"
  | "stars";

export interface Aplique {
  id: string;
  type: ApliqueTipo;
  color: string;
  opacity: number; // 0–100
}

export interface ApliqueDefinition {
  type: ApliqueTipo;
  label: string;
  icon: string; // emoji for preview thumbnail
}

export const APLIQUE_CATALOG: ApliqueDefinition[] = [
  { type: "wave-top", label: "Onda Topo", icon: "🌊" },
  { type: "wave-bottom", label: "Onda Base", icon: "🌊" },
  { type: "splash-corner", label: "Splash Canto", icon: "💥" },
  { type: "confetti", label: "Confetes", icon: "🎊" },
  { type: "zigzag-top", label: "Zigzag Topo", icon: "⚡" },
  { type: "zigzag-bottom", label: "Zigzag Base", icon: "⚡" },
  { type: "circles", label: "Círculos", icon: "⭕" },
  { type: "diagonal-stripes", label: "Diagonal", icon: "📐" },
  { type: "frame-festive", label: "Moldura", icon: "🖼️" },
  { type: "dots", label: "Pontos", icon: "🔵" },
  { type: "stars", label: "Estrelas", icon: "⭐" },
];

export const MAX_APLIQUES = 4;

export const APLIQUE_COLORS = [
  "#FFD700", "#FF3333", "#FF6B00", "#00CC66", "#3399FF",
  "#9B59B6", "#FF69B4", "#00CED1", "#1E3A8A", "#FFFFFF",
];

/* ── Seeded pseudo-random ─────────────────────────────── */

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ── Drawing functions ────────────────────────────────── */

function drawWaveTop(ctx: CanvasRenderingContext2D, size: number, color: string) {
  const h = size * 0.15;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.lineTo(size, h * 0.6);
  ctx.bezierCurveTo(size * 0.75, h * 1.2, size * 0.5, h * 0.3, size * 0.25, h);
  ctx.bezierCurveTo(size * 0.1, h * 1.15, 0, h * 0.5, 0, h * 0.7);
  ctx.closePath();
  ctx.fill();
}

function drawWaveBottom(ctx: CanvasRenderingContext2D, size: number, color: string) {
  const h = size * 0.15;
  const y0 = size - h;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, size);
  ctx.lineTo(size, y0 + h * 0.3);
  ctx.bezierCurveTo(size * 0.75, y0 - h * 0.15, size * 0.5, y0 + h * 0.7, size * 0.25, y0 + h * 0.1);
  ctx.bezierCurveTo(size * 0.1, y0 - h * 0.1, 0, y0 + h * 0.4, 0, y0 + h * 0.3);
  ctx.closePath();
  ctx.fill();
}

function drawSplashCorner(ctx: CanvasRenderingContext2D, size: number, color: string) {
  const r = size * 0.22;
  // top-left splash
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(r, 0);
  ctx.bezierCurveTo(r * 0.7, r * 0.3, r * 0.3, r * 0.7, 0, r);
  ctx.closePath();
  ctx.fill();
  // bottom-right splash
  ctx.beginPath();
  ctx.moveTo(size, size);
  ctx.lineTo(size - r, size);
  ctx.bezierCurveTo(size - r * 0.7, size - r * 0.3, size - r * 0.3, size - r * 0.7, size, size - r);
  ctx.closePath();
  ctx.fill();
}

function drawConfetti(ctx: CanvasRenderingContext2D, size: number, color: string, id: string) {
  const rand = seededRandom(hashCode(id));
  const count = 35;
  const colors = [color, lighten(color, 40), lighten(color, -30), "#FFD700", "#FF69B4"];
  for (let i = 0; i < count; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const s = 6 + rand() * 14;
    const ci = Math.floor(rand() * colors.length);
    ctx.fillStyle = colors[ci];
    const shape = Math.floor(rand() * 3);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rand() * Math.PI * 2);
    if (shape === 0) {
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape === 1) {
      ctx.fillRect(-s / 2, -s / 4, s, s / 2);
    } else {
      // small star
      drawMiniStar(ctx, 0, 0, s / 2);
    }
    ctx.restore();
  }
}

function drawMiniStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const spikes = 5;
  const outerR = r;
  const innerR = r * 0.4;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawZigzag(ctx: CanvasRenderingContext2D, size: number, color: string, top: boolean) {
  const h = size * 0.05;
  const teeth = 20;
  const toothW = size / teeth;
  const baseY = top ? 0 : size - h;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (top) {
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.lineTo(size, h);
    for (let i = teeth; i >= 0; i--) {
      const x = i * toothW;
      const y = i % 2 === 0 ? h : h * 0.3;
      ctx.lineTo(x, y);
    }
  } else {
    ctx.moveTo(0, size);
    ctx.lineTo(size, size);
    ctx.lineTo(size, baseY);
    for (let i = teeth; i >= 0; i--) {
      const x = i * toothW;
      const y = i % 2 === 0 ? baseY : baseY + h * 0.7;
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function drawCircles(ctx: CanvasRenderingContext2D, size: number, color: string, id: string) {
  const rand = seededRandom(hashCode(id + "circles"));
  const positions = [
    { x: size * 0.1, y: size * 0.1 },
    { x: size * 0.9, y: size * 0.12 },
    { x: size * 0.08, y: size * 0.88 },
    { x: size * 0.92, y: size * 0.9 },
    { x: size * 0.85, y: size * 0.5 },
  ];
  positions.forEach((p) => {
    const r = 20 + rand() * 30;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    // inner filled circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawDiagonalStripes(ctx: CanvasRenderingContext2D, size: number, color: string) {
  const stripeW = 18;
  const gap = 14;
  const count = 8;
  ctx.save();
  // top-right corner
  ctx.beginPath();
  ctx.moveTo(size * 0.6, 0);
  ctx.lineTo(size, 0);
  ctx.lineTo(size, size * 0.4);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const offset = i * (stripeW + gap);
    ctx.beginPath();
    ctx.moveTo(size * 0.5 + offset, 0);
    ctx.lineTo(size * 0.5 + offset + stripeW, 0);
    ctx.lineTo(size, size * 0.5 - offset);
    ctx.lineTo(size, size * 0.5 - offset - stripeW);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // bottom-left corner
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, size * 0.6);
  ctx.lineTo(0, size);
  ctx.lineTo(size * 0.4, size);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const offset = i * (stripeW + gap);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.5 + offset);
    ctx.lineTo(0, size * 0.5 + offset + stripeW);
    ctx.lineTo(size * 0.5 - offset, size);
    ctx.lineTo(size * 0.5 - offset - stripeW, size);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawFrameFestive(ctx: CanvasRenderingContext2D, size: number, color: string) {
  const inset = size * 0.05;
  const w = size - inset * 2;
  const h = size - inset * 2;
  const r = 20;
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.setLineDash([16, 10]);
  ctx.beginPath();
  ctx.moveTo(inset + r, inset);
  ctx.lineTo(inset + w - r, inset);
  ctx.quadraticCurveTo(inset + w, inset, inset + w, inset + r);
  ctx.lineTo(inset + w, inset + h - r);
  ctx.quadraticCurveTo(inset + w, inset + h, inset + w - r, inset + h);
  ctx.lineTo(inset + r, inset + h);
  ctx.quadraticCurveTo(inset, inset + h, inset, inset + h - r);
  ctx.lineTo(inset, inset + r);
  ctx.quadraticCurveTo(inset, inset, inset + r, inset);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  // corner dots
  const corners = [
    [inset, inset], [inset + w, inset],
    [inset, inset + h], [inset + w, inset + h],
  ];
  ctx.fillStyle = color;
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawDots(ctx: CanvasRenderingContext2D, size: number, color: string, id: string) {
  const rand = seededRandom(hashCode(id + "dots"));
  const margin = size * 0.04;
  const spacing = size * 0.06;
  ctx.fillStyle = color;
  // top edge
  for (let x = margin; x < size - margin; x += spacing) {
    const r = 3 + rand() * 4;
    ctx.beginPath();
    ctx.arc(x, margin + rand() * 15, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // bottom edge
  for (let x = margin; x < size - margin; x += spacing) {
    const r = 3 + rand() * 4;
    ctx.beginPath();
    ctx.arc(x, size - margin - rand() * 15, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // left edge
  for (let y = margin + spacing; y < size - margin - spacing; y += spacing) {
    const r = 3 + rand() * 4;
    ctx.beginPath();
    ctx.arc(margin + rand() * 15, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // right edge
  for (let y = margin + spacing; y < size - margin - spacing; y += spacing) {
    const r = 3 + rand() * 4;
    ctx.beginPath();
    ctx.arc(size - margin - rand() * 15, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStars(ctx: CanvasRenderingContext2D, size: number, color: string, id: string) {
  const rand = seededRandom(hashCode(id + "stars"));
  const count = 18;
  const colors = [color, lighten(color, 30), "#FFD700"];
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 8 + rand() * 16;
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI);
    drawMiniStar(ctx, 0, 0, r);
    ctx.restore();
  }
}

/* ── Color utility ────────────────────────────────────── */

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* ── Main render dispatcher ───────────────────────────── */

export function renderApliques(
  ctx: CanvasRenderingContext2D,
  size: number,
  apliques: Aplique[]
) {
  apliques.forEach((a) => {
    ctx.save();
    ctx.globalAlpha = a.opacity / 100;
    switch (a.type) {
      case "wave-top":
        drawWaveTop(ctx, size, a.color);
        break;
      case "wave-bottom":
        drawWaveBottom(ctx, size, a.color);
        break;
      case "splash-corner":
        drawSplashCorner(ctx, size, a.color);
        break;
      case "confetti":
        drawConfetti(ctx, size, a.color, a.id);
        break;
      case "zigzag-top":
        drawZigzag(ctx, size, a.color, true);
        break;
      case "zigzag-bottom":
        drawZigzag(ctx, size, a.color, false);
        break;
      case "circles":
        drawCircles(ctx, size, a.color, a.id);
        break;
      case "diagonal-stripes":
        drawDiagonalStripes(ctx, size, a.color);
        break;
      case "frame-festive":
        drawFrameFestive(ctx, size, a.color);
        break;
      case "dots":
        drawDots(ctx, size, a.color, a.id);
        break;
      case "stars":
        drawStars(ctx, size, a.color, a.id);
        break;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  });
}
