import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GridBackground } from "../components/GridBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"], subsets: ["latin"] });

const calendarDays = ["D", "S", "T", "Q", "Q", "S", "S"];
const calendarDates = [
  [1, 2, 3, 4, 5, 6, 7],
  [8, 9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
  [22, 23, 24, 25, 26, 27, 28],
];
const eventDates = [5, 12, 15, 20, 25];

export const Scene4Agenda = () => {
  const frame = useCurrentFrame();

  const badgeOpacity = interpolate(frame, [5, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [12, 30], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const calendarOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const calendarY = interpolate(frame, [35, 55], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const eventsOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eventsY = interpolate(frame, [60, 80], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ padding: "0 50px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginTop: 260 }}>
          <p style={{
            fontFamily, fontWeight: 700, fontSize: 14, color: "#f59e0b",
            letterSpacing: 3, textTransform: "uppercase", margin: "0 0 12px 0", opacity: badgeOpacity,
          }}>AGENDA & EVENTOS</p>
          <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            <h2 style={{ fontFamily, fontWeight: 900, fontSize: 46, color: "white", margin: 0, lineHeight: 1.1 }}>
              Eventos e agenda{" "}<span style={{ color: "#f59e0b" }}>sob controle</span>
            </h2>
          </div>
        </div>

        <div style={{
          marginTop: 40, opacity: calendarOpacity, transform: `translateY(${calendarY}px)`,
          background: "rgba(255,255,255,0.04)", borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.06)", padding: "24px 20px",
        }}>
          <p style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "white", margin: "0 0 16px 0" }}>📅 Calendário de Festas</p>
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12 }}>
            {calendarDays.map((d, i) => (
              <span key={i} style={{ fontFamily, fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.3)", width: 50, textAlign: "center" }}>{d}</span>
            ))}
          </div>
          {calendarDates.map((week, wi) => {
            const rowDelay = 45 + wi * 8;
            const rowOpacity = interpolate(frame, [rowDelay, rowDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={wi} style={{ display: "flex", justifyContent: "space-around", marginBottom: 8, opacity: rowOpacity }}>
                {week.map((date, di) => {
                  const isEvent = eventDates.includes(date);
                  return (
                    <div key={di} style={{
                      width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                      background: isEvent ? "rgba(245,158,11,0.2)" : "transparent",
                      border: isEvent ? "1px solid rgba(245,158,11,0.3)" : "none",
                    }}>
                      <span style={{ fontFamily, fontWeight: isEvent ? 800 : 400, fontSize: 16, color: isEvent ? "#f59e0b" : "rgba(255,255,255,0.4)" }}>{date}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <p style={{ fontFamily, fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,0.25)", margin: "12px 0 0 0" }}>Visualização mensal com todos os eventos</p>
        </div>

        <div style={{
          marginTop: 18, opacity: eventsOpacity, transform: `translateY(${eventsY}px)`,
          background: "rgba(255,255,255,0.04)", borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.06)", padding: "24px 20px",
        }}>
          <p style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "white", margin: "0 0 16px 0" }}>🎉 Próximos Eventos</p>
          {[
            { date: "05/Abr", name: "Festa da Laura", pkg: "Premium" },
            { date: "12/Abr", name: "Aniversário Pedro", pkg: "Gold" },
            { date: "15/Abr", name: "Festa da Sofia", pkg: "Premium" },
          ].map((evt, i) => {
            const evtDelay = 70 + i * 12;
            const evtOpacity = interpolate(frame, [evtDelay, evtDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", opacity: evtOpacity,
                borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily, fontWeight: 700, fontSize: 14, color: "#f59e0b" }}>{evt.date}</span>
                  <span style={{ fontFamily, fontWeight: 600, fontSize: 16, color: "rgba(255,255,255,0.8)" }}>{evt.name}</span>
                </div>
                <span style={{
                  fontFamily, fontWeight: 600, fontSize: 12, color: "#f59e0b",
                  background: "rgba(245,158,11,0.12)", padding: "4px 10px", borderRadius: 6,
                }}>{evt.pkg}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
