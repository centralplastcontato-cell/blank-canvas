import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

const CARD_STYLE: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  borderRadius: 24,
  border: "1px solid rgba(255,255,255,0.08)",
  padding: 28,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

export const Scene2CRM = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const leads = [
    { emoji: "🟢", name: "Ana Silva", status: "Visita agendada", value: "R$ 8.500" },
    { emoji: "🟡", name: "Carlos Souza", status: "Orçamento enviado", value: "R$ 12.000" },
    { emoji: "🔴", name: "Maria Santos", status: "Novo lead", value: "R$ 6.800" },
    { emoji: "🟣", name: "Pedro Lima", status: "Negociando", value: "R$ 15.200" },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 60 }}>
      {/* Badge */}
      <div
        style={{
          position: "absolute",
          top: 180,
          background: "rgba(129,140,248,0.15)",
          borderRadius: 100,
          padding: "10px 24px",
          opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [20, 0])}px)`,
        }}
      >
        <span style={{ fontFamily, fontWeight: 800, fontSize: 18, color: "#818cf8" }}>
          📊 CRM COMPLETO
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 260,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${interpolate(titleY, [0, 1], [60, 0])}px)`,
        }}
      >
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 64, color: "white", margin: 0, lineHeight: 1.1 }}>
          Gerencie todos
          <br />
          os seus leads
        </h2>
        <p style={{ fontFamily, fontWeight: 400, fontSize: 24, color: "rgba(255,255,255,0.5)", marginTop: 16 }}>
          Kanban visual com arraste e solte
        </p>
      </div>

      {/* Lead cards */}
      <div style={{ position: "absolute", top: 560, width: "100%", padding: "0 60px", display: "flex", flexDirection: "column", gap: 16 }}>
        {leads.map((lead, i) => {
          const delay = 30 + i * 10;
          const cardSpring = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 200 } });
          const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });

          return (
            <div
              key={i}
              style={{
                ...CARD_STYLE,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: cardOpacity,
                transform: `translateY(${interpolate(cardSpring, [0, 1], [60, 0])}px)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 40 }}>{lead.emoji}</span>
                <div>
                  <p style={{ fontFamily, fontWeight: 800, fontSize: 22, color: "white", margin: 0 }}>{lead.name}</p>
                  <p style={{ fontFamily, fontWeight: 400, fontSize: 16, color: "rgba(255,255,255,0.45)", margin: 0 }}>{lead.status}</p>
                </div>
              </div>
              <span style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "#818cf8" }}>{lead.value}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom stat */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          display: "flex",
          gap: 40,
          opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        {[
          { label: "Leads ativos", value: "847" },
          { label: "Taxa conversão", value: "34%" },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <p style={{ fontFamily, fontWeight: 900, fontSize: 48, color: "#22d3ee", margin: 0 }}>{stat.value}</p>
            <p style={{ fontFamily, fontWeight: 400, fontSize: 16, color: "rgba(255,255,255,0.4)", margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
