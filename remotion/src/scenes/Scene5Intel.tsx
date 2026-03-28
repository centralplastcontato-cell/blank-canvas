import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const Scene5Intel = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animated chart bars
  const bars = [
    { label: "Jan", height: 60, color: "#818cf8" },
    { label: "Fev", height: 45, color: "#818cf8" },
    { label: "Mar", height: 80, color: "#22d3ee" },
    { label: "Abr", height: 70, color: "#818cf8" },
    { label: "Mai", height: 95, color: "#f472b6" },
    { label: "Jun", height: 85, color: "#818cf8" },
  ];

  const insights = [
    { emoji: "🔥", text: "12 leads quentes para contatar hoje", delay: 80 },
    { emoji: "⚠️", text: "5 negociações paradas há +7 dias", delay: 95 },
    { emoji: "💡", text: "Melhor horário de resposta: 9h-11h", delay: 110 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", padding: 60 }}>
      {/* Badge */}
      <div
        style={{
          marginTop: 150,
          background: "rgba(34,211,238,0.15)",
          borderRadius: 100,
          padding: "10px 24px",
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <span style={{ fontFamily, fontWeight: 800, fontSize: 18, color: "#22d3ee" }}>
          🧠 INTELIGÊNCIA ARTIFICIAL
        </span>
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily, fontWeight: 900, fontSize: 56, color: "white", margin: 0, marginTop: 24,
          textAlign: "center", lineHeight: 1.1,
          opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [40, 0])}px)`,
        }}
      >
        Dados que
        <br />
        <span style={{ color: "#22d3ee" }}>vendem festas</span>
      </h2>

      {/* Chart */}
      <div
        style={{
          marginTop: 50, width: "100%", padding: "0 60px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.06)",
          padding: 32,
        }}
      >
        <p style={{ fontFamily, fontWeight: 800, fontSize: 18, color: "rgba(255,255,255,0.6)", margin: 0, marginBottom: 24 }}>
          Festas fechadas por mês
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 200, gap: 16 }}>
          {bars.map((bar, i) => {
            const barDelay = 30 + i * 8;
            const barHeight = spring({ frame: frame - barDelay, fps, config: { damping: 15, stiffness: 120 } });

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
                <div
                  style={{
                    width: "100%",
                    height: interpolate(barHeight, [0, 1], [0, bar.height * 2]),
                    borderRadius: 12,
                    background: `linear-gradient(180deg, ${bar.color}, ${bar.color}66)`,
                  }}
                />
                <span style={{ fontFamily, fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{bar.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insights */}
      <div style={{ marginTop: 30, width: "100%", padding: "0 60px", display: "flex", flexDirection: "column", gap: 12 }}>
        {insights.map((insight, i) => {
          const insightOpacity = interpolate(frame, [insight.delay, insight.delay + 15], [0, 1], { extrapolateRight: "clamp" });
          const insightY = spring({ frame: frame - insight.delay, fps, config: { damping: 20, stiffness: 200 } });

          return (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 16,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 16,
                padding: "16px 20px",
                border: "1px solid rgba(255,255,255,0.06)",
                opacity: insightOpacity,
                transform: `translateY(${interpolate(insightY, [0, 1], [30, 0])}px)`,
              }}
            >
              <span style={{ fontSize: 32 }}>{insight.emoji}</span>
              <p style={{ fontFamily, fontWeight: 400, fontSize: 17, color: "rgba(255,255,255,0.7)", margin: 0 }}>{insight.text}</p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
