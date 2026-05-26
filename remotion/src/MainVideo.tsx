import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { SceneIntro } from "./scenes/SceneIntro";
import { SceneCRM } from "./scenes/SceneCRM";
import { SceneWhatsApp } from "./scenes/SceneWhatsApp";
import { SceneAgenda } from "./scenes/SceneAgenda";
import { SceneFinanceiro2 } from "./scenes/SceneFinanceiro2";
import { SceneOutro } from "./scenes/SceneOutro";
import { PersistentBackground } from "./components/PersistentBackground";

const TRANSITION = 20;
const timing = springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION });

export const MainVideo = () => {
  return (
    <AbsoluteFill>
      <Audio src={staticFile("audio/trilha.mp3")} volume={0.7} />
      <PersistentBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={150}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={140}>
          <SceneCRM />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={140}>
          <SceneWhatsApp />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={140}>
          <SceneAgenda />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-left" })} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={140}>
          <SceneFinanceiro2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={timing} />
        <TransitionSeries.Sequence durationInFrames={120}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
