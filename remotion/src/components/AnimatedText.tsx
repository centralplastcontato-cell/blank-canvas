import { useCurrentFrame, spring, interpolate } from "remotion";

interface AnimatedTextProps {
  text: string;
  delay?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  style?: React.CSSProperties;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  fontSize = 48,
  color = "white",
  fontWeight = 700,
  style,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px", ...style }}>
      {words.map((word, i) => {
        const wordDelay = delay + i * 3;
        const sp = spring({ frame: frame - wordDelay, fps: 30, config: { damping: 18, stiffness: 180 } });
        const y = interpolate(sp, [0, 1], [30, 0]);
        const opacity = interpolate(sp, [0, 1], [0, 1]);

        return (
          <span
            key={i}
            style={{
              fontSize,
              fontWeight,
              color,
              fontFamily: "'Fredoka', sans-serif",
              transform: `translateY(${y}px)`,
              opacity,
              display: "inline-block",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
