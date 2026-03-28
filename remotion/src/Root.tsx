import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 9 scenes: 200+200+220+230+210+200+200+200+300 = 1960
// 8 transitions: ~20 frames each = 160 overlap
// Total ≈ 1800 frames = 60 seconds at 30fps
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={1800}
    fps={30}
    width={1080}
    height={1920}
  />
);
