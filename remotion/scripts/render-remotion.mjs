import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("Bundling...");
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

console.log("Opening browser...");
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

console.log("Selecting composition...");
const composition = await selectComposition({
  serveUrl: bundled,
  id: "main",
  puppeteerInstance: browser,
});

console.log(`Rendering ${composition.durationInFrames} frames at ${composition.fps}fps (${composition.width}x${composition.height})...`);
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: "/tmp/celebrei-video-only.mp4",
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
});

await browser.close({ silent: false });

// Mux audio track with ffmpeg
const audioPath = path.resolve(__dirname, "../public/audio/trilha.mp3");
const outputPath = "/mnt/documents/celebrei-promo.mp4";
console.log("Muxing audio...");

import { execSync } from "child_process";
execSync(
  `ffmpeg -y -i /tmp/celebrei-video-only.mp4 -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`,
  { stdio: "inherit" }
);

console.log("Done! Output:", outputPath);
