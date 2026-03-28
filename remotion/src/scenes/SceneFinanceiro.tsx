import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "800", "900"], subsets: ["latin"] });

export const SceneFinanceiro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dashOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const dashY = interpolate(spring({ frame: frame - 10, fps, config: { damping: 20, stiffness: 150 } }), [0, 1], [80, 0]);

  const payments = [
    { name: "Festa Sofia", value: "R$ 8.500", status: "Pago", color: "#22c55e" },
    { name: "Festa Lucas", value: "R$ 12.000", status: "2/3 parcelas", color: "#eab308" },
    { name: "Festa Helena", value: "R$ 6.800", status: "Pendente", color: "#ef4444" },
  ];

  const statProgress = interpolate(frame, [60, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* Badge */}
      <div style={{
        position: "absolute", top: 130, left: "50%", transform: "translateX(-50%)",
        background: "rgba(34,197,94,0.15)", borderRadius: 100, padding: "12px 28px",
        opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <span style={{ fontFamily, fontWeight: 800, fontSize: 20, color: "#22c55e" }}>💰 CONTROLE FINANCEIRO</span>
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: 210, left: 50, right: 50, textAlign: "center",
        opacity: interpolate(frame, [3, 20], [0, 1], { extrapolateRight: "clamp" }),
        transform: `translateY(${interpolate(spring({ frame: frame - 3, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [50, 0])}px)`,
      }}>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 58, color: "white", margin: 0, lineHeight: 1.05 }}>
          Dinheiro no
        </h2>
        <h2 style={{ fontFamily, fontWeight: 900, fontSize: 58, color: "#22c55e", margin: 0, lineHeight: 1.05 }}>
          controle total
        </h2>
      </div>

      {/* Dashboard image */}
      <div style={{
        position: "absolute", top: 410, left: 25, right: 25,
        borderRadius: 20, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        opacity: dashOpacity, transform: `translateY(${dashY}px)`,
      }}>
        <Img src={staticFile("images/financial-dashboard.jpg")} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      {/* Payment cards */}
      <div style={{
        position: "absolute", bottom: 340, left: 35, right: 35,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {payments.map((p, i) => {
          const delay = 40 + i * 10;
          const cOp = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateRight: "clamp" });
          const cX = interpolate(spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 200 } }), [0, 1], [200, 0]);
          return (
            <div key={i} style={{
              background: "rgba(10,15,26,0.85)", borderRadius: 18, padding: "16px 20px",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              opacity: cOp, transform: `translateX(${cX}px)`,
            }}>
              <div>
                <p style={{ fontFamily, fontWeight: 800, fontSize: 18, color: "white", margin: 0 }}>{p.name}</p>
                <p style={{ fontFamily, fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>{p.status}</p>
              </div>
              <span style={{ fontFamily, fontWeight: 900, fontSize: 22, color: p.color }}>{p.value}</span>
            </div>
          );
        })}
      </div>

      {/* Revenue stats */}
      <div style={{
        position: "absolute", bottom: 140, left: 40, right: 40,
        display: "flex", gap: 16,
        opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        {[
          { label: "Receita mensal", value: `R$ ${Math.round(185000 * statProgress).toLocaleString("pt-BR")}`, color: "#22c55e" },
          { label: "Ticket médio", value: `R$ ${Math.round(9500 * statProgress).toLocaleString("pt-BR")}`, color: "#818cf8" },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, textAlign: "center", background: "rgba(255,255,255,0.05)",
            borderRadius: 18, padding: "18px 10px", border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <p style={{ fontFamily, fontWeight: 900, fontSize: 28, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontFamily, fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
