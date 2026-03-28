import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { Scene1Logo } from "./scenes/Scene1Logo";
import { Scene2CRM } from "./scenes/Scene2CRM";
import { Scene3WhatsApp } from "./scenes/Scene3WhatsApp";
import { Scene4Agenda } from "./scenes/Scene4Agenda";
import { Scene5Intel } from "./scenes/Scene5Intel";
import { Scene6Metrics } from "./scenes/Scene6Metrics";
import { Scene7CTA } from "./scenes/Scene7CTA";

const TRANSITION_DURATION = 20;
const timing = springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION });

export const MainVideo = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Persistent animated background
  const gradientAngle = 135 + Math.sin(frame * 0.008) * 15;
  const bgShift = Math.sin(frame * 0.005) * 8;

  return (
    <AbsoluteFill>
      {/* Animated gradient background */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(${gradientAngle}deg, #0a0f1a 0%, #0d1530 30%, #1a1040 60%, #0f0a25 100%)`,
        }}
      />

      {/* Floating orbs */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          top: 200 + Math.sin(frame * 0.015) * 40,
          left: -100 + Math.cos(frame * 0.01) * 30,
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)",
          bottom: 300 + Math.cos(frame * 0.012) * 35,
          right: -80 + Math.sin(frame * 0.018) * 25,
          filter: "blur(50px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)",
          top: 900 + Math.sin(frame * 0.02) * 30,
          left: 400 + Math.cos(frame * 0.014) * 20,
          filter: "blur(40px)",
        }}
      />

      {/* Scenes */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene1Logo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={230}>
          <Scene2CRM />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={230}>
          <Scene3WhatsApp />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={230}>
          <Scene4Agenda />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={230}>
          <Scene5Intel />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={220}>
          <Scene6Metrics />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />

        <TransitionSeries.Sequence durationInFrames={230}>
          <Scene7CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
