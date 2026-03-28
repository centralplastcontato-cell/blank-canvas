import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 9 scenes: 150+200+200+210+200+200+200+180+250 = 1790
// 8 transitions: 20 frames each = 160 overlap
// Total ≈ 1630 frames ≈ 54 seconds at 30fps
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={1630}
    fps={30}
    width={1080}
    height={1920}
  />
);
