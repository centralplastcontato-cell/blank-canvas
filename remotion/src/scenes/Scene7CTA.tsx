import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const Scene7CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background party
  const bgOpacity = interpolate(frame, [0, 30], [0, 0.2], { extrapolateRight: "clamp" });
  const bgScale = interpolate(frame, [0, 180], [1.1, 1.3], { extrapolateRight: "clamp" });

  // Logo dramatic entrance
  const logoSpring = spring({ frame, fps, config: { damping: 10, stiffness: 60, mass: 2 } });
  const logoScale = interpolate(logoSpring, [0, 1], [4, 1]);
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // Tagline
  const tagOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });
  const tagY = interpolate(spring({ frame: frame - 25, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [60, 0]);

  // CTA button
  const ctaOpacity = interpolate(frame, [55, 75], [0, 1], { extrapolateRight: "clamp" });
  const ctaScale = spring({ frame: frame - 55, fps, config: { damping: 12, stiffness: 150 } });
  const pulse = Math.sin(frame * 0.08) * 0.08 + 0.92;

  // Client logos/trust badges
  const trustOpacity = interpolate(frame, [75, 95], [0, 1], { extrapolateRight: "clamp" });

  // Final fade
  const fadeOut = interpolate(frame, [160, 190], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Confetti burst
  const confetti = Array.from({ length: 30 }, (_, i) => {
    const angle = (i / 30) * Math.PI * 2;
    const speed = 4 + (i % 5) * 2;
    const dist = Math.max(0, frame - 5) * speed;
    const x = 540 + Math.cos(angle) * dist;
    const y = 800 + Math.sin(angle) * dist - frame * 1.5;
    const colors = ["#818cf8", "#f472b6", "#22d3ee", "#fbbf24", "#34d399", "#f97316"];
    const color = colors[i % colors.length];
    const size = 6 + (i % 4) * 3;
    const opacity = interpolate(frame, [5, 15, 80, 100], [0, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const rotation = frame * (3 + i % 5);
    return { x, y, color, size, opacity, rotation };
  });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      {/* Background */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Img src={staticFile("images/buffet-venue.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${bgScale})`, opacity: bgOpacity,
        }} />
      </div>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(10,15,26,0.75) 0%, rgba(10,15,26,0.95) 100%)" }} />

      {/* Confetti */}
      {confetti.map((c, i) => (
        <div key={i} style={{
          position: "absolute", left: c.x, top: c.y,
          width: c.size, height: c.size * 0.6, borderRadius: 2,
          background: c.color, opacity: c.opacity,
          transform: `rotate(${c.rotation}deg)`,
        }} />
      ))}

      {/* Central glow */}
      <div style={{
        position: "absolute", left: "50%", top: "45%",
        transform: `translate(-50%, -50%) scale(${pulse})`,
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(129,140,248,0.15) 0%, transparent 70%)",
        filter: "blur(30px)",
      }} />

      {/* Logo */}
      <div style={{
        position: "absolute", top: 600, left: "50%",
        transform: `translateX(-50%) scale(${logoScale})`,
        opacity: logoOpacity,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      }}>
        <span style={{ fontSize: 110, lineHeight: 1 }}>🎉</span>
        <h1 style={{
          fontFamily, fontWeight: 900, fontSize: 110, color: "white",
          letterSpacing: -5, margin: 0,
        }}>
          Celebrei
        </h1>
      </div>

      {/* Tagline */}
      <div style={{
        position: "absolute", top: 1050, left: 50, right: 50,
        textAlign: "center", opacity: tagOpacity,
        transform: `translateY(${tagY}px)`,
      }}>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 52, color: "white", margin: 0, lineHeight: 1.2 }}>
          Feche mais festas.
        </h2>
        <h2 style={{
          fontFamily, fontWeight: 900, fontSize: 52, margin: 0, lineHeight: 1.2,
          background: "linear-gradient(90deg, #818cf8, #f472b6, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Automatize tudo.
        </h2>
      </div>

      {/* CTA */}
      <div style={{
        position: "absolute", top: 1300, left: "50%",
        transform: `translateX(-50%) scale(${interpolate(ctaScale, [0, 1], [0.6, 1])})`,
        opacity: ctaOpacity,
      }}>
        <div style={{
          background: "linear-gradient(135deg, #818cf8, #f472b6)",
          borderRadius: 100, padding: "26px 70px",
          boxShadow: `0 20px 60px rgba(129,140,248,${0.35 * pulse})`,
          transform: `scale(${pulse})`,
        }}>
          <span style={{ fontFamily, fontWeight: 900, fontSize: 26, color: "white", whiteSpace: "nowrap" }}>
            celebrei.com.br →
          </span>
        </div>
      </div>

      {/* Trust */}
      <div style={{
        position: "absolute", bottom: 200, left: 50, right: 50,
        textAlign: "center", opacity: trustOpacity,
      }}>
        <p style={{ fontFamily, fontWeight: 400, fontSize: 18, color: "rgba(255,255,255,0.35)", margin: 0 }}>
          Usado por +50 buffets em todo o Brasil
        </p>
        <p style={{ fontFamily, fontWeight: 400, fontSize: 15, color: "rgba(255,255,255,0.2)", margin: 0, marginTop: 10 }}>
          Setup em 48h · Sem compromisso · Suporte dedicado
        </p>
      </div>
    </AbsoluteFill>
  );
};
