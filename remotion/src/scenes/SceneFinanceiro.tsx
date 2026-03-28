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

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ padding: "0 55px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginTop: 260 }}>
          <p style={{
            fontFamily, fontWeight: 700, fontSize: 22, color: "#f59e0b",
            letterSpacing: 4, textTransform: "uppercase", margin: "0 0 16px 0", opacity: badgeOpacity,
          }}>CONTROLE FINANCEIRO</p>
          <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            <h2 style={{ fontFamily, fontWeight: 900, fontSize: 62, color: "white", margin: 0, lineHeight: 1.1 }}>
              Pagamentos e receita{" "}<span style={{ color: "#f59e0b" }}>sob controle</span>
            </h2>
          </div>
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 50 }}>
          {[
            { label: "Receita Mês", value: "R$ 48.500", color: "#22c55e" },
            { label: "Pendente", value: "R$ 12.200", color: "#f59e0b" },
          ].map((card, i) => {
            const delay = 35 + i * 12;
            return (
              <div key={i} style={{
                flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.06)", padding: "28px 24px",
                opacity: interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                transform: `translateY(${interpolate(frame, [delay, delay + 15], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
              }}>
                <p style={{ fontFamily, fontWeight: 400, fontSize: 20, color: "rgba(255,255,255,0.4)", margin: "0 0 8px 0" }}>{card.label}</p>
                <p style={{ fontFamily, fontWeight: 900, fontSize: 42, color: card.color, margin: 0 }}>{card.value}</p>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: 22,
          opacity: interpolate(frame, [55, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [55, 75], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          background: "rgba(255,255,255,0.04)", borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.06)", padding: "28px 24px",
        }}>
          <p style={{ fontFamily, fontWeight: 800, fontSize: 28, color: "white", margin: "0 0 20px 0" }}>💰 Pagamentos</p>
          {payments.map((pay, i) => {
            const payDelay = 65 + i * 14;
            const payOpacity = interpolate(frame, [payDelay, payDelay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 0", opacity: payOpacity,
                borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <span style={{ fontFamily, fontWeight: 600, fontSize: 24, color: "rgba(255,255,255,0.8)" }}>{pay.name}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontFamily, fontWeight: 700, fontSize: 24, color: "white" }}>{pay.value}</span>
                  <span style={{
                    fontFamily, fontWeight: 600, fontSize: 16, color: pay.statusColor,
                    background: `${pay.statusColor}18`, padding: "5px 12px", borderRadius: 8,
                  }}>{pay.status}</span>
                </div>
              </div>
            );
          })}
        </div>

        <p style={{
          fontFamily, fontWeight: 400, fontSize: 20, color: "rgba(255,255,255,0.25)", margin: "30px 0 0 0",
          opacity: interpolate(frame, [110, 125], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>Geração automática de cards para cada obrigação</p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
