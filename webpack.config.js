const HtmlWebPackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const config = {
  mode: "development",
  entry: {
    index: "./demo/index.js",
    ffmpeg: "./demo/ffmpeg.js"
  },
  output: {
    filename: "[name].js",
    libraryTarget: "umd"
  },
  devtool: "#check-module-source-map",
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
      patterns: [{ from: "src/wasm" }, { from: "data" }]
    })
  ]
};

module.exports = () => {
  config.devtool = "cheap-module-source-map";
  config.plugins.push(
    new HtmlWebPackPlugin({
      template: "./demo/index.html",
      filename: "./index.html"
    }),
    new HtmlWebPackPlugin({
      template: "./demo/ffmpeg.html",
      filename: "./ffmpeg.html",
      inject: false
    })
  );
  return config;
};
