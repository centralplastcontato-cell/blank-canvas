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
  const lineWidth = interpolate(frame, [55, 75], [0, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagOpacity = interpolate(frame, [65, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [65, 85], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
          <div style={{
            width: 140, height: 140, borderRadius: 34,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${interpolate(iconScale, [0, 1], [0.5, 1])})`,
            opacity: iconOpacity,
            boxShadow: "0 12px 48px rgba(99,102,241,0.35)",
          }}>
            <span style={{ fontSize: 72, color: "white", fontFamily, fontWeight: 900 }}>C</span>
          </div>

          <div style={{ opacity: nameOpacity, transform: `translateY(${nameY}px)` }}>
            <span style={{ fontFamily, fontWeight: 900, fontSize: 108, color: "white", letterSpacing: -3 }}>Celeb</span>
            <span style={{ fontFamily, fontWeight: 900, fontSize: 108, color: "#6366f1", letterSpacing: -3 }}>rei</span>
          </div>

          <div style={{
            width: lineWidth, height: 4, borderRadius: 2,
            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
          }} />

          <p style={{
            fontFamily, fontWeight: 400, fontSize: 32, color: "rgba(255,255,255,0.5)",
            letterSpacing: 6, textTransform: "uppercase", margin: 0,
            opacity: tagOpacity, transform: `translateY(${tagY}px)`,
          }}>
            CRM PARA BUFFETS INFANTIS
          </p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
