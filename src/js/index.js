let wasmUtil;
let ready = false;
const me = "object" === typeof window ? window : self;
(async function init() {
  if (!me.createModule) {
    setTimeout(init, 200);
    return;
  }
  wasmUtil = await me.createModule({}, "");
  // window.wasmUtil = wasmUtil;
  ready = true;
  // console.log('wasmUtil', wasmUtil);
})();

const yuv2rgb = (
  width,
  height,
  y,
  u,
  v,
  stride_y,
  stride_uv,
  bgr = false,
  rgba = false
) => {
  if (!wasmUtil) return;

  const offset_y = wasmUtil._malloc(y.length);
  wasmUtil.HEAP8.set(y, offset_y);
  const offset_u = wasmUtil._malloc(u.length);
  wasmUtil.HEAP8.set(u, offset_u);
  const offset_v = wasmUtil._malloc(v.length);
  wasmUtil.HEAP8.set(v, offset_v);
  const func = bgr
    ? wasmUtil._yuv2bgr
    : rgba
    ? wasmUtil._yuv2rgba
    : wasmUtil._yuv2rgb;
  const ptr = func(
    width,
    height,
    offset_y,
    offset_u,
    offset_v,
    stride_y,
    stride_uv
  );
  const w = wasmUtil.HEAPU32[ptr / 4];
  const h = wasmUtil.HEAPU32[ptr / 4 + 1];
  const addr_rgb = wasmUtil.HEAPU32[ptr / 4 + 2];
  //console.log('addr_rgb', addr_rgb);
  const rgb = wasmUtil.HEAPU8.slice(
    addr_rgb,
    addr_rgb + w * h * (rgba ? 4 : 3)
  );

  wasmUtil._free(offset_y);
  wasmUtil._free(offset_u);
  wasmUtil._free(offset_v);
  wasmUtil._flush_imagedata(ptr);
  //console.log({w, h, rgb});
  return { width, height, [bgr ? "bgr" : "rgb"]: rgb };
};

const yuv2bgr = (width, height, y, u, v, stride_y, stride_uv) => {
  return yuv2rgb(width, height, y, u, v, stride_y, stride_uv, true);
};

const yuv2rgba = (width, height, y, u, v, stride_y, stride_uv) => {
  return yuv2rgb(width, height, y, u, v, stride_y, stride_uv, false, true);
};

const rgb2yuv = (width, height, rgb, stride_rgb) => {
  if (!wasmUtil) return;

  const offset = wasmUtil._malloc(rgb.length);
  wasmUtil.HEAP8.set(rgb, offset);
  const ptr = wasmUtil._rgb2yuv(width, height, offset, stride_rgb);
  const w = wasmUtil.HEAPU32[ptr / 4];
  const h = wasmUtil.HEAPU32[ptr / 4 + 1];
  const addr_y = wasmUtil.HEAPU32[ptr / 4 + 2];
  const addr_u = wasmUtil.HEAPU32[ptr / 4 + 3];
  const addr_v = wasmUtil.HEAPU32[ptr / 4 + 4];
  const stride_y = wasmUtil.HEAPU32[ptr / 4 + 5];
  const stride_uv = wasmUtil.HEAPU32[ptr / 4 + 6];
  const y = wasmUtil.HEAPU8.slice(addr_y, addr_y + stride_y * height);
  const u = wasmUtil.HEAPU8.slice(addr_u, addr_u + (stride_uv * height) / 2);
  const v = wasmUtil.HEAPU8.slice(addr_v, addr_v + (stride_uv * height) / 2);

  wasmUtil._free(offset);
  wasmUtil._flush_yuvdata(ptr);
  //console.log({w, h, stride_y, stride_uv, y, u, v});
  return { width: w, height: h, stride_y, stride_uv, y, u, v };
};

const rgba2bgr = (width, height, rgba) => {
  if (!wasmUtil) return;

  const offset = wasmUtil._malloc(rgba.length);
  wasmUtil.HEAP8.set(rgba, offset);
  const ptr = wasmUtil._rgba2bgr(width, height, offset);
  const w = wasmUtil.HEAPU32[ptr / 4];
  const h = wasmUtil.HEAPU32[ptr / 4 + 1];
  const addr_bgr = wasmUtil.HEAPU32[ptr / 4 + 2];
  const bgr = wasmUtil.HEAPU8.slice(addr_bgr, addr_bgr + w * h * 3);

  wasmUtil._free(offset);
  wasmUtil._flush_imagedata(ptr);
  //console.log({w, h, bgr});
  return { width: w, height: h, bgr };
};

const superpixel = (width, height, size, rgba) => {
  const offset = wasmUtil._malloc(rgba.length);
  wasmUtil.HEAP8.set(rgba, offset);
  const ptr = wasmUtil._superpixel(width, height, size, offset);
  const addr_region = wasmUtil.HEAPU32[ptr / 4];
  const addr_border = wasmUtil.HEAPU32[ptr / 4 + 1];
  const region = wasmUtil.HEAPU32.slice(
    addr_region / 4,
    addr_region / 4 + width * height
  );
  const border = wasmUtil.HEAPU32.slice(
    addr_border / 4,
    addr_border / 4 + width * height
  );
  wasmUtil._free(offset);
  wasmUtil._flush_pixel(ptr);
  return { region, border };
};

export { ready, yuv2rgb, yuv2rgba, yuv2bgr, rgb2yuv, rgba2bgr, superpixel };
