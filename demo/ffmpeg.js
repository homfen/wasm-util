import FFmpeg from "../src/js/ffmpeg";

const playlist =
  "http://livenging.alicdn.com/mediaplatform/57ebe74f-404e-48de-bf85-41f882a73777_merge.m3u8";

//  ffmpeg
let ffmpeg = null;
let count = 0;
// const seconds = Array.from(Array(10)).map((_, idx) => idx * 5);
const seconds = [
  2856.15,
  2868.15,
  2880.15,
  2892.15,
  2904.15,
  2964.15,
  2976.15,
  2988.15,
  3000.15,
  3012.15
];
const onChange = (data) => {
  console.log("receive", data);
  const { type, imgs } = data;
  switch (type) {
    case "init":
      ffmpeg.loadList(playlist);
      break;
    case "loadList":
      ffmpeg.getBySecondFromList(seconds[count]);
      count++;
      break;
    case "read":
      const img = document.createElement("img");
      img.src = imgs[0];
      img.style.width = "400px";
      document.body.appendChild(img);
      if (count < seconds.length) {
        ffmpeg.getBySecondFromList(seconds[count]);
        count++;
      }
    default:
      break;
  }
};
ffmpeg = new FFmpeg({
  // libPath: "http://localhost:5001/",
  libPath: "https://dev.g.alicdn.com/web/discovery/1.0.1/",
  onChange,
  debug: false
});
