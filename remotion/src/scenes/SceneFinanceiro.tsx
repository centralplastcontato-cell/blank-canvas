import { AbsoluteFill, useCurrentFrame, spring, interpolate, Sequence } from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { MockWindow } from "../components/MockWindow";

export const SceneFinanceiro: React.FC = () => {
  const frame = useCurrentFrame();

  // Animated bar chart
  const bars = [
    { label: "Jan", value: 45, color: "#3b82f6" },
    { label: "Fev", value: 62, color: "#3b82f6" },
    { label: "Mar", value: 78, color: "#3b82f6" },
    { label: "Abr", value: 55, color: "#3b82f6" },
    { label: "Mai", value: 90, color: "#22c55e" },
    { label: "Jun", value: 85, color: "#22c55e" },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Sequence from={0} durationInFrames={140}>
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)" }}>
          <AnimatedText text="💰 Financeiro Completo" fontSize={36} delay={0} color="rgba(255,255,255,0.9)" />
        </div>
      </Sequence>

      <MockWindow title="Financeiro — Dashboard" delay={10} width={1300} height={600}>
        <div style={{ padding: 24, display: "flex", gap: 24, height: "100%" }}>
          {/* KPI Cards */}
          <div style={{ width: 300, display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Receita Mensal", value: "R$ 142.500", icon: "📈", color: "#22c55e" },
              { label: "Despesas", value: "R$ 38.200", icon: "📉", color: "#ef4444" },
              { label: "Lucro Líquido", value: "R$ 104.300", icon: "💎", color: "#3b82f6" },
              { label: "Festas Fechadas", value: "23", icon: "🎂", color: "#f59e0b" },
            ].map((kpi, i) => {
              const sp = spring({ frame: frame - 20 - i * 6, fps: 30, config: { damping: 16 } });
              const x = interpolate(sp, [0, 1], [-60, 0]);
              const opacity = interpolate(sp, [0, 1], [0, 1]);

              return (
                <div
                  key={kpi.label}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 12,
                    padding: "16px 20px",
                    opacity,
                    transform: `translateX(${x}px)`,
                    borderLeft: `3px solid ${kpi.color}`,
                  }}
                >
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
                    {kpi.icon} {kpi.label}
                  </div>
                  <div style={{ color: kpi.color, fontSize: 26, fontWeight: 800, fontFamily: "'Fredoka', sans-serif", marginTop: 4 }}>
                    {kpi.value}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontFamily: "'Nunito', sans-serif", fontWeight: 600, marginBottom: 16 }}>
              Receita por Mês (mil R$)
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 20, padding: "0 20px" }}>
              {bars.map((bar, i) => {
                const barDelay = 35 + i * 6;
                const sp = spring({ frame: frame - barDelay, fps: 30, config: { damping: 14, stiffness: 100 } });
                const height = interpolate(sp, [0, 1], [0, bar.value * 3.5]);

                return (
                  <div key={bar.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                      {Math.round(bar.value * interpolate(sp, [0, 1], [0, 1]))}k
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height,
                        background: `linear-gradient(180deg, ${bar.color}, ${bar.color}88)`,
                        borderRadius: "8px 8px 4px 4px",
                        boxShadow: `0 0 20px ${bar.color}33`,
                      }}
                    />
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "'Nunito', sans-serif" }}>
                      {bar.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </MockWindow>
    </AbsoluteFill>
  );
};
