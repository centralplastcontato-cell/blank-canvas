import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GridBackground } from "../components/GridBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"], subsets: ["latin"] });

const painPoints = [
  { icon: "📋", text: "Planilhas para controlar leads" },
  { icon: "📱", text: "WhatsApp caótico e sem histórico" },
  { icon: "📅", text: "Agenda desorganizada" },
  { icon: "💸", text: "Sem controle financeiro" },
];

export const SceneProblem = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [5, 25], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ padding: "0 50px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)`, marginBottom: 60, textAlign: "center" }}>
          <h2 style={{ fontFamily, fontWeight: 900, fontSize: 52, color: "white", margin: 0, lineHeight: 1.15 }}>
            Seu buffet ainda
          </h2>
          <h2 style={{ fontFamily, fontWeight: 900, fontSize: 52, color: "#ef4444", margin: 0, lineHeight: 1.15 }}>
            sofre com isso?
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 10px" }}>
          {painPoints.map((point, i) => {
            const delay = 40 + i * 18;
            const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const cardX = interpolate(frame, [delay, delay + 15], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const strikeDelay = delay + 25;
            const strikeWidth = interpolate(frame, [strikeDelay, strikeDelay + 12], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

            return (
              <div key={i} style={{
                opacity: cardOpacity, transform: `translateX(${cardX}px)`,
                background: "rgba(255,255,255,0.04)", borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px",
                display: "flex", alignItems: "center", gap: 16, position: "relative",
              }}>
                <span style={{ fontSize: 24 }}>{point.icon}</span>
                <span style={{ fontFamily, fontWeight: 600, fontSize: 22, color: "rgba(255,255,255,0.85)" }}>{point.text}</span>
                <div style={{
                  position: "absolute", left: 60, top: "50%", height: 2,
                  width: `${strikeWidth}%`, background: "#ef4444", transform: "translateY(-50%)",
                }} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
