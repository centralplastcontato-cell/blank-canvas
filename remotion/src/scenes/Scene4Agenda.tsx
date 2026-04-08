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

  const badgeOp = interpolate(frame, [5, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOp = interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [12, 30], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const calOp = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const calY = interpolate(frame, [30, 50], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const midOp = interpolate(frame, [55, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const midY = interpolate(frame, [55, 75], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const alertOp = interpolate(frame, [80, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const alertY = interpolate(frame, [80, 100], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnOp = interpolate(frame, [105, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnScale = interpolate(frame, [105, 120], [0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ padding: "0 50px", display: "flex", flexDirection: "column" }}>
        {/* Title */}
        <div style={{ marginTop: 80 }}>
          <p style={{
            fontFamily, fontWeight: 700, fontSize: 20, color: "#f59e0b",
            letterSpacing: 4, textTransform: "uppercase", margin: "0 0 10px 0", opacity: badgeOp,
          }}>AGENDA & EVENTOS</p>
          <div style={{ opacity: titleOp, transform: `translateY(${titleY}px)` }}>
            <h2 style={{ fontFamily, fontWeight: 900, fontSize: 54, color: "white", margin: 0, lineHeight: 1.1 }}>
              Sua agenda sempre cheia e{" "}<span style={{ color: "#f59e0b" }}>organizada</span>
            </h2>
          </div>
        </div>

        {/* Calendar */}
        <div style={{
          marginTop: 30, opacity: calOp, transform: `translateY(${calY}px)`,
          background: "rgba(255,255,255,0.04)", borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.06)", padding: "22px 16px",
        }}>
          <p style={{ fontFamily, fontWeight: 800, fontSize: 22, color: "white", margin: "0 0 14px 0" }}>📅 Calendário de Festas</p>
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 8 }}>
            {calendarDays.map((d, i) => (
              <span key={i} style={{ fontFamily, fontWeight: 700, fontSize: 16, color: "rgba(255,255,255,0.3)", width: 44, textAlign: "center" }}>{d}</span>
            ))}
          </div>
          {calendarDates.map((week, wi) => (
            <div key={wi} style={{ display: "flex", justifyContent: "space-around", marginBottom: 4 }}>
              {week.map((date, di) => {
                const isEvent = eventDates.includes(date);
                return (
                  <div key={di} style={{
                    width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                    background: isEvent ? "rgba(245,158,11,0.2)" : "transparent",
                    border: isEvent ? "1px solid rgba(245,158,11,0.3)" : "none",
                  }}>
                    <span style={{ fontFamily, fontWeight: isEvent ? 800 : 400, fontSize: 18, color: isEvent ? "#f59e0b" : "rgba(255,255,255,0.4)" }}>{date}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Próximos Eventos + Resumo side by side */}
        <div style={{ display: "flex", gap: 14, marginTop: 14, opacity: midOp, transform: `translateY(${midY}px)` }}>
          <div style={{
            flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.06)", padding: "20px 18px",
          }}>
            <p style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "white", margin: "0 0 14px 0" }}>🎉 Próximos Eventos</p>
            {[
              { date: "05/Abr", name: "Festa da Laura" },
              { date: "12/Abr", name: "Aniversário Pedro" },
              { date: "15/Abr", name: "Festa da Sofia" },
            ].map((evt, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <span style={{ fontFamily, fontWeight: 700, fontSize: 16, color: "#f59e0b" }}>{evt.date}</span>
                <span style={{ fontFamily, fontWeight: 600, fontSize: 16, color: "rgba(255,255,255,0.8)" }}>{evt.name}</span>
              </div>
            ))}
          </div>

          <div style={{
            flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)", padding: "20px 18px",
          }}>
            <p style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "white", margin: "0 0 14px 0" }}>Resumo do Mês</p>
            {[
              { icon: "🎉", text: "28 festas agendadas" },
              { icon: "💰", text: "R$ 84.500 faturados" },
              { icon: "📅", text: "6 datas disponíveis" },
              { icon: "🔥", text: "3 datas quase lotadas" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontFamily, fontWeight: 600, fontSize: 16, color: "rgba(255,255,255,0.85)" }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alert */}
        <div style={{
          marginTop: 14, opacity: alertOp, transform: `translateY(${alertY}px)`,
          background: "rgba(245,158,11,0.08)", borderRadius: 18,
          border: "1px solid rgba(245,158,11,0.2)", padding: "18px 20px",
        }}>
          <p style={{ fontFamily, fontWeight: 800, fontSize: 18, color: "#f59e0b", margin: "0 0 6px 0" }}>⚠️ Atenção</p>
          <p style={{ fontFamily, fontWeight: 400, fontSize: 16, color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.4 }}>
            Você tem <span style={{ fontWeight: 800, color: "white" }}>5 datas livres em abril</span> que podem ser preenchidas automaticamente com campanhas.
          </p>
        </div>

        {/* CTA Button */}
        <div style={{
          marginTop: 20, opacity: btnOp, transform: `scale(${btnScale})`,
          display: "flex", justifyContent: "center",
        }}>
          <div style={{
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            borderRadius: 50, padding: "18px 70px",
            boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
          }}>
            <p style={{ fontFamily, fontWeight: 800, fontSize: 24, color: "white", margin: 0 }}>+ Criar nova festa</p>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
