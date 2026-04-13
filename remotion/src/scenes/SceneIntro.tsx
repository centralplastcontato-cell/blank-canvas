import { AbsoluteFill, useCurrentFrame, spring, interpolate } from "remotion";
import { AnimatedText } from "../components/AnimatedText";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();

  // Logo circle
  const logoScale = spring({ frame: frame - 5, fps: 30, config: { damping: 12, stiffness: 100 } });
  const logoRotate = interpolate(frame, [0, 150], [0, 360]);

  // Subtitle
  const subOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY = interpolate(frame, [50, 70], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Decorative rings
  const ring1 = interpolate(frame, [0, 150], [0, 120]);
  const ring2 = interpolate(frame, [0, 150], [0, -80]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Decorative rings */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          border: "2px solid rgba(255,255,255,0.05)",
          borderRadius: "50%",
          transform: `rotate(${ring1}deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          border: "1px solid rgba(255,255,255,0.03)",
          borderRadius: "50%",
          transform: `rotate(${ring2}deg)`,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        {/* Logo */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "linear-gradient(135deg, hsl(215, 85%, 50%), hsl(42, 95%, 55%))",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            transform: `scale(${logoScale})`,
            boxShadow: "0 0 60px rgba(59,130,246,0.4)",
          }}
        >
          <span style={{ fontSize: 60, transform: `rotate(${logoRotate * 0.02}deg)` }}>🎉</span>
        </div>

        <AnimatedText text="FestejaAI" fontSize={80} delay={15} color="white" />
        <AnimatedText
          text="Plataforma Completa para Buffets"
          fontSize={32}
          delay={25}
          color="rgba(255,255,255,0.7)"
          fontWeight={400}
        />

        <div
          style={{
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            marginTop: 20,
            padding: "12px 32px",
            borderRadius: 50,
            background: "linear-gradient(135deg, hsl(215, 85%, 50%), hsl(155, 75%, 38%))",
            color: "white",
            fontSize: 20,
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          ▶ Conheça os Módulos
        </div>
      </div>
    </AbsoluteFill>
  );
};
