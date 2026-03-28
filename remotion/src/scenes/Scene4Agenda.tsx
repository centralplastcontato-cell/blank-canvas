import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const Scene4Agenda = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const events = [
    { emoji: "🎂", name: "Festa da Sofia", time: "14h-18h", guests: 45, color: "#f472b6", unit: "Unidade Centro" },
    { emoji: "🎈", name: "Aniver. do Lucas", time: "10h-14h", guests: 60, color: "#818cf8", unit: "Unidade Norte" },
    { emoji: "🎪", name: "Festa da Helena", time: "16h-20h", guests: 35, color: "#22d3ee", unit: "Unidade Sul" },
  ];

  // Dashboard image
  const dashOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const dashScale = interpolate(frame, [15, 120], [1.05, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* Badge */}
      <div style={{
        position: "absolute", top: 130, left: "50%", transform: "translateX(-50%)",
        background: "rgba(244,114,182,0.15)", borderRadius: 100, padding: "12px 28px",
        opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <span style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "#f472b6" }}>📅 AGENDA INTELIGENTE</span>
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: 210, left: 50, right: 50, textAlign: "center",
        opacity: interpolate(frame, [3, 20], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(spring({ frame: frame - 3, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [50, 0])}px)`,
      }}>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 60, color: "white", margin: 0, lineHeight: 1.05 }}>
          Festas organizadas
        </h2>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 60, color: "#f472b6", margin: 0, lineHeight: 1.05 }}>
          automaticamente
        </h2>
      </div>

      {/* Dashboard image */}
      <div style={{
        position: "absolute", top: 420, left: 30, right: 30,
        borderRadius: 20, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        opacity: dashOpacity, transform: `scale(${dashScale})`,
      }}>
        <Img src={staticFile("images/agenda-dashboard.jpg")} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      {/* Floating event cards */}
      <div style={{
        position: "absolute", bottom: 260, left: 35, right: 35,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {events.map((event, i) => {
          const delay = 45 + i * 12;
          const cardSpring = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 200 } });
          const cardOpacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: "clamp" });
          const cardScale = interpolate(cardSpring, [0, 1], [0.9, 1]);

          return (
            <div key={i} style={{
              background: "rgba(10,15,26,0.85)", borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.1)", padding: "18px 22px",
              display: "flex", alignItems: "center", gap: 16,
              opacity: cardOpacity, transform: `scale(${cardScale})`,
              borderLeft: `4px solid ${event.color}`,
            }}>
              <span style={{ fontSize: 44 }}>{event.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "white", margin: 0 }}>{event.name}</p>
                  <span style={{ fontFamily, fontWeight: 800, fontSize: 14, color: event.color }}>{event.time}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <p style={{ fontFamily, fontWeight: 400, fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>{event.unit}</p>
                  <p style={{ fontFamily, fontWeight: 400, fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>{event.guests} convidados</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Features row */}
      <div style={{
        position: "absolute", bottom: 130, left: 30, right: 30,
        display: "flex", gap: 10, justifyContent: "center",
        opacity: interpolate(frame, [95, 115], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        {["Checklist", "Pré-festa", "Contratos", "Financeiro"].map((tag, i) => (
          <div key={i} style={{
            background: "rgba(244,114,182,0.12)", borderRadius: 100, padding: "10px 20px",
            border: "1px solid rgba(244,114,182,0.2)",
          }}>
            <span style={{ fontFamily, fontWeight: 800, fontSize: 15, color: "#f472b6" }}>{tag}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
