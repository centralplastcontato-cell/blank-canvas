import { AbsoluteFill, useCurrentFrame, spring, interpolate, Sequence } from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { MockWindow } from "../components/MockWindow";

const LEADS = [
  { name: "Maria Silva", status: "Quente 🔥", pkg: "Premium", date: "15/Mai", color: "#ef4444" },
  { name: "João Santos", status: "Morno ☀️", pkg: "Básico", date: "22/Jun", color: "#f59e0b" },
  { name: "Ana Costa", status: "Novo 🆕", pkg: "Gold", date: "08/Jul", color: "#3b82f6" },
  { name: "Pedro Lima", status: "Pronto ✅", pkg: "Premium", date: "10/Mai", color: "#22c55e" },
];

export const SceneCRM: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Section badge */}
      <Sequence from={0} durationInFrames={140}>
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)" }}>
          <AnimatedText text="📋 CRM & Kanban" fontSize={36} delay={0} color="rgba(255,255,255,0.9)" />
        </div>
      </Sequence>

      <MockWindow title="CRM — Pipeline de Leads" delay={10} width={1300} height={600}>
        <div style={{ display: "flex", height: "100%", padding: 20, gap: 16 }}>
          {["Novos", "Em Negociação", "Proposta Enviada", "Fechado"].map((col, ci) => {
            const colSpring = spring({ frame: frame - 25 - ci * 5, fps: 30, config: { damping: 18 } });
            const colOpacity = interpolate(colSpring, [0, 1], [0, 1]);
            const colY = interpolate(colSpring, [0, 1], [40, 0]);

            return (
              <div
                key={col}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 12,
                  padding: 14,
                  opacity: colOpacity,
                  transform: `translateY(${colY}px)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'Nunito', sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    paddingBottom: 8,
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {col}
                </div>

                {ci < LEADS.length && (
                  <LeadCard lead={LEADS[ci]} delay={35 + ci * 8} />
                )}
                {ci === 0 && <LeadCard lead={{ name: "Carlos Mendes", status: "Novo 🆕", pkg: "Especial", date: "20/Jun", color: "#8b5cf6" }} delay={50} />}
              </div>
            );
          })}
        </div>
      </MockWindow>
    </AbsoluteFill>
  );
};

const LeadCard: React.FC<{ lead: typeof LEADS[0]; delay: number }> = ({ lead, delay }) => {
  const frame = useCurrentFrame();
  const sp = spring({ frame: frame - delay, fps: 30, config: { damping: 15, stiffness: 150 } });
  const scale = interpolate(sp, [0, 1], [0.8, 1]);
  const opacity = interpolate(sp, [0, 1], [0, 1]);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.07)",
        borderRadius: 10,
        padding: 14,
        transform: `scale(${scale})`,
        opacity,
        borderLeft: `3px solid ${lead.color}`,
      }}
    >
      <div style={{ color: "white", fontSize: 15, fontWeight: 600, fontFamily: "'Nunito', sans-serif" }}>
        {lead.name}
      </div>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 4, fontFamily: "'Nunito', sans-serif" }}>
        {lead.pkg} · {lead.date}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          color: lead.color,
          background: `${lead.color}22`,
          padding: "3px 8px",
          borderRadius: 6,
          display: "inline-block",
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 600,
        }}
      >
        {lead.status}
      </div>
    </div>
  );
};
