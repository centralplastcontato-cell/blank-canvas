import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const Scene3WhatsApp = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const messages = [
    { from: "bot", text: "Olá! 🎉 Seja bem-vinda ao Buffet Estrela! Vi que você tem interesse em uma festinha. Qual a data da festa?", delay: 20 },
    { from: "client", text: "Oi! Seria em março, para 40 crianças 😊", delay: 55 },
    { from: "bot", text: "Que legal! Temos pacotes perfeitos para esse tamanho. Posso agendar uma visita gratuita? 📅", delay: 90 },
    { from: "client", text: "Sim! Sábado de manhã pode ser?", delay: 125 },
    { from: "bot", text: "Perfeito! ✅ Visita agendada para sábado às 10h. Até lá! 🎈", delay: 155 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", padding: 60 }}>
      {/* Badge */}
      <div
        style={{
          marginTop: 150,
          background: "rgba(34,197,94,0.15)",
          borderRadius: 100,
          padding: "10px 24px",
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <span style={{ fontFamily, fontWeight: 800, fontSize: 18, color: "#22c55e" }}>
          💬 WHATSAPP AUTOMÁTICO
        </span>
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily, fontWeight: 900, fontSize: 56, color: "white", margin: 0, marginTop: 24,
          textAlign: "center", lineHeight: 1.1,
          opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [40, 0])}px)`,
        }}
      >
        Atendimento
        <br />
        <span style={{ color: "#22c55e" }}>24 horas por dia</span>
      </h2>

      {/* Chat mockup */}
      <div
        style={{
          marginTop: 40,
          width: "100%",
          padding: "0 40px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Phone frame */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Chat header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 22 }}>🤖</span>
            </div>
            <div>
              <p style={{ fontFamily, fontWeight: 800, fontSize: 18, color: "white", margin: 0 }}>Bot Celebrei</p>
              <p style={{ fontFamily, fontWeight: 400, fontSize: 13, color: "#22c55e", margin: 0 }}>● Online</p>
            </div>
          </div>

          {/* Messages */}
          {messages.map((msg, i) => {
            const msgOpacity = interpolate(frame, [msg.delay, msg.delay + 12], [0, 1], { extrapolateRight: "clamp" });
            const msgY = spring({ frame: frame - msg.delay, fps, config: { damping: 20, stiffness: 200 } });
            const isBot = msg.from === "bot";

            return (
              <div
                key={i}
                style={{
                  alignSelf: isBot ? "flex-start" : "flex-end",
                  maxWidth: "85%",
                  background: isBot ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.2)",
                  borderRadius: 18,
                  borderBottomLeftRadius: isBot ? 4 : 18,
                  borderBottomRightRadius: isBot ? 18 : 4,
                  padding: "12px 16px",
                  opacity: msgOpacity,
                  transform: `translateY(${interpolate(msgY, [0, 1], [30, 0])}px)`,
                }}
              >
                <p style={{ fontFamily, fontWeight: 400, fontSize: 16, color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.4 }}>
                  {msg.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom insight */}
      <p
        style={{
          fontFamily, fontWeight: 400, fontSize: 20, color: "rgba(255,255,255,0.4)",
          textAlign: "center", marginTop: 30,
          opacity: interpolate(frame, [170, 190], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        Responde leads em <span style={{ color: "#22c55e", fontWeight: 800 }}>segundos</span>, não horas.
      </p>
    </AbsoluteFill>
  );
};
