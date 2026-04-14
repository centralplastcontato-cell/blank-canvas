import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const hueShift = interpolate(frame, [0, 750], [0, 30]);
  const x1 = interpolate(frame, [0, 750], [0, 20], { extrapolateRight: "clamp" });
  const y1 = interpolate(frame, [0, 750], [0, 15], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse at ${20 + x1}% ${30 + y1}%, hsl(${215 + hueShift}, 85%, 50%) 0%, transparent 50%),
            radial-gradient(ellipse at ${80 - x1}% ${70 - y1}%, hsl(${42 + hueShift}, 95%, 55%) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 50%, hsl(${225 + hueShift}, 30%, 18%) 0%, hsl(225, 40%, 8%) 100%)
          `,
        }}
      />
      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0.03,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
    </AbsoluteFill>
  );
};
