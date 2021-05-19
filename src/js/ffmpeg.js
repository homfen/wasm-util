/**
 * @file  : ffmpeg.js
 * @author: xingquan
 * Date   : 2021.03.19
 */
import { Parser } from "m3u8-parser";
import work from "webworkify-webpack";

function getFilename(url) {
  const hash = url.indexOf("#");
  if (hash > -1) {
    url = url.slice(0, hash);
  }
  const query = url.indexOf("?");
  if (query > -1) {
    url = url.slice(0, query);
  }
  const result = url.match(/\/([^\/]+)$/);
  if (result && result.length) {
    return result[1];
  }
}

function secondToStr(seconds) {
  seconds = Math.floor(seconds);
  const hour = Math.floor(seconds / 3600);
  const minute = Math.floor((seconds - hour * 3600) / 60);
  const second = seconds - hour * 3600 - minute * 60;
  return [hour, minute, second]
    .map((a) => {
      if (a < 10) {
        return `0${a}`;
      }
      return a;
    })
    .join(":");
}

function arrayBufferToBase64(bytes) {
  var binary = "";
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export default class FFmpeg {
  constructor(params) {
    const {
      libPath,
      onChange = console.log,
      debug = false,
      fromList = true
    } = params;
    this.libPath = libPath;
    this.onChange = onChange.bind(this);
    this.debug = debug;
    this.fromList = fromList;
    this.initWorker();
  }

  initWorker() {
    this.worker = work(require.resolve("./ffmpeg-worker.js"));
    this.worker.onmessage = (event) => {
      // console.log("receive", event.data);
      const { type, name, list, args } = event.data;
      switch (type) {
        case "init":
          setTimeout(() => {
            this.onChange({ type });
          }, 100);
          break;
        case "write":
        case "remove":
        case "error":
          if (this.fromList && type === "write") {
            this.currentFile = name;
            this.getBySecond(name, this.currentTime);
          } else {
            this.onChange({ type, name });
          }
          break;
        case "run":
          if (this.fromList) {
            this.readFile(name);
          } else {
            this.onChange({ type, name, args });
          }
          break;
        case "read":
          if (this.fromList) {
            this.removeFile(this.currentFile);
            this.removeFile(name);
          }
          const imgs = list.map((bytes) => {
            const base64 = arrayBufferToBase64(bytes);
            return "data:image/jpeg;base64," + base64;
          });
          this.onChange({ type, name, imgs });
          break;
        default:
          break;
      }
    };
    this.worker.postMessage({
      type: "init",
      url: this.libPath,
      debug: this.debug
    });
  }

  loadList(url) {
    this.listUrl = url;
    this.urlPrefix = url.slice(0, url.lastIndexOf("/") + 1);
    fetch(url)
      .then((res) => res.text())
      .then((source) => {
        const parser = new Parser();
        parser.push(source);
        parser.end();
        this.manifest = parser.manifest;
        this.manifest.segments.forEach((segment, idx, arr) => {
          const prev = arr[idx - 1];
          segment.start = prev ? prev.end : 0;
          segment.end = segment.start + segment.duration;
        });
        console.log("manifest", this.manifest);
        this.onChange({ type: "loadList" });
      });
  }

  readFile(name) {
    this.worker.postMessage({ type: "read", name });
  }

  writeFile(url, filename) {
    if (!filename) {
      filename = getFilename(url);
    }
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        this.worker.postMessage({
          type: "write",
          files: { name: filename, data: buffer }
        });
      });
  }

  removeFile(name) {
    if (!name) return;

    this.worker.postMessage({ type: "remove", name });
  }

  getByFrame(filename, frame) {
    const name = "0.jpg";
    const args = [
      "-threads 1",
      `-i ${filename}`,
      "-loglevel repeat+level+verbose",
      `-vf select='eq(n\, ${frame})'`,
      "-vframes 1",
      "0.jpg"
    ].join(" ");
    this.run(args, name);
  }

  getBySecond(filename, second) {
    const time = secondToStr(second);
    const name = "0.jpg";
    const args = [
      "-threads 1",
      `-i ${filename}`,
      "-loglevel repeat+level+verbose",
      "-err_detect aggressive",
      "-fflags discardcorrupt",
      `-ss ${time}`,
      "-vframes 1",
      "0.jpg"
    ].join(" ");
    this.run(args, name);
  }

  getBySecondFromList(second) {
    const segment = this.getSegmentBySecond(second);
    if (!segment) {
      this.onChange({ type: "error", name: "time out of range" });
      return;
    }

    this.currentTime = second - segment.start;
    const url =
      segment.uri.indexOf("http") > -1
        ? segment.uri
        : this.urlPrefix + segment.uri;
    const filename = getFilename(segment.uri);
    this.writeFile(url, filename);
  }

  getSegmentBySecond(second) {
    return this.manifest.segments.find(
      ({ start, end }) => start <= second && second < end
    );
  }

  run(args, name) {
    this.worker.postMessage({
      type: "run",
      name,
      args
    });
  }

  destroy() {
    this.worker.terminate();
  }
}
