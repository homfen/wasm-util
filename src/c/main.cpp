#include <stddef.h>
#include <stdlib.h>
#include <vector>
#include "yuv_rgb.h"
#include "SLIC.h"

typedef struct {
    uint32_t width;
    uint32_t height;
    uint8_t *data;
} ImageData;

typedef struct {
    uint32_t width;
    uint32_t height;
    uint8_t *y;
    uint8_t *u;
    uint8_t *v;
    uint32_t y_stride;
    uint32_t uv_stride;
} YuvData;

typedef struct {
    int *region;
    int *border;
} PixelData;

extern "C" {
ImageData *yuv2rgb(uint32_t width, uint32_t height,
    const uint8_t *y, const uint8_t *u, const uint8_t *v,
    uint32_t y_stride, uint32_t uv_stride) {

    ImageData* imageData = NULL;
    imageData = (ImageData *)malloc(sizeof(ImageData));
    imageData->width = width;
    imageData->height = height;
    uint8_t *data = NULL;
    data = static_cast<uint8_t *>(malloc(width*height*3));
    yuv420_rgb24_std(width, height, y, u, v, y_stride, uv_stride, data, width*3, YCBCR_601);
    imageData->data = data;
    return imageData;
} 

ImageData *yuv2rgba(uint32_t width, uint32_t height,
    const uint8_t *y, const uint8_t *u, const uint8_t *v,
    uint32_t y_stride, uint32_t uv_stride) {

    ImageData* imageData = NULL;
    imageData = (ImageData *)malloc(sizeof(ImageData));
    imageData->width = width;
    imageData->height = height;
    uint8_t *data = NULL;
    data = static_cast<uint8_t *>(malloc(width*height*4));
    yuv420_rgba_std(width, height, y, u, v, y_stride, uv_stride, data, width*4, YCBCR_601);
    imageData->data = data;
    return imageData;
} 

ImageData *yuv2bgr(uint32_t width, uint32_t height,
    const uint8_t *y, const uint8_t *u, const uint8_t *v,
    uint32_t y_stride, uint32_t uv_stride) {

    ImageData* imageData = NULL;
    imageData = (ImageData *)malloc(sizeof(ImageData));
    imageData->width = width;
    imageData->height = height;
    uint8_t *data = NULL;
    data = static_cast<uint8_t *>(malloc(width*height*3));
    yuv420_bgr_std(width, height, y, u, v, y_stride, uv_stride, data, width*3, YCBCR_601);
    imageData->data = data;
    return imageData;
} 

ImageData *rgba2bgr(uint32_t width, uint32_t height,
    const uint8_t *rgba) {
    ImageData* imageData = NULL;
    imageData = (ImageData *)malloc(sizeof(ImageData));
    imageData->width = width;
    imageData->height = height;
    uint8_t *data = NULL;
    data = static_cast<uint8_t *>(malloc(width*height*3));
    int count = 0;
    for (int i = 0; i < width * height * 4; i += 4) {
      data[count] = rgba[i+2];
      data[count+1] = rgba[i+1];
      data[count+2] = rgba[i];
      count += 3;
    }
    imageData->data = data;
    return imageData;
}

ImageData *bgr2rgba(uint32_t width, uint32_t height,
    const uint8_t *bgr) {
    ImageData* imageData = NULL;
    imageData = (ImageData *)malloc(sizeof(ImageData));
    imageData->width = width;
    imageData->height = height;
    uint8_t *data = NULL;
    data = static_cast<uint8_t *>(malloc(width*height*4));
    int count = 0;
    for (int i = 0; i < width * height * 3; i += 3) {
      data[count] = bgr[i+2];
      data[count+1] = bgr[i+1];
      data[count+2] = bgr[i];
      data[count+3] = 255;
      count += 4;
    }
    imageData->data = data;
    return imageData;
}

YuvData *rgb2yuv(uint32_t width, uint32_t height,
    const uint8_t *rgb, uint32_t rgb_stride) {

    YuvData* yuvData = NULL;
    yuvData = (YuvData *)malloc(sizeof(YuvData));
    yuvData->width = width;
    yuvData->height = height;
    uint8_t *YUV = NULL, *Y = NULL, *U = NULL, *V = NULL;
    YUV = static_cast<uint8_t *>(malloc(width*height*3/2));
		Y = YUV;
		U = YUV+width*height;
		V = YUV+width*height+((width+1)/2)*((height+1)/2);

    rgb24_yuv420_std(width, height, rgb, rgb_stride, Y, U, V, width, (width+1)/2, YCBCR_601);
    yuvData->y = Y;
    yuvData->u = U;
    yuvData->v = V;
    yuvData->y_stride = width;
    yuvData->uv_stride = (width+1)/2;
    return yuvData;
} 

void flush_imagedata(ImageData* buf) {
    delete buf->data;
    delete buf;
}

void flush_yuvdata(YuvData* buf) {
    // delete buf->y;
    // delete buf->u;
    // delete buf->v;
    delete buf;
}

void flush_pixel(PixelData* buf) {
    free(buf->region);
    free(buf->border);
    free(buf);
}

PixelData *superpixel(uint32_t width, uint32_t height, int size, const uint8_t * rgba) {
  unsigned int *pbuff = new unsigned int[width*height];
  unsigned int b, g, r;
  for (int i = 0; i < height; i++) {
		for (int j = 0; j < width; j++) {
      int idx = i*width+j;
      int index = 4*idx;
			r = rgba[index];
			g = rgba[index + 1];
			b = rgba[index + 2];
			pbuff[idx] = (0x00FF0000 & (r << 16)) | (0x0000FF00 & (g << 8)) | (0x000000FF & b);
		}
	}

  int k = size;
  double m = 10;
	int *klabels = new int[width*height];
	int *edgeMap = new int[width*height];
	int numlabels = 0;

  SLIC segment;
  segment.DoSuperpixelSegmentation_ForGivenSuperpixelSize(pbuff, width, height, klabels, numlabels, k, m, false, 20);
  segment.ComputeEdgeMap(klabels, edgeMap, width, height);

  PixelData* pixelData = NULL;
  pixelData = (PixelData *)malloc(sizeof(PixelData));
  pixelData->region = klabels;
  pixelData->border = edgeMap;
  return pixelData;
}

}


