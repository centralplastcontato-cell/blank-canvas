import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GridBackground } from "../components/GridBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"], subsets: ["latin"] });

export const SceneFinal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const logoOp = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textOp = interpolate(frame, [25, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textY = interpolate(frame, [25, 50], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [50, 75], [0, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [65, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtle glow pulse
  const glowPulse = interpolate(frame, [0, 60, 120, 180], [0.3, 0.6, 0.3, 0.6], { extrapolateRight: "extend" });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* Logo icon */}
        <div style={{
          opacity: logoOp,
          transform: `scale(${logoScale})`,
          width: 140, height: 140, borderRadius: 32,
          background: "linear-gradient(135deg, #7c3aed, #6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 ${60 * glowPulse}px ${30 * glowPulse}px rgba(99,102,241,${glowPulse})`,
        }}>
          <span style={{ fontFamily, fontWeight: 900, fontSize: 80, color: "white" }}>C</span>
        </div>

        {/* Brand name */}
        <div style={{ opacity: textOp, transform: `translateY(${textY}px)`, marginTop: 30 }}>
          <h1 style={{ fontFamily, fontWeight: 900, fontSize: 90, color: "white", margin: 0, textAlign: "center" }}>
            Celeb<span style={{ color: "#7c3aed" }}>rei</span>
          </h1>
        </div>

        {/* Divider line */}
        <div style={{
          width: lineW, height: 4, borderRadius: 2, marginTop: 24,
          background: "linear-gradient(90deg, #7c3aed, #6366f1)",
        }} />

        {/* Tagline */}
        <p style={{
          fontFamily, fontWeight: 400, fontSize: 28, color: "rgba(255,255,255,0.45)",
          margin: "24px 0 0 0", textAlign: "center", letterSpacing: 2, opacity: subOp,
          lineHeight: 1.5,
        }}>
          Plataforma completa para gerenciamento<br />de buffet infantil
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
