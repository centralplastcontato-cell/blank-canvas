import { AbsoluteFill, useCurrentFrame, spring, interpolate, Sequence } from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { MockWindow } from "../components/MockWindow";

const EVENTS = [
  { day: "10", title: "Festa Maria - 5 anos", time: "14:00", pkg: "Premium", color: "#3b82f6" },
  { day: "12", title: "Festa João - 8 anos", time: "10:00", pkg: "Gold", color: "#f59e0b" },
  { day: "15", title: "Festa Ana - 3 anos", time: "16:00", pkg: "Especial", color: "#8b5cf6" },
  { day: "18", title: "Festa Pedro - 7 anos", time: "14:00", pkg: "Premium", color: "#22c55e" },
  { day: "22", title: "Festa Lucas - 10 anos", time: "11:00", pkg: "Básico", color: "#ef4444" },
];

export const SceneAgenda: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <Sequence from={0} durationInFrames={140}>
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)" }}>
          <AnimatedText text="📅 Agenda de Eventos" fontSize={36} delay={0} color="rgba(255,255,255,0.9)" />
        </div>
      </Sequence>

      <MockWindow title="Agenda — Junho 2025" delay={10} width={1300} height={600}>
        <div style={{ padding: 24 }}>
          {/* Calendar header */}
          <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => {
              const sp = spring({ frame: frame - 18 - i * 2, fps: 30, config: { damping: 20 } });
              return (
                <div key={d} style={{ flex: 1, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700, fontFamily: "'Nunito', sans-serif", opacity: interpolate(sp, [0, 1], [0, 1]) }}>
                  {d}
                </div>
              );
            })}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {Array.from({ length: 30 }, (_, i) => {
              const day = i + 1;
              const event = EVENTS.find((e) => parseInt(e.day) === day);
              const cellDelay = 25 + Math.floor(i / 7) * 4 + (i % 7) * 1;
              const sp = spring({ frame: frame - cellDelay, fps: 30, config: { damping: 25 } });
              const opacity = interpolate(sp, [0, 1], [0, 1]);

              return (
                <div
                  key={day}
                  style={{
                    aspectRatio: "1.6",
                    borderRadius: 8,
                    background: event ? `${event.color}22` : "rgba(255,255,255,0.02)",
                    border: event ? `1px solid ${event.color}44` : "1px solid rgba(255,255,255,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    padding: 6,
                    opacity,
                    position: "relative",
                  }}
                >
                  <span style={{ color: event ? event.color : "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
                    {day}
                  </span>
                  {event && (
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 8, marginTop: 2, fontFamily: "'Nunito', sans-serif", lineHeight: 1.2 }}>
                      {event.title.split(" - ")[0]}
                    </span>
                  )}
                  {event && (
                    <div style={{ position: "absolute", bottom: 4, right: 4, width: 6, height: 6, borderRadius: "50%", background: event.color }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </MockWindow>
    </AbsoluteFill>
  );
};
