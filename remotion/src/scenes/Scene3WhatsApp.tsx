import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const Scene3WhatsApp = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const messages = [
    { from: "bot", text: "Olá! 🎉 Bem-vinda ao Buffet Estrela!", delay: 15 },
    { from: "bot", text: "Vi que você tem interesse em uma festinha. Qual a data? 📅", delay: 30 },
    { from: "client", text: "Oi! Em março, para 40 crianças 😊", delay: 50 },
    { from: "bot", text: "Temos pacotes perfeitos! Posso agendar uma visita? ✨", delay: 70 },
    { from: "client", text: "Sim! Sábado pode ser?", delay: 88 },
    { from: "bot", text: "✅ Visita agendada sábado 10h!", delay: 105 },
  ];

  // Phone mockup image
  const phoneScale = spring({ frame: frame - 5, fps, config: { damping: 15, stiffness: 100, mass: 1.5 } });
  const phoneOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });

  // "Typing" indicator
  const typingVisible = (msgDelay: number) => {
    const showAt = msgDelay - 12;
    return interpolate(frame, [showAt, showAt + 3, msgDelay - 2, msgDelay], [0, 1, 1, 0], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
  };

  return (
    <AbsoluteFill>
      {/* WhatsApp phone image behind */}
      <div style={{
        position: "absolute", top: 80, left: "50%", transform: `translateX(-50%) scale(${interpolate(phoneScale, [0, 1], [0.8, 0.6])})`,
        opacity: phoneOpacity * 0.2, filter: "blur(3px)",
      }}>
        <Img src={staticFile("images/whatsapp-chat.jpg")} style={{ width: 700, borderRadius: 40 }} />
      </div>

      {/* Badge */}
      <div style={{
        position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)",
        background: "rgba(34,197,94,0.15)", borderRadius: 100, padding: "12px 28px",
        opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <span style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "#22c55e" }}>💬 WHATSAPP AUTOMÁTICO</span>
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: 155, left: 50, right: 50, textAlign: "center",
        opacity: interpolate(frame, [3, 20], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(spring({ frame: frame - 3, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [50, 0])}px)`,
      }}>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 60, color: "white", margin: 0, lineHeight: 1.05 }}>
          Atendimento
        </h2>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 60, color: "#22c55e", margin: 0, lineHeight: 1.05 }}>
          24/7 no automático
        </h2>
      </div>

      {/* Chat container */}
      <div style={{
        position: "absolute", top: 350, left: 40, right: 40,
        background: "rgba(0,0,0,0.3)", borderRadius: 32,
        border: "1px solid rgba(255,255,255,0.08)", padding: 24,
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {/* Chat header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14, paddingBottom: 16,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 24,
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 24 }}>🤖</span>
          </div>
          <div>
            <p style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "white", margin: 0 }}>Bot Celebrei</p>
            <p style={{ fontFamily, fontWeight: 400, fontSize: 14, color: "#22c55e", margin: 0 }}>● Online agora</p>
          </div>
        </div>

        {/* Messages */}
        {messages.map((msg, i) => {
          const msgOpacity = interpolate(frame, [msg.delay, msg.delay + 8], [0, 1], { extrapolateRight: "clamp" });
          const msgScale = spring({ frame: frame - msg.delay, fps, config: { damping: 20, stiffness: 250 } });
          const isBot = msg.from === "bot";

          return (
            <div key={i} style={{
              alignSelf: isBot ? "flex-start" : "flex-end",
              maxWidth: "82%", opacity: msgOpacity,
              transform: `scale(${interpolate(msgScale, [0, 1], [0.85, 1])})`,
              transformOrigin: isBot ? "left center" : "right center",
            }}>
              <div style={{
                background: isBot ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.25)",
                borderRadius: 18,
                borderBottomLeftRadius: isBot ? 4 : 18,
                borderBottomRightRadius: isBot ? 18 : 4,
                padding: "12px 18px",
              }}>
                <p style={{ fontFamily, fontWeight: 400, fontSize: 17, color: "rgba(255,255,255,0.9)", margin: 0, lineHeight: 1.4 }}>
                  {msg.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom stats */}
      <div style={{
        position: "absolute", bottom: 80, left: 50, right: 50,
        display: "flex", justifyContent: "space-around",
        opacity: interpolate(frame, [115, 130], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        {[
          { icon: "⚡", value: "3s", label: "Resposta" },
          { icon: "🤖", value: "24/7", label: "Sempre ativo" },
          { icon: "📈", value: "+40%", label: "Conversão" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <span style={{ fontSize: 36 }}>{s.icon}</span>
            <p style={{ fontFamily, fontWeight: 900, fontSize: 32, color: "#22c55e", margin: 0 }}>{s.value}</p>
            <p style={{ fontFamily, fontWeight: 400, fontSize: 14, color: "rgba(255,255,255,0.4)", margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
