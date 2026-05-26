import { AbsoluteFill, useCurrentFrame, spring, interpolate } from "remotion";
import { AnimatedText } from "../components/AnimatedText";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();

  const logoScale = spring({ frame: frame - 5, fps: 30, config: { damping: 10, stiffness: 80 } });
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  // Feature badges
  const features = ["CRM", "WhatsApp", "Agenda", "Financeiro", "Contratos", "IA"];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        {/* Logo */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "linear-gradient(135deg, hsl(215, 85%, 50%), hsl(42, 95%, 55%))",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            transform: `scale(${logoScale})`,
            boxShadow: `0 0 ${60 * glowPulse}px rgba(59,130,246,${0.4 * glowPulse})`,
          }}
        >
          <span style={{ fontSize: 50 }}>🎉</span>
        </div>

        <AnimatedText text="Tudo em um só lugar." fontSize={56} delay={10} />

        {/* Feature badges */}
        <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
          {features.map((f, i) => {
            const sp = spring({ frame: frame - 25 - i * 4, fps: 30, config: { damping: 14 } });
            const scale = interpolate(sp, [0, 1], [0.5, 1]);
            const opacity = interpolate(sp, [0, 1], [0, 1]);

            return (
              <div
                key={f}
                style={{
                  padding: "8px 20px",
                  borderRadius: 50,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 16,
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 600,
                  transform: `scale(${scale})`,
                  opacity,
                }}
              >
                {f}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20 }}>
          <AnimatedText text="celebrei.com.br" fontSize={24} delay={45} color="rgba(255,255,255,0.4)" fontWeight={400} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
