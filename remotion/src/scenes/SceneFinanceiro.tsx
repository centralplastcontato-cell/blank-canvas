import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GridBackground } from "../components/GridBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"], subsets: ["latin"] });

export const SceneFinanceiro = () => {
  const frame = useCurrentFrame();

  const badgeOpacity = interpolate(frame, [5, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [12, 30], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const payments = [
    { name: "Festa Laura", value: "R$ 4.500", status: "Pago", statusColor: "#22c55e" },
    { name: "Aniversário Pedro", value: "R$ 3.200", status: "Pendente", statusColor: "#f59e0b" },
    { name: "Festa da Sofia", value: "R$ 5.800", status: "Vencido", statusColor: "#ef4444" },
  ];

  const cards = [
    { name: "Festa Laura", value: "R$ 4.500", status: "Pago", badge: "✅ Pago", bgGrad: "linear-gradient(135deg, #064e3b, #065f46)", borderColor: "#22c55e", glowColor: "rgba(34,197,94,0.3)" },
    { name: "Aniversário Pedro", value: "R$ 3.200", status: "Pendente", badge: "🟡 3 dias para venc.", bgGrad: "linear-gradient(135deg, #78350f, #92400e)", borderColor: "#f59e0b", glowColor: "rgba(245,158,11,0.3)" },
    { name: "Festa da Sofia", value: "R$ 5.800", status: "Vencido", badge: "⚠️ 3 dias atrasido", bgGrad: "linear-gradient(135deg, #7f1d1d, #991b1b)", borderColor: "#ef4444", glowColor: "rgba(239,68,68,0.3)" },
  ];

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ padding: "0 80px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Title */}
        <div>
          <p style={{
            fontFamily, fontWeight: 700, fontSize: 26, color: "#f59e0b",
            letterSpacing: 5, textTransform: "uppercase", margin: "0 0 12px 0", opacity: badgeOpacity,
          }}>CONTROLE FINANCEIRO</p>
          <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            <h2 style={{ fontFamily, fontWeight: 900, fontSize: 72, color: "white", margin: 0, lineHeight: 1.05 }}>
              Pagamentos e receita{" "}<span style={{ color: "#f59e0b" }}>sob controle</span>
            </h2>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "flex", gap: 20, marginTop: 36 }}>
          {[
            { label: "Receita Mês", value: "R$ 48.500", sub: "+ R$ 20.000 este mês", color: "#22c55e", subColor: "#22c55e" },
            { label: "Pendente", value: "R$ 12.200", sub: "3 pagamentos aguardando", color: "#f59e0b", subColor: "rgba(255,255,255,0.4)" },
          ].map((card, i) => {
            const delay = 35 + i * 12;
            return (
              <div key={i} style={{
                flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.08)", padding: "24px 24px",
                opacity: interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                transform: `translateY(${interpolate(frame, [delay, delay + 15], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              }}>
                <p style={{ fontFamily, fontWeight: 400, fontSize: 20, color: "rgba(255,255,255,0.4)", margin: "0 0 6px 0" }}>{card.label}</p>
                <p style={{ fontFamily, fontWeight: 900, fontSize: 44, color: card.color, margin: "0 0 6px 0" }}>{card.value}</p>
                <p style={{ fontFamily, fontWeight: 500, fontSize: 16, color: card.subColor, margin: 0 }}>{card.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Payments list */}
        <div style={{
          marginTop: 20,
          opacity: interpolate(frame, [55, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [55, 75], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          background: "rgba(255,255,255,0.04)", borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)", padding: "24px 24px",
        }}>
          <p style={{ fontFamily, fontWeight: 800, fontSize: 26, color: "white", margin: "0 0 16px 0" }}>💰 Pagamentos</p>
          {payments.map((pay, i) => {
            const payDelay = 65 + i * 14;
            const payOpacity = interpolate(frame, [payDelay, payDelay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 0", opacity: payOpacity,
                borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <span style={{ fontFamily, fontWeight: 600, fontSize: 24, color: "rgba(255,255,255,0.8)" }}>{pay.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontFamily, fontWeight: 700, fontSize: 24, color: "white" }}>{pay.value}</span>
                  <span style={{
                    fontFamily, fontWeight: 600, fontSize: 16, color: pay.statusColor,
                    background: `${pay.statusColor}18`, padding: "5px 14px", borderRadius: 8,
                  }}>{pay.status}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtitle */}
        <p style={{
          fontFamily, fontWeight: 400, fontSize: 20, color: "rgba(255,255,255,0.3)", margin: "18px 0 0 0",
          opacity: interpolate(frame, [100, 115], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>Emissão automática de cards para cada obrigação</p>

        {/* Visual cards row */}
        <div style={{
          display: "flex", gap: 18, marginTop: 18, justifyContent: "center",
          opacity: interpolate(frame, [110, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [110, 130], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}>
          {cards.map((card, i) => {
            const tilt = (i - 1) * 6;
            return (
              <div key={i} style={{
                width: 260, borderRadius: 20, padding: "20px 18px",
                background: card.bgGrad,
                border: `1px solid ${card.borderColor}40`,
                boxShadow: `0 8px 30px ${card.glowColor}`,
                transform: `rotate(${tilt}deg) perspective(800px) rotateY(${(i - 1) * -5}deg)`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontFamily, fontWeight: 600, fontSize: 13, color: card.borderColor }}>{card.badge}</span>
                  <span style={{
                    fontFamily, fontWeight: 600, fontSize: 12, color: card.borderColor,
                    background: `${card.borderColor}20`, padding: "3px 10px", borderRadius: 6,
                  }}>{card.status}</span>
                </div>
                <p style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "white", margin: "0 0 6px 0" }}>{card.name}</p>
                <p style={{ fontFamily, fontWeight: 900, fontSize: 32, color: card.borderColor, margin: 0 }}>{card.value}</p>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
