import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GridBackground } from "../components/GridBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"], subsets: ["latin"] });

export const Scene7CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const iconScale = spring({ frame: frame - 15, fps, config: { damping: 15, stiffness: 120 } });
  const iconOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [30, 50], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOpacity = interpolate(frame, [50, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnOpacity = interpolate(frame, [65, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnY = interpolate(frame, [65, 80], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlOpacity = interpolate(frame, [85, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = Math.sin(frame * 0.08) * 0.02 + 1;

  return (
    <AbsoluteFill>
      <GridBackground />
      <div style={{
        position: "absolute", bottom: -100, left: "50%", transform: "translateX(-50%)",
        width: 900, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />

      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, padding: "0 60px" }}>
          <div style={{
            width: 120, height: 120, borderRadius: 30,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${interpolate(iconScale, [0, 1], [0.5, 1])})`,
            opacity: iconOpacity, boxShadow: "0 12px 48px rgba(99,102,241,0.35)",
          }}>
            <span style={{ fontSize: 60, color: "white", fontFamily, fontWeight: 900 }}>C</span>
          </div>

          <h2 style={{
            fontFamily, fontWeight: 900, fontSize: 72, color: "white", margin: 0, textAlign: "center", lineHeight: 1.1,
            opacity: titleOpacity, transform: `translateY(${titleY}px)`,
          }}>Transforme seu buffet</h2>

          <p style={{
            fontFamily, fontWeight: 400, fontSize: 30, color: "rgba(255,255,255,0.5)", margin: 0, textAlign: "center", opacity: subOpacity,
          }}>Agende uma demonstração gratuita</p>

          <div style={{
            opacity: btnOpacity, transform: `translateY(${btnY}px) scale(${pulse})`,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 18, padding: "24px 56px",
            boxShadow: "0 6px 28px rgba(99,102,241,0.35)", marginTop: 14,
          }}>
            <span style={{ fontFamily, fontWeight: 700, fontSize: 28, color: "white" }}>Fale com um especialista →</span>
          </div>

          <p style={{
            fontFamily, fontWeight: 400, fontSize: 24, color: "rgba(255,255,255,0.3)", margin: "12px 0 0 0", opacity: urlOpacity,
          }}>celebrei.com.br</p>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
