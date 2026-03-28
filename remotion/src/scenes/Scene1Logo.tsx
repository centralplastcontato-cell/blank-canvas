import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const Scene1Logo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background image with zoom
  const bgScale = interpolate(frame, [0, 120], [1.1, 1.25], { extrapolateRight: "clamp" });
  const bgOpacity = interpolate(frame, [0, 30], [0, 0.35], { extrapolateRight: "clamp" });

  // Logo entrance - dramatic scale from huge to normal
  const logoProgress = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 60, mass: 2 } });
  const logoScale = interpolate(logoProgress, [0, 1], [3, 1]);
  const logoOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateRight: "clamp" });

  // Gradient line reveal
  const lineWidth = interpolate(
    spring({ frame: frame - 30, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [0, 500]
  );

  // Tagline words stagger
  const words = ["A plataforma", "completa para", "buffets infantis"];
  
  // Subtitle
  const subOpacity = interpolate(frame, [70, 85], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(spring({ frame: frame - 70, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [40, 0]);

  // Confetti particles
  const confetti = Array.from({ length: 24 }, (_, i) => {
    const seed = i * 137.508;
    const x = (seed * 3.7) % 1080;
    const startY = -50 - (i * 40) % 200;
    const speed = 3 + (i % 5) * 1.5;
    const wobble = Math.sin(frame * 0.05 + i) * 30;
    const y = startY + frame * speed + wobble;
    const rotation = frame * (2 + i % 4) + seed;
    const colors = ["#818cf8", "#f472b6", "#22d3ee", "#fbbf24", "#34d399"];
    const color = colors[i % colors.length];
    const size = 8 + (i % 4) * 4;
    const opacity = interpolate(frame, [10, 25, 100, 120], [0, 0.8, 0.8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    return { x: x + wobble, y: y % 2200 - 200, rotation, color, size, opacity };
  });

  return (
    <AbsoluteFill>
      {/* Background party image */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Img
          src={staticFile("images/buffet-venue.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${bgScale})`,
            opacity: bgOpacity,
          }}
        />
      </div>

      {/* Dark overlay for contrast */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(10,15,26,0.7) 0%, rgba(10,15,26,0.9) 100%)",
      }} />

      {/* Confetti */}
      {confetti.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            width: c.size,
            height: c.size * 0.6,
            borderRadius: 2,
            background: c.color,
            transform: `rotate(${c.rotation}deg)`,
            opacity: c.opacity,
          }}
        />
      ))}

      {/* Center content */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}>
          <div style={{ fontSize: 100, lineHeight: 1 }}>🎉</div>
          <h1 style={{
            fontFamily, fontWeight: 900, fontSize: 120, color: "white",
            letterSpacing: -5, margin: 0, textAlign: "center",
          }}>
            Celebrei
          </h1>
        </div>

        {/* Gradient line */}
        <div style={{
          width: lineWidth, height: 5, borderRadius: 3, marginTop: 20,
          background: "linear-gradient(90deg, #818cf8, #f472b6, #22d3ee)",
        }} />

        {/* Tagline words */}
        <div style={{ marginTop: 30, textAlign: "center" }}>
          {words.map((word, i) => {
            const delay = 40 + i * 8;
            const wordOpacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateRight: "clamp" });
            const wordY = interpolate(
              spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 200 } }),
              [0, 1], [30, 0]
            );
            return (
              <p key={i} style={{
                fontFamily, fontWeight: 800, fontSize: 42, color: "rgba(255,255,255,0.9)",
                margin: 0, lineHeight: 1.3, opacity: wordOpacity,
                transform: `translateY(${wordY}px)`,
              }}>
                {word}
              </p>
            );
          })}
        </div>

        {/* Subtitle chips */}
        <div style={{
          display: "flex", gap: 16, marginTop: 36,
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
        }}>
          {["CRM", "WhatsApp", "Agenda", "IA", "Contratos"].map((chip, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.08)", borderRadius: 100,
              padding: "10px 22px", border: "1px solid rgba(255,255,255,0.12)",
            }}>
              <span style={{ fontFamily, fontWeight: 800, fontSize: 18, color: "rgba(255,255,255,0.7)" }}>{chip}</span>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
