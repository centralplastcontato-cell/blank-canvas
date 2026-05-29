const { Jimp } = require("jimp");
const path = require("path");

const INPUT = path.join(__dirname, "../src/assets/thumb-planeta-logo.jpg");
const OUTPUT = path.join(__dirname, "../src/assets/thumb-planeta-logo-transparent.png");

Jimp.read(INPUT).then((image) => {
  // Sample corner pixel as background color
  const bgColor = image.getPixelColor(2, 2);
  const bgR = (bgColor >> 24) & 0xff;
  const bgG = (bgColor >> 16) & 0xff;
  const bgB = (bgColor >> 8) & 0xff;

  console.log(`Background color sampled: rgb(${bgR}, ${bgG}, ${bgB})`);

  const THRESHOLD = 50;

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];

    const dist = Math.sqrt(
      Math.pow(r - bgR, 2) +
      Math.pow(g - bgG, 2) +
      Math.pow(b - bgB, 2)
    );

    if (dist < THRESHOLD) {
      this.bitmap.data[idx + 3] = 0;
    }
  });

  return image.write(OUTPUT);
}).then(() => {
  console.log(`Saved: ${OUTPUT}`);
}).catch(console.error);
