import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const Scene7CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 100, mass: 1.2 } });

  const titleOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const titleY = spring({ frame: frame - 15, fps, config: { damping: 20, stiffness: 200 } });

  const ctaOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });
  const ctaScale = spring({ frame: frame - 50, fps, config: { damping: 12, stiffness: 150 } });

  // Pulsing glow on CTA
  const pulse = Math.sin(frame * 0.08) * 0.15 + 0.85;

  const footerOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" });

  // Fade out at end
  const fadeOut = interpolate(frame, [200, 230], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: fadeOut }}>
      {/* Central glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(129,140,248,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
          transform: `scale(${pulse})`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 24,
          transform: `scale(${logoScale})`,
        }}
      >
        <span style={{ fontSize: 96, lineHeight: 1 }}>🎉</span>

        <h1
          style={{
            fontFamily, fontWeight: 900, fontSize: 88, color: "white", margin: 0,
            letterSpacing: -3,
          }}
        >
          Celebrei
        </h1>
      </div>

      {/* Tagline */}
      <div
        style={{
          position: "absolute",
          top: 1100,
          textAlign: "center",
          opacity: titleOpacity,
          transform: `translateY(${interpolate(titleY, [0, 1], [40, 0])}px)`,
        }}
      >
        <h2
          style={{
            fontFamily, fontWeight: 900, fontSize: 48, color: "white", margin: 0, lineHeight: 1.2,
          }}
        >
          Feche mais festas.
          <br />
          <span style={{ background: "linear-gradient(90deg, #818cf8, #f472b6, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Automatize tudo.
          </span>
        </h2>
      </div>

      {/* CTA button mockup */}
      <div
        style={{
          position: "absolute",
          top: 1340,
          opacity: ctaOpacity,
          transform: `scale(${interpolate(ctaScale, [0, 1], [0.7, 1])})`,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #818cf8, #f472b6)",
            borderRadius: 100,
            padding: "24px 64px",
            boxShadow: `0 20px 60px rgba(129,140,248,${0.3 * pulse})`,
          }}
        >
          <span style={{ fontFamily, fontWeight: 900, fontSize: 24, color: "white" }}>
            Agendar demonstração →
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 180,
          textAlign: "center",
          opacity: footerOpacity,
        }}
      >
        <p style={{ fontFamily, fontWeight: 400, fontSize: 18, color: "rgba(255,255,255,0.3)", margin: 0 }}>
          celebrei.com.br
        </p>
        <p style={{ fontFamily, fontWeight: 400, fontSize: 14, color: "rgba(255,255,255,0.15)", margin: 0, marginTop: 8 }}>
          Setup em 48h · Sem compromisso
        </p>
      </div>
    </AbsoluteFill>
  );
};
