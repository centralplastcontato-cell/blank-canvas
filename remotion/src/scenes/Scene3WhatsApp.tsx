import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GridBackground } from "../components/GridBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"], subsets: ["latin"] });

const messages = [
  { from: "bot", text: "Olá! Bem-vinda ao Buffet Estrela! 🎉" },
  { from: "bot", text: "Vi que você tem interesse. Qual a data da festinha? 📅" },
  { from: "client", text: "Em março, para 40 crianças 😊" },
  { from: "bot", text: "Temos pacotes perfeitos! Posso agendar uma visita?" },
  { from: "client", text: "Sim! Sábado pode ser?" },
  { from: "bot", text: "✅ Visita agendada para sábado às 10h!" },
];

export const Scene3WhatsApp = () => {
  const frame = useCurrentFrame();

  const badgeOpacity = interpolate(frame, [5, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [12, 30], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ padding: "0 55px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginTop: 240 }}>
          <p style={{
            fontFamily, fontWeight: 700, fontSize: 22, color: "#22c55e",
            letterSpacing: 4, textTransform: "uppercase", margin: "0 0 16px 0",
            opacity: badgeOpacity,
          }}>
            WHATSAPP INTEGRADO
          </p>
          <div style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
            <h2 style={{ fontFamily, fontWeight: 900, fontSize: 62, color: "white", margin: 0, lineHeight: 1.1 }}>
              Atendimento{" "}
              <span style={{ color: "#22c55e" }}>24/7 no automático</span>
            </h2>
          </div>
        </div>

        <div style={{
          marginTop: 50,
          background: "rgba(255,255,255,0.03)",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "28px 24px",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 16, paddingBottom: 18,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28,
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 28 }}>🤖</span>
            </div>
            <div>
              <p style={{ fontFamily, fontWeight: 800, fontSize: 24, color: "white", margin: 0 }}>Bot Celebrei</p>
              <p style={{ fontFamily, fontWeight: 400, fontSize: 16, color: "#22c55e", margin: 0 }}>● Online</p>
            </div>
          </div>

          {messages.map((msg, i) => {
            const delay = 30 + i * 18;
            const msgOpacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const msgY = interpolate(frame, [delay, delay + 10], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const isBot = msg.from === "bot";

            return (
              <div key={i} style={{
                alignSelf: isBot ? "flex-start" : "flex-end",
                maxWidth: "85%", opacity: msgOpacity,
                transform: `translateY(${msgY}px)`,
              }}>
                <div style={{
                  background: isBot ? "rgba(255,255,255,0.06)" : "rgba(34,197,94,0.15)",
                  borderRadius: 20,
                  borderBottomLeftRadius: isBot ? 4 : 20,
                  borderBottomRightRadius: isBot ? 20 : 4,
                  padding: "14px 20px",
                }}>
                  <p style={{ fontFamily, fontWeight: 400, fontSize: 22, color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.35 }}>
                    {msg.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <p style={{
          fontFamily, fontWeight: 400, fontSize: 22, color: "rgba(255,255,255,0.3)",
          textAlign: "center", marginTop: 36,
          opacity: interpolate(frame, [150, 165], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>
          Respostas automáticas que qualificam e agendam
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
