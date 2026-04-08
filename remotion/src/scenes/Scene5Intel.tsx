import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
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
      <AbsoluteFill style={{ padding: "0 80px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Title */}
        <div>
          <p style={{
            fontFamily, fontWeight: 700, fontSize: 26, color: "#22d3ee",
            letterSpacing: 5, textTransform: "uppercase", margin: "0 0 12px 0", opacity: badgeOpacity,
          }}>INTELIGÊNCIA COMERCIAL</p>
          <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            <h2 style={{ fontFamily, fontWeight: 900, fontSize: 72, color: "white", margin: 0, lineHeight: 1.05 }}>
              Dados que{" "}<span style={{ color: "#22d3ee" }}>vendem por você</span>
            </h2>
          </div>
        </div>

        {/* Funil de Vendas */}
        <div style={{
          marginTop: 40,
          opacity: interpolate(frame, [35, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [35, 55], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          background: "rgba(255,255,255,0.04)", borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)", padding: "28px 28px",
        }}>
          <p style={{ fontFamily, fontWeight: 800, fontSize: 28, color: "white", margin: "0 0 20px 0" }}>⚡ Funil de Vendas</p>
          {[
            { label: "Novos Leads", value: 120, delta: "+43 este mês", width: 100, color: "#22d3ee" },
            { label: "Em Negociação", value: 68, delta: "+17 este mês", width: 57, color: "#6366f1" },
            { label: "Visita Agendada", value: 34, delta: "+8 este mês", width: 28, color: "#f59e0b" },
            { label: "Fechados", value: 22, delta: "+4 este mês", width: 18, color: "#22c55e" },
          ].map((step, i) => {
            const barDelay = 45 + i * 10;
            const barWidth = interpolate(frame, [barDelay, barDelay + 20], [0, step.width], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontFamily, fontWeight: 600, fontSize: 22, color: "rgba(255,255,255,0.7)" }}>{step.label}</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span style={{ fontFamily, fontWeight: 500, fontSize: 16, color: "#22c55e" }}>{step.delta}</span>
                    <span style={{ fontFamily, fontWeight: 800, fontSize: 26, color: "white" }}>{step.value}</span>
                  </div>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.05)" }}>
                  <div style={{ height: 10, borderRadius: 5, width: `${barWidth}%`, background: step.color }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Two cards side by side */}
        <div style={{
          display: "flex", gap: 20, marginTop: 20,
          opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [80, 100], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        }}>
          <div style={{
            flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)", padding: "24px 24px",
          }}>
            <p style={{ fontFamily, fontWeight: 800, fontSize: 24, color: "white", margin: "0 0 8px 0" }}>⚡ Tempo Médio de Resposta</p>
            <p style={{ fontFamily, fontWeight: 900, fontSize: 64, color: "#22d3ee", margin: "0 0 6px 0", lineHeight: 1 }}>3 min</p>
            <p style={{ fontFamily, fontWeight: 400, fontSize: 18, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.3 }}>Alertas automáticos para leads aguardando resposta.</p>
          </div>
          <div style={{
            flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.08)", padding: "24px 24px",
          }}>
            <p style={{ fontFamily, fontWeight: 800, fontSize: 24, color: "white", margin: "0 0 8px 0" }}>🚀 Taxa de Conversão</p>
            <p style={{ fontFamily, fontWeight: 900, fontSize: 64, color: "white", margin: "0 0 6px 0", lineHeight: 1 }}>22%</p>
            <p style={{ fontFamily, fontWeight: 400, fontSize: 18, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.3 }}>Lead fechado a cada <span style={{ fontWeight: 800, color: "white" }}>5,4 contatos</span></p>
          </div>
        </div>

        {/* Alert */}
        <div style={{
          marginTop: 20,
          opacity: interpolate(frame, [105, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [105, 120], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          background: "rgba(245,158,11,0.08)", borderRadius: 22,
          border: "1px solid rgba(245,158,11,0.2)", padding: "22px 26px",
        }}>
          <p style={{ fontFamily, fontWeight: 800, fontSize: 24, color: "#f59e0b", margin: "0 0 8px 0" }}>⚠️ Oportunidade de ouro!</p>
          <p style={{ fontFamily, fontWeight: 400, fontSize: 22, color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.4 }}>
            Foque no follow-up: você tem <span style={{ fontWeight: 800, color: "white" }}>74 leads em negociação</span>, prontos pra fechar!
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
