import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const Scene5Intel = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // AI dashboard image
  const dashOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const dashY = interpolate(spring({ frame: frame - 10, fps, config: { damping: 20, stiffness: 150 } }), [0, 1], [80, 0]);

  // Animated chart bars
  const bars = [
    { label: "Jan", h: 55, color: "#818cf8" },
    { label: "Fev", h: 42, color: "#818cf8" },
    { label: "Mar", h: 78, color: "#22d3ee" },
    { label: "Abr", h: 65, color: "#818cf8" },
    { label: "Mai", h: 92, color: "#f472b6" },
    { label: "Jun", h: 85, color: "#22d3ee" },
    { label: "Jul", h: 98, color: "#f472b6" },
  ];

  const insights = [
    { emoji: "🔥", text: "12 leads quentes para hoje", color: "#ef4444" },
    { emoji: "⚡", text: "Melhor horário: 9h-11h", color: "#eab308" },
    { emoji: "📊", text: "Conversão subiu 23% este mês", color: "#22c55e" },
  ];

  return (
    <AbsoluteFill>
      {/* Badge */}
      <div style={{
        position: "absolute", top: 130, left: "50%", transform: "translateX(-50%)",
        background: "rgba(34,211,238,0.15)", borderRadius: 100, padding: "12px 28px",
        opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <span style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "#22d3ee" }}>🧠 INTELIGÊNCIA ARTIFICIAL</span>
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: 210, left: 50, right: 50, textAlign: "center",
        opacity: interpolate(frame, [3, 20], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(spring({ frame: frame - 3, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [50, 0])}px)`,
      }}>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 60, color: "white", margin: 0, lineHeight: 1.05 }}>
          Dados que
        </h2>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 60, color: "#22d3ee", margin: 0, lineHeight: 1.05 }}>
          vendem festas
        </h2>
      </div>

      {/* AI Dashboard image */}
      <div style={{
        position: "absolute", top: 400, left: 25, right: 25,
        borderRadius: 20, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        opacity: dashOpacity, transform: `translateY(${dashY}px)`,
      }}>
        <Img src={staticFile("images/ai-analytics.jpg")} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      {/* Chart overlay */}
      <div style={{
        position: "absolute", top: 780, left: 40, right: 40,
        background: "rgba(10,15,26,0.9)", borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px",
      }}>
        <p style={{ fontFamily, fontWeight: 800, fontSize: 16, color: "rgba(255,255,255,0.5)", margin: 0, marginBottom: 16 }}>
          Festas fechadas por mês
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 140, gap: 8 }}>
          {bars.map((bar, i) => {
            const barDelay = 35 + i * 6;
            const barH = spring({ frame: frame - barDelay, fps, config: { damping: 15, stiffness: 120 } });
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                <div style={{
                  width: "100%", height: interpolate(barH, [0, 1], [0, bar.h * 1.4]),
                  borderRadius: 8, background: `linear-gradient(180deg, ${bar.color}, ${bar.color}44)`,
                }} />
                <span style={{ fontFamily, fontWeight: 400, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{bar.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Insights */}
      <div style={{
        position: "absolute", bottom: 200, left: 40, right: 40,
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {insights.map((ins, i) => {
          const delay = 80 + i * 10;
          const insOpacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: "clamp" });
          const insX = interpolate(spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [-150, 0]);
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: "rgba(255,255,255,0.05)", borderRadius: 16, padding: "14px 18px",
              border: "1px solid rgba(255,255,255,0.06)",
              opacity: insOpacity, transform: `translateX(${insX}px)`,
            }}>
              <span style={{ fontSize: 28 }}>{ins.emoji}</span>
              <p style={{ fontFamily, fontWeight: 400, fontSize: 17, color: "rgba(255,255,255,0.75)", margin: 0 }}>{ins.text}</p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
