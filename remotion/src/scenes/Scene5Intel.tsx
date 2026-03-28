import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GridBackground } from "../components/GridBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"], subsets: ["latin"] });

export const Scene5Intel = () => {
  const frame = useCurrentFrame();

  const badgeOpacity = interpolate(frame, [5, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [12, 30], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ padding: "0 50px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginTop: 260 }}>
          <p style={{
            fontFamily, fontWeight: 700, fontSize: 14, color: "#22d3ee",
            letterSpacing: 3, textTransform: "uppercase", margin: "0 0 12px 0", opacity: badgeOpacity,
          }}>INTELIGÊNCIA COMERCIAL</p>
          <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            <h2 style={{ fontFamily, fontWeight: 900, fontSize: 46, color: "white", margin: 0, lineHeight: 1.1 }}>
              Dados que{" "}<span style={{ color: "#22d3ee" }}>vendem por você</span>
            </h2>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 45 }}>
          <div style={{
            opacity: interpolate(frame, [35, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(frame, [35, 55], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            background: "rgba(255,255,255,0.04)", borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.06)", padding: "24px 20px",
          }}>
            <p style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "white", margin: "0 0 20px 0" }}>📈 Funil de Vendas</p>
            {[
              { label: "Novos Leads", value: 120, width: 100, color: "#22d3ee" },
              { label: "Em Negociação", value: 68, width: 57, color: "#6366f1" },
              { label: "Visita Agendada", value: 34, width: 28, color: "#f59e0b" },
              { label: "Fechados", value: 22, width: 18, color: "#22c55e" },
            ].map((step, i) => {
              const barDelay = 45 + i * 10;
              const barWidth = interpolate(frame, [barDelay, barDelay + 20], [0, step.width], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontFamily, fontWeight: 600, fontSize: 15, color: "rgba(255,255,255,0.6)" }}>{step.label}</span>
                    <span style={{ fontFamily, fontWeight: 800, fontSize: 15, color: step.color }}>{step.value}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.05)" }}>
                    <div style={{ height: 8, borderRadius: 4, width: `${barWidth}%`, background: step.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transform: `translateY(${interpolate(frame, [80, 100], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            background: "rgba(255,255,255,0.04)", borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.06)", padding: "24px 20px",
          }}>
            <p style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "white", margin: "0 0 8px 0" }}>⚡ Tempo Médio de Resposta</p>
            <p style={{ fontFamily, fontWeight: 900, fontSize: 52, color: "#22d3ee", margin: "0 0 4px 0" }}>3 min</p>
            <p style={{ fontFamily, fontWeight: 400, fontSize: 14, color: "rgba(255,255,255,0.3)", margin: 0 }}>Alertas automáticos para leads sem resposta</p>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
