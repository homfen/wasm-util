import {
  ready,
  rgb2yuv,
  yuv2rgb,
  yuv2bgr,
  rgba2bgr,
  superpixel
} from "../src/js/index";

const img = document.querySelector("img");
function draw() {
  if (!ready) {
    setTimeout(draw, 100);
    return;
  }

  const width = img.width;
  const height = img.height;
  console.log("size", width, height);
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  console.log(imageData);

  let result = rgba2bgr(width, height, imageData.data);
  console.log("rgba2bgr", result);

  const rgb = new Uint8Array(width * height * 3);
  let count = 0;
  for (let i = 0; i < imageData.data.length; i++) {
    if (i % 4 === 3) continue;
    rgb[count] = imageData.data[i];
    count++;
  }
  console.log(rgb);

  result = rgb2yuv(width, height, rgb, width * 3);
  console.log("rgb2yuv", result);

  const { stride_y, stride_uv, y, u, v } = result;
  result = yuv2rgb(width, height, y, u, v, stride_y, stride_uv);
  let out_rgb = result.rgb;
  console.log("yuv2rgb", result);

  result = yuv2bgr(width, height, y, u, v, stride_y, stride_uv);
  console.log("yuv2bgr", result);

  let rgba = new Uint8ClampedArray(width * height * 4);
  count = 0;
  for (let i = 0; i < out_rgb.length; i++) {
    rgba[count] = out_rgb[i];
    count++;
    if (i % 3 === 2) {
      rgba[count] = 255;
      count++;
    }
  }
  const data = new ImageData(rgba, width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.putImageData(data, 0, 0);

  const start = performance.now();
  result = superpixel(width, height, 5000, imageData.data);
  console.log("region cost", performance.now() - start);
  const { border } = result;
  console.log("superpixel", result);

  const canvas2 = document.createElement("canvas");
  document.body.appendChild(canvas2);
  canvas2.style.width = `${width}px`;
  canvas2.style.height = `${height}px`;
  canvas2.width = width;
  canvas2.height = height;
  const ctx2 = canvas2.getContext("2d");
  rgba = new Uint8ClampedArray(width * height * 4);
  count = 0;
  for (let i = 0; i < border.length; i++) {
    const num = border[i];
    rgba[count] = 0;
    rgba[count + 1] = 0;
    rgba[count + 2] = 0;
    rgba[count + 3] = 0;
    if (num > 0) {
      rgba[count + 3] = 255;
    }
    count += 4;
  }
  const pixeldata = new ImageData(rgba, width, height);
  ctx2.clearRect(0, 0, width, height);
  ctx2.putImageData(pixeldata, 0, 0);
}

draw();
