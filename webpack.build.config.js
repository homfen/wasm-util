const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const config = {
  mode: "production",
  entry: {
    index: "./src/js/index.js",
    ffmpeg: "./src/js/ffmpeg.js"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    libraryTarget: "umd"
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: require.resolve("babel-loader")
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "src/wasm" }]
    })
  ]
};

module.exports = () => {
  return config;
};
