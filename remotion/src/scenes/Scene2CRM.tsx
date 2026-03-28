import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const Scene2CRM = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Image slides in from right
  const imgX = interpolate(
    spring({ frame: frame - 10, fps, config: { damping: 20, stiffness: 120 } }),
    [0, 1], [400, 0]
  );
  const imgOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = interpolate(frame, [10, 120], [1, 1.05], { extrapolateRight: "clamp" });

  // Title
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(spring({ frame, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [60, 0]);

  // Lead cards
  const leads = [
    { emoji: "🟢", name: "Ana Silva", status: "Visita agendada", value: "R$ 8.500", color: "#22c55e" },
    { emoji: "🟡", name: "Carlos Souza", status: "Orçamento enviado", value: "R$ 12.000", color: "#eab308" },
    { emoji: "🔵", name: "Maria Santos", status: "Negociando", value: "R$ 15.200", color: "#3b82f6" },
  ];

  // Stat counter animation
  const statProgress = interpolate(frame, [70, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ padding: 50 }}>
      {/* Badge */}
      <div style={{
        position: "absolute", top: 140, left: 50,
        background: "rgba(129,140,248,0.15)", borderRadius: 100, padding: "10px 24px",
        opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <span style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "#818cf8" }}>📊 CRM COMPLETO</span>
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: 220, left: 50, right: 50,
        opacity: titleOpacity, transform: `translateY(${titleY}px)`,
      }}>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 68, color: "white", margin: 0, lineHeight: 1.05 }}>
          Todos os leads
        </h2>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 68, margin: 0, lineHeight: 1.05,
          background: "linear-gradient(90deg, #818cf8, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          num só lugar
        </h2>
      </div>

      {/* Dashboard image with perspective */}
      <div style={{
        position: "absolute", top: 440, left: 20, right: 20,
        borderRadius: 20, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        opacity: imgOpacity,
        transform: `translateX(${imgX}px) scale(${imgScale})`,
      }}>
        <Img src={staticFile("images/crm-dashboard.jpg")} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      {/* Floating lead cards */}
      <div style={{
        position: "absolute", bottom: 320, left: 40, right: 40,
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        {leads.map((lead, i) => {
          const delay = 50 + i * 12;
          const cardSpring = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 180 } });
          const cardOpacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateRight: "clamp" });
          const cardX = interpolate(cardSpring, [0, 1], [i % 2 === 0 ? -200 : 200, 0]);

          return (
            <div key={i} style={{
              background: "rgba(255,255,255,0.07)", borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.1)", padding: "20px 24px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              opacity: cardOpacity, transform: `translateX(${cardX}px)`,
              borderLeft: `4px solid ${lead.color}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 36 }}>{lead.emoji}</span>
                <div>
                  <p style={{ fontFamily, fontWeight: 800, fontSize: 22, color: "white", margin: 0 }}>{lead.name}</p>
                  <p style={{ fontFamily, fontWeight: 400, fontSize: 15, color: "rgba(255,255,255,0.45)", margin: 0 }}>{lead.status}</p>
                </div>
              </div>
              <span style={{ fontFamily, fontWeight: 900, fontSize: 22, color: lead.color }}>{lead.value}</span>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div style={{
        position: "absolute", bottom: 140, left: 40, right: 40,
        display: "flex", gap: 20, justifyContent: "center",
        opacity: interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        {[
          { value: Math.round(847 * statProgress), label: "Leads ativos", color: "#818cf8" },
          { value: Math.round(34 * statProgress), label: "% Conversão", suffix: "%", color: "#22d3ee" },
          { value: Math.round(127 * statProgress), label: "Festas/mês", color: "#f472b6" },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, textAlign: "center", background: "rgba(255,255,255,0.05)",
            borderRadius: 20, padding: "20px 10px", border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <p style={{ fontFamily, fontWeight: 900, fontSize: 40, color: s.color, margin: 0 }}>
              {s.value}{s.suffix || ""}
            </p>
            <p style={{ fontFamily, fontWeight: 400, fontSize: 14, color: "rgba(255,255,255,0.4)", margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
