import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const Scene4Agenda = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const events = [
    { emoji: "🎂", name: "Festa da Sofia", time: "14:00 - 18:00", guests: "45 convidados", color: "#f472b6" },
    { emoji: "🎈", name: "Aniversário do Lucas", time: "10:00 - 14:00", guests: "60 convidados", color: "#818cf8" },
    { emoji: "🎪", name: "Festa da Helena", time: "16:00 - 20:00", guests: "35 convidados", color: "#22d3ee" },
  ];

  const weekDays = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
  const dates = [12, 13, 14, 15, 16, 17, 18];

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", padding: 60 }}>
      {/* Badge */}
      <div
        style={{
          marginTop: 150,
          background: "rgba(244,114,182,0.15)",
          borderRadius: 100,
          padding: "10px 24px",
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <span style={{ fontFamily, fontWeight: 800, fontSize: 18, color: "#f472b6" }}>
          📅 AGENDA INTELIGENTE
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
        Todas as festas
        <br />
        <span style={{ color: "#f472b6" }}>organizadas</span>
      </h2>

      {/* Calendar strip */}
      <div
        style={{
          marginTop: 40, width: "100%", padding: "0 40px",
          display: "flex", justifyContent: "space-between",
          opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {weekDays.map((day, i) => {
          const isActive = i === 5; // Saturday
          const cellDelay = 25 + i * 4;
          const cellSpring = spring({ frame: frame - cellDelay, fps, config: { damping: 20, stiffness: 200 } });

          return (
            <div
              key={i}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                opacity: interpolate(cellSpring, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(cellSpring, [0, 1], [20, 0])}px)`,
              }}
            >
              <span style={{ fontFamily, fontWeight: 400, fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{day}</span>
              <div
                style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: isActive ? "linear-gradient(135deg, #f472b6, #818cf8)" : "rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: isActive ? "none" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span style={{ fontFamily, fontWeight: 800, fontSize: 20, color: isActive ? "white" : "rgba(255,255,255,0.5)" }}>
                  {dates[i]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Event cards */}
      <div style={{ marginTop: 36, width: "100%", padding: "0 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        {events.map((event, i) => {
          const delay = 50 + i * 12;
          const cardSpring = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 200 } });
          const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });

          return (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.06)",
                borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                padding: 24,
                display: "flex", alignItems: "center", gap: 20,
                opacity: cardOpacity,
                transform: `translateY(${interpolate(cardSpring, [0, 1], [60, 0])}px)`,
                borderLeft: `4px solid ${event.color}`,
              }}
            >
              <span style={{ fontSize: 48 }}>{event.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily, fontWeight: 800, fontSize: 22, color: "white", margin: 0 }}>{event.name}</p>
                <p style={{ fontFamily, fontWeight: 400, fontSize: 16, color: "rgba(255,255,255,0.45)", margin: 0, marginTop: 4 }}>{event.time}</p>
                <p style={{ fontFamily, fontWeight: 400, fontSize: 14, color: event.color, margin: 0, marginTop: 2 }}>{event.guests}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature tags */}
      <div
        style={{
          marginTop: 36, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", padding: "0 40px",
          opacity: interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {["Checklist", "Contratos", "Financeiro", "Pré-festa"].map((tag, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 100, padding: "8px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontFamily, fontWeight: 800, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{tag}</span>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
