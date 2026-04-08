import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GridBackground } from "../components/GridBackground";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800", "900"], subsets: ["latin"] });

const messages: { from: "bot" | "client"; text: string }[] = [
  { from: "bot", text: "Olá! 👋 Seja bem-vindo ao Buffet Estrela! ⭐\nMe conta, pra quando você está planejando a festinha? 🎉" },
  { from: "client", text: "Oi! Estou vendo para março, para umas 40 crianças 😊" },
  { from: "bot", text: "Perfeito! 🎈 Temos algumas datas disponíveis e pacotes que se encaixam super bem nesse perfil 👌\nAqui no Buffet Estrela você já tem tudo incluso:\n• 🍔 Alimentação completa\n• 🎨 Decoração temática\n• 🎠 Monitores e brinquedos\nQuer que eu te envie os valores ou prefere agendar uma visita pra conhecer pessoalmente? 😊" },
  { from: "client", text: "Prefiro agendar uma visita ✔️" },
  { from: "bot", text: "Ótima escolha! 😊 Tenho esses horários disponíveis:\n📅 Quinta às 19h\n📅 Sábado às 10h\n📅 Domingo às 15h\nQual fica melhor pra você?" },
  { from: "client", text: "Sábado às 10h pode ser ✔️" },
  { from: "bot", text: "Perfeito! ✅ Sua visita foi agendada para sábado às 10h 🎉\nVou te enviar a localização e te esperamos aqui!\nQualquer dúvida é só me chamar 😊" },
];

export const Scene3WhatsApp = () => {
  const frame = useCurrentFrame();

  const badgeOpacity = interpolate(frame, [5, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [12, 30], [25, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Auto-scroll: after all messages appear, scroll the chat up to reveal bottom messages
  const scrollStart = 120;
  const scrollEnd = 190;
  const scrollAmount = interpolate(frame, [scrollStart, scrollEnd], [0, 520], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill style={{ padding: "0 55px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginTop: 100 }}>
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
          marginTop: 40,
          background: "rgba(255,255,255,0.03)",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.06)",
          padding: "28px 24px",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          maxHeight: 1380,
          position: "relative",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16, paddingBottom: 18,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            marginBottom: 14, flexShrink: 0,
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

          {/* Messages container with scroll */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 12,
            transform: `translateY(-${scrollAmount}px)`,
          }}>
            {messages.map((msg, i) => {
              const delay = 28 + i * 22;
              const msgOpacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const msgY = interpolate(frame, [delay, delay + 12], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const isBot = msg.from === "bot";

              return (
                <div key={i} style={{
                  alignSelf: isBot ? "flex-start" : "flex-end",
                  maxWidth: "88%", opacity: msgOpacity,
                  transform: `translateY(${msgY}px)`,
                }}>
                  <div style={{
                    background: isBot ? "rgba(255,255,255,0.06)" : "rgba(34,197,94,0.18)",
                    borderRadius: 18,
                    borderBottomLeftRadius: isBot ? 4 : 18,
                    borderBottomRightRadius: isBot ? 18 : 4,
                    padding: "14px 20px",
                  }}>
                    <p style={{
                      fontFamily, fontWeight: isBot ? 400 : 400, fontSize: 20,
                      color: "rgba(255,255,255,0.88)", margin: 0, lineHeight: 1.45,
                      whiteSpace: "pre-line",
                    }}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
