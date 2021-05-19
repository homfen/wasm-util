rm -rf ../wasm/wasm-util.wasm ../wasm/wasm-util.js
export TOTAL_MEMORY=67108864
export EXPORTED_FUNCTIONS="[ \
		'_yuv2rgb', \
		'_yuv2rgba', \
		'_yuv2bgr', \
		'_rgb2yuv', \
		'_rgba2bgr', \
		'_bgr2rgba', \
    '_superpixel', \
		'_flush_imagedata', \
		'_flush_yuvdata', \
    '_flush_pixel'
]"

echo "Running Emscripten..."
em++ main.cpp yuv_rgb.cpp SLIC.cpp \
    -O2 \
    -s WASM=1 \
    -s TOTAL_MEMORY=${TOTAL_MEMORY} \
    -s ALLOW_MEMORY_GROWTH=1 \
   	-s EXPORTED_FUNCTIONS="${EXPORTED_FUNCTIONS}" \
   	-s EXTRA_EXPORTED_RUNTIME_METHODS="['addFunction']" \
		-s RESERVED_FUNCTION_POINTERS=14 \
		-s FORCE_FILESYSTEM=1 \
    -s ASSERTIONS=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="createModule" \
    -o ../wasm/wasm-util.js

echo "Finished Build"

