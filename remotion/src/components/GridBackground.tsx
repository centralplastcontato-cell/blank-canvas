import { AbsoluteFill, useCurrentFrame } from "remotion";

export const GridBackground = () => {
  const frame = useCurrentFrame();
  const gradientAngle = 160 + Math.sin(frame * 0.003) * 5;

  return (
    <>
      {/* Base gradient */}
      <AbsoluteFill style={{
        background: `linear-gradient(${gradientAngle}deg, #060a14 0%, #0a1128 30%, #0d1530 60%, #080e20 100%)`,
      }} />
      {/* Grid overlay */}
      <AbsoluteFill style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }} />
      {/* Subtle radial glow */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse 800px 600px at 50% 40%, rgba(99,102,241,0.04) 0%, transparent 70%)",
      }} />
    </>
  );
};
