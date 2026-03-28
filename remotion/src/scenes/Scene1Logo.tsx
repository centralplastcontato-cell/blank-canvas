import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["800", "900"], subsets: ["latin"] });

export const Scene1Logo = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 80, mass: 1.5 } });
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const lineWidth = spring({ frame: frame - 25, fps, config: { damping: 20, stiffness: 200 } });

  const taglineOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp" });
  const taglineY = spring({ frame: frame - 40, fps, config: { damping: 20, stiffness: 200 } });

  const subtitleOpacity = interpolate(frame, [60, 75], [0, 1], { extrapolateRight: "clamp" });

  // Sparkle particles
  const particles = Array.from({ length: 8 }, (_, i) => {
    const delay = 15 + i * 5;
    const angle = (i / 8) * Math.PI * 2;
    const radius = 200 + Math.sin(frame * 0.03 + i) * 30;
    const particleOpacity = interpolate(frame, [delay, delay + 15, 120, 140], [0, 0.6, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return { x: Math.cos(angle + frame * 0.01) * radius, y: Math.sin(angle + frame * 0.01) * radius, opacity: particleOpacity, size: 4 + (i % 3) * 2 };
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: i % 2 === 0 ? "#818cf8" : "#f472b6",
            left: 540 + p.x - p.size / 2,
            top: 960 + p.y - p.size / 2,
            opacity: p.opacity,
          }}
        />
      ))}

      {/* Logo text */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        {/* Emoji icon */}
        <div style={{ fontSize: 80, lineHeight: 1 }}>🎉</div>

        <h1
          style={{
            fontFamily,
            fontWeight: 900,
            fontSize: 96,
            color: "white",
            letterSpacing: -3,
            margin: 0,
            textAlign: "center",
          }}
        >
          Celebrei
        </h1>

        {/* Animated line */}
        <div
          style={{
            width: interpolate(lineWidth, [0, 1], [0, 300]),
            height: 4,
            borderRadius: 2,
            background: "linear-gradient(90deg, #818cf8, #f472b6, #22d3ee)",
          }}
        />

        {/* Tagline */}
        <p
          style={{
            fontFamily,
            fontWeight: 800,
            fontSize: 36,
            color: "rgba(255,255,255,0.85)",
            margin: 0,
            textAlign: "center",
            opacity: taglineOpacity,
            transform: `translateY(${interpolate(taglineY, [0, 1], [30, 0])}px)`,
          }}
        >
          A plataforma completa
          <br />
          para buffets infantis
        </p>

        <p
          style={{
            fontFamily,
            fontWeight: 400,
            fontSize: 24,
            color: "rgba(255,255,255,0.4)",
            margin: 0,
            textAlign: "center",
            opacity: subtitleOpacity,
          }}
        >
          CRM · WhatsApp · Agenda · IA
        </p>
      </div>
    </AbsoluteFill>
  );
};
