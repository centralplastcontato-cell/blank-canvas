import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GridBackground } from "../components/GridBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"], subsets: ["latin"] });

const metrics = [
  { value: "40%", label: "mais conversão de leads", color: "#6366f1" },
  { value: "Zero", label: "leads perdidos", color: "#22c55e" },
  { value: "3x", label: "mais produtividade", color: "#22d3ee" },
  { value: "100%", label: "controle financeiro", color: "#f59e0b" },
];

export const Scene6Metrics = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [5, 25], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ padding: "0 55px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, marginBottom: 60, textAlign: "center" }}>
          <h2 style={{ fontFamily, fontWeight: 900, fontSize: 66, color: "white", margin: 0 }}>
            Resultados que{" "}<span style={{ color: "#8b5cf6" }}>transformam</span>
          </h2>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center" }}>
          {metrics.map((m, i) => {
            const delay = 30 + i * 15;
            const cardOpacity = interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const cardScale = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 180 } });
            return (
              <div key={i} style={{
                width: "46%", opacity: cardOpacity,
                transform: `scale(${interpolate(cardScale, [0, 1], [0.9, 1])})`,
                background: "rgba(255,255,255,0.04)", borderRadius: 24,
                border: "1px solid rgba(255,255,255,0.06)", padding: "44px 24px", textAlign: "center",
              }}>
                <p style={{ fontFamily, fontWeight: 900, fontSize: 68, color: m.color, margin: "0 0 12px 0" }}>{m.value}</p>
                <p style={{ fontFamily, fontWeight: 400, fontSize: 22, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.3 }}>{m.label}</p>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
