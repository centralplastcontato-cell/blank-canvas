import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const Scene6Metrics = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background party image
  const bgOpacity = interpolate(frame, [0, 30], [0, 0.25], { extrapolateRight: "clamp" });
  const bgScale = interpolate(frame, [0, 140], [1.1, 1.2], { extrapolateRight: "clamp" });

  const metrics = [
    { emoji: "🚀", value: 40, suffix: "%", label: "mais conversões", color: "#818cf8" },
    { emoji: "⚡", value: 3, suffix: "s", label: "tempo de resposta", color: "#22d3ee" },
    { emoji: "🎯", value: 5000, suffix: "+", label: "leads gerenciados", color: "#f472b6" },
    { emoji: "📈", value: 24, suffix: "/7", label: "sempre ativo", color: "#22c55e" },
  ];

  const features = [
    { icon: "📊", name: "CRM Completo" },
    { icon: "💬", name: "WhatsApp Bot" },
    { icon: "📅", name: "Agenda Smart" },
    { icon: "🧠", name: "IA Comercial" },
    { icon: "📄", name: "Contratos" },
    { icon: "💰", name: "Financeiro" },
  ];

  return (
    <AbsoluteFill>
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Img src={staticFile("images/happy-party.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${bgScale})`, opacity: bgOpacity,
        }} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,15,26,0.85) 0%, rgba(10,15,26,0.95) 100%)" }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 200, left: 50, right: 50, textAlign: "center",
        opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(spring({ frame, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [50, 0])}px)`,
      }}>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 60, color: "white", margin: 0, lineHeight: 1.05 }}>
          Resultados que
        </h2>
        <h2 style={{
          fontFamily, fontWeight: 900, fontSize: 60, margin: 0, lineHeight: 1.05,
          background: "linear-gradient(90deg, #818cf8, #f472b6, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          comprovam
        </h2>
      </div>

      {/* Metric cards grid */}
      <div style={{
        position: "absolute", top: 430, left: 40, right: 40,
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18,
      }}>
        {metrics.map((m, i) => {
          const delay = 15 + i * 10;
          const cardSpring = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 150 } });
          const cardOpacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateRight: "clamp" });
          const counterProgress = interpolate(frame, [delay + 8, delay + 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const displayValue = Math.round(m.value * counterProgress);

          return (
            <div key={i} style={{
              background: "rgba(255,255,255,0.06)", borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.1)", padding: "28px 16px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              opacity: cardOpacity, transform: `scale(${interpolate(cardSpring, [0, 1], [0.7, 1])})`,
            }}>
              <span style={{ fontSize: 50 }}>{m.emoji}</span>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span style={{ fontFamily, fontWeight: 900, fontSize: 52, color: m.color }}>{displayValue}</span>
                <span style={{ fontFamily, fontWeight: 800, fontSize: 26, color: m.color }}>{m.suffix}</span>
              </div>
              <p style={{ fontFamily, fontWeight: 400, fontSize: 15, color: "rgba(255,255,255,0.45)", margin: 0, textAlign: "center" }}>{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Feature chips */}
      <div style={{
        position: "absolute", bottom: 240, left: 30, right: 30,
        display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center",
        opacity: interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        {features.map((f, i) => {
          const delay = 75 + i * 5;
          const chipScale = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 200 } });
          return (
            <div key={i} style={{
              background: "rgba(255,255,255,0.08)", borderRadius: 100, padding: "12px 22px",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex", alignItems: "center", gap: 8,
              transform: `scale(${interpolate(chipScale, [0, 1], [0.8, 1])})`,
            }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <span style={{ fontFamily, fontWeight: 800, fontSize: 15, color: "rgba(255,255,255,0.7)" }}>{f.name}</span>
            </div>
          );
        })}
      </div>

      {/* Financial dashboard image */}
      <div style={{
        position: "absolute", bottom: 80, left: 30, right: 30,
        borderRadius: 16, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        opacity: interpolate(frame, [85, 105], [0, 0.6], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(spring({ frame: frame - 85, fps, config: { damping: 20, stiffness: 150 } }), [0, 1], [40, 0])}px)`,
      }}>
        <Img src={staticFile("images/financial-dashboard.jpg")} style={{ width: "100%", height: 140, objectFit: "cover", objectPosition: "top" }} />
      </div>
    </AbsoluteFill>
  );
};
