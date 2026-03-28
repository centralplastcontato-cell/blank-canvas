import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const Scene6Metrics = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const metrics = [
    { emoji: "🚀", value: 40, suffix: "%", label: "mais conversões", color: "#818cf8", delay: 20 },
    { emoji: "⚡", value: 3, suffix: "seg", label: "tempo de resposta", color: "#22d3ee", delay: 35 },
    { emoji: "🎯", value: 5000, suffix: "+", label: "leads gerenciados", color: "#f472b6", delay: 50 },
    { emoji: "📈", value: 24, suffix: "/7", label: "sempre ativo", color: "#22c55e", delay: 65 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 60 }}>
      {/* Title */}
      <h2
        style={{
          fontFamily, fontWeight: 900, fontSize: 56, color: "white", margin: 0,
          textAlign: "center", lineHeight: 1.1,
          position: "absolute", top: 280,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(spring({ frame, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [40, 0])}px)`,
        }}
      >
        Resultados que
        <br />
        <span style={{ background: "linear-gradient(90deg, #818cf8, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          comprovam
        </span>
      </h2>

      {/* Metric cards */}
      <div style={{ position: "absolute", top: 520, width: "100%", padding: "0 50px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {metrics.map((metric, i) => {
          const cardSpring = spring({ frame: frame - metric.delay, fps, config: { damping: 15, stiffness: 150 } });
          const cardOpacity = interpolate(frame, [metric.delay, metric.delay + 15], [0, 1], { extrapolateRight: "clamp" });

          // Animated counter
          const counterProgress = interpolate(frame, [metric.delay + 10, metric.delay + 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const displayValue = Math.round(metric.value * counterProgress);

          return (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.06)",
                borderRadius: 28,
                border: "1px solid rgba(255,255,255,0.08)",
                padding: 32,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                opacity: cardOpacity,
                transform: `scale(${interpolate(cardSpring, [0, 1], [0.8, 1])})`,
              }}
            >
              <span style={{ fontSize: 56 }}>{metric.emoji}</span>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span style={{ fontFamily, fontWeight: 900, fontSize: 56, color: metric.color }}>
                  {displayValue}
                </span>
                <span style={{ fontFamily, fontWeight: 800, fontSize: 28, color: metric.color }}>
                  {metric.suffix}
                </span>
              </div>
              <p style={{ fontFamily, fontWeight: 400, fontSize: 16, color: "rgba(255,255,255,0.45)", margin: 0, textAlign: "center" }}>
                {metric.label}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
