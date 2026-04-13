import { useCurrentFrame, spring, interpolate } from "remotion";

interface MockWindowProps {
  children: React.ReactNode;
  title?: string;
  delay?: number;
  width?: number;
  height?: number;
}

export const MockWindow: React.FC<MockWindowProps> = ({
  children,
  title = "FestejaAI",
  delay = 20,
  width = 1200,
  height = 650,
}) => {
  const frame = useCurrentFrame();
  const scaleIn = spring({ frame: frame - delay, fps: 30, config: { damping: 20, stiffness: 120 } });
  const scale = interpolate(scaleIn, [0, 1], [0.8, 1]);
  const opacity = interpolate(scaleIn, [0, 1], [0, 1]);

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
        transform: `scale(${scale})`,
        opacity,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          height: 44,
          background: "linear-gradient(180deg, #3a3a4a 0%, #2a2a3a 100%)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
        <div
          style={{
            flex: 1,
            textAlign: "center",
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            fontFamily: "sans-serif",
            letterSpacing: 0.5,
          }}
        >
          {title}
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, background: "#1a1a2e", overflow: "hidden", position: "relative" }}>
        {children}
      </div>
    </div>
  );
};
