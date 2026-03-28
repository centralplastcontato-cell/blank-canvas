import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const SceneProblem = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const problems = [
    { emoji: "😤", text: "Leads perdidos no WhatsApp", delay: 10 },
    { emoji: "📋", text: "Planilhas desorganizadas", delay: 22 },
    { emoji: "⏰", text: "Horas respondendo manualmente", delay: 34 },
    { emoji: "💸", text: "Festas que fogem do controle", delay: 46 },
    { emoji: "😵", text: "Sem saber de onde vem cada lead", delay: 58 },
  ];

  // Red X marks that appear after each problem
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // Shake effect
  const shake = frame < 80 ? Math.sin(frame * 0.5) * 2 : 0;

  // Transition to solution
  const solutionOpacity = interpolate(frame, [80, 95], [0, 1], { extrapolateRight: "clamp" });
  const solutionScale = spring({ frame: frame - 80, fps, config: { damping: 12, stiffness: 150 } });

  return (
    <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
      {/* Red gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at center, rgba(239,68,68,${interpolate(frame, [0, 40, 80, 95], [0, 0.05, 0.05, 0], { extrapolateRight: "clamp" })}) 0%, transparent 70%)`,
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 250, left: 50, right: 50, textAlign: "center",
        opacity: titleOpacity,
        transform: `translateY(${interpolate(spring({ frame, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [50, 0])}px)`,
      }}>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 56, color: "white", margin: 0, lineHeight: 1.1 }}>
          Seu buffet ainda
        </h2>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 56, color: "#ef4444", margin: 0, lineHeight: 1.1 }}>
          sofre com isso?
        </h2>
      </div>

      {/* Problem list */}
      <div style={{
        position: "absolute", top: 500, left: 50, right: 50,
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        {problems.map((prob, i) => {
          const pOpacity = interpolate(frame, [prob.delay, prob.delay + 8], [0, 1], { extrapolateRight: "clamp" });
          const pX = interpolate(spring({ frame: frame - prob.delay, fps, config: { damping: 18, stiffness: 200 } }), [0, 1], [-300, 0]);

          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 18,
              background: "rgba(239,68,68,0.06)", borderRadius: 20,
              border: "1px solid rgba(239,68,68,0.15)", padding: "18px 24px",
              opacity: pOpacity, transform: `translateX(${pX}px)`,
            }}>
              <span style={{ fontSize: 36 }}>{prob.emoji}</span>
              <p style={{ fontFamily, fontWeight: 800, fontSize: 22, color: "rgba(255,255,255,0.85)", margin: 0 }}>
                {prob.text}
              </p>
              <span style={{
                marginLeft: "auto", fontSize: 28, color: "#ef4444",
                opacity: interpolate(frame, [prob.delay + 8, prob.delay + 14], [0, 1], { extrapolateRight: "clamp" }),
              }}>✕</span>
            </div>
          );
        })}
      </div>

      {/* Solution reveal */}
      <div style={{
        position: "absolute", bottom: 280, left: 50, right: 50, textAlign: "center",
        opacity: solutionOpacity,
        transform: `scale(${interpolate(solutionScale, [0, 1], [0.7, 1])})`,
      }}>
        <p style={{ fontFamily, fontWeight: 900, fontSize: 42, color: "white", margin: 0 }}>
          E se existisse uma
        </p>
        <p style={{
          fontFamily, fontWeight: 900, fontSize: 42, margin: 0,
          background: "linear-gradient(90deg, #818cf8, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          solução completa?
        </p>
      </div>
    </AbsoluteFill>
  );
};
