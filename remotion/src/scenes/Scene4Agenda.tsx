import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GridBackground } from "../components/GridBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"], subsets: ["latin"] });

const calendarDays = ["D", "S", "T", "T", "Q", "S", "S", "S"];
const calendarDates = [
  [1, 2, 3, 4, 5, 6, 7, 8],
  [8, 9, 10, 11, 12, 13, 14, 15],
  [15, 16, 17, 18, 19, 20, 21, 22],
  [22, 23, 24, 25, 26, 27, 28, 28],
];
const eventDates = [5, 12, 13, 15, 20, 25];

export const Scene4Agenda = () => {
  const frame = useCurrentFrame();

  const badgeOpacity = interpolate(frame, [5, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [12, 30], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const calendarOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const calendarY = interpolate(frame, [35, 55], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eventsOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eventsY = interpolate(frame, [60, 80], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const resumoOpacity = interpolate(frame, [85, 105], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const resumoY = interpolate(frame, [85, 105], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const alertOpacity = interpolate(frame, [110, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const alertY = interpolate(frame, [110, 130], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnOpacity = interpolate(frame, [135, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnScale = interpolate(frame, [135, 150], [0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Scroll to reveal bottom content
  const scrollAmount = interpolate(frame, [100, 170], [0, 480], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ padding: "0 55px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ transform: `translateY(-${scrollAmount}px)` }}>
          <div style={{ marginTop: 100 }}>
            <p style={{
              fontFamily, fontWeight: 700, fontSize: 22, color: "#f59e0b",
              letterSpacing: 4, textTransform: "uppercase", margin: "0 0 16px 0", opacity: badgeOpacity,
            }}>AGENDA & EVENTOS</p>
            <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
              <h2 style={{ fontFamily, fontWeight: 900, fontSize: 62, color: "white", margin: 0, lineHeight: 1.1 }}>
                Sua agenda sempre cheia e{" "}<span style={{ color: "#f59e0b" }}>organizada</span>
              </h2>
            </div>
          </div>

          {/* Calendar */}
          <div style={{
            marginTop: 40, opacity: calendarOpacity, transform: `translateY(${calendarY}px)`,
            background: "rgba(255,255,255,0.04)", borderRadius: 24,
            border: "1px solid rgba(255,255,255,0.06)", padding: "28px 20px",
          }}>
            <p style={{ fontFamily, fontWeight: 800, fontSize: 26, color: "white", margin: "0 0 18px 0" }}>📅 Calendário de Festas</p>
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 12 }}>
              {calendarDays.map((d, i) => (
                <span key={i} style={{ fontFamily, fontWeight: 700, fontSize: 18, color: "rgba(255,255,255,0.3)", width: 50, textAlign: "center" }}>{d}</span>
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
                        width: 50, height: 50, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                        background: isEvent ? "rgba(245,158,11,0.2)" : "transparent",
                        border: isEvent ? "1px solid rgba(245,158,11,0.3)" : "none",
                      }}>
                        <span style={{ fontFamily, fontWeight: isEvent ? 800 : 400, fontSize: 20, color: isEvent ? "#f59e0b" : "rgba(255,255,255,0.4)" }}>{date}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Próximos Eventos + Resumo do Mês side by side */}
          <div style={{ display: "flex", gap: 16, marginTop: 18 }}>
            <div style={{
              flex: 1, opacity: eventsOpacity, transform: `translateY(${eventsY}px)`,
              background: "rgba(255,255,255,0.04)", borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.06)", padding: "24px 20px",
            }}>
              <p style={{ fontFamily, fontWeight: 800, fontSize: 22, color: "white", margin: "0 0 16px 0" }}>🎉 Próximos Eventos</p>
              {[
                { date: "05/Abr", name: "Festa da Laura" },
                { date: "12/Abr", name: "Aniversário Pedro" },
                { date: "15/Abr", name: "Festa da Sofia" },
              ].map((evt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontFamily, fontWeight: 700, fontSize: 18, color: "#f59e0b" }}>{evt.date}</span>
                  <span style={{ fontFamily, fontWeight: 600, fontSize: 18, color: "rgba(255,255,255,0.8)" }}>{evt.name}</span>
                </div>
              ))}
            </div>

            <div style={{
              flex: 1, opacity: resumoOpacity, transform: `translateY(${resumoY}px)`,
              background: "rgba(255,255,255,0.06)", borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.08)", padding: "24px 20px",
            }}>
              <p style={{ fontFamily, fontWeight: 800, fontSize: 22, color: "white", margin: "0 0 16px 0" }}>Resumo do Mês</p>
              {[
                { icon: "🎉", text: "28 festas agendadas" },
                { icon: "💰", text: "R$ 84.500 faturados" },
                { icon: "📅", text: "6 datas disponíveis" },
                { icon: "🔥", text: "3 datas quase lotadas" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontFamily, fontWeight: 600, fontSize: 18, color: "rgba(255,255,255,0.85)" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alert */}
          <div style={{
            marginTop: 18, opacity: alertOpacity, transform: `translateY(${alertY}px)`,
            background: "rgba(245,158,11,0.08)", borderRadius: 20,
            border: "1px solid rgba(245,158,11,0.2)", padding: "22px 24px",
          }}>
            <p style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "#f59e0b", margin: "0 0 8px 0" }}>⚠️ Atenção</p>
            <p style={{ fontFamily, fontWeight: 400, fontSize: 18, color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.4 }}>
              Você tem <span style={{ fontWeight: 800, color: "white" }}>5 datas livres em abril</span> que podem ser preenchidas automaticamente com campanhas.
            </p>
          </div>

          {/* CTA Button */}
          <div style={{
            marginTop: 24, opacity: btnOpacity, transform: `scale(${btnScale})`,
            display: "flex", justifyContent: "center",
          }}>
            <div style={{
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              borderRadius: 60, padding: "22px 80px",
              boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
            }}>
              <p style={{ fontFamily, fontWeight: 800, fontSize: 26, color: "white", margin: 0 }}>+ Criar nova festa</p>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
