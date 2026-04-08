import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GridBackground } from "../components/GridBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"], subsets: ["latin"] });

export const Scene1Logo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 120 } });
  const iconOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nameOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const nameY = interpolate(frame, [30, 50], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [55, 75], [0, 160], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagOpacity = interpolate(frame, [65, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [65, 85], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
          <div style={{
            width: 200, height: 200, borderRadius: 48,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${interpolate(iconScale, [0, 1], [0.5, 1])})`,
            opacity: iconOpacity,
            boxShadow: "0 16px 64px rgba(99,102,241,0.4)",
          }}>
            <span style={{ fontSize: 100, color: "white", fontFamily, fontWeight: 900 }}>C</span>
          </div>

          <div style={{ opacity: nameOpacity, transform: `translateY(${nameY}px)` }}>
            <span style={{ fontFamily, fontWeight: 900, fontSize: 140, color: "white", letterSpacing: -4 }}>Celeb</span>
            <span style={{ fontFamily, fontWeight: 900, fontSize: 140, color: "#6366f1", letterSpacing: -4 }}>rei</span>
          </div>

          <div style={{
            width: lineWidth, height: 5, borderRadius: 3,
            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
          }} />

          <p style={{
            fontFamily, fontWeight: 500, fontSize: 32, color: "rgba(255,255,255,0.5)",
            letterSpacing: 4, textTransform: "none", margin: 0,
            opacity: tagOpacity, transform: `translateY(${tagY}px)`,
            textAlign: "center", maxWidth: 800, lineHeight: 1.3,
          }}>
            Plataforma completa para gerenciamento de buffet infantil
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
