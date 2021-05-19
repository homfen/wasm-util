/**
 * @file  : ffmpeg-worker.js
 * @author: xingquan
 * Date   : 2021.03.19
 */
let ffmpeg = null;
let runResolve = null;
let running = false;

const NO_LOAD = Error(
  "FFmpeg.js is not ready, make sure you have completed load()."
);
const NO_MULTIPLE_RUN = Error("FFmpeg.js can only run one command at a time");

const setFile = (method, args) => {
  if (Module === null) {
    throw NO_LOAD;
  } else {
    return Module.FS[method](...args);
  }
};

const getFile = (data) => {
  return new Promise((resolve) => {
    if (data instanceof File || data instanceof Blob) {
      const fileReader = new FileReader();
      fileReader.onload = function (e) {
        const ab = e.target.result;
        resolve(new Uint8Array(ab));
      };
      fileReader.readAsArrayBuffer(data);
    } else if (data instanceof ArrayBuffer) {
      resolve(new Uint8Array(data));
    }
  });
};

const write = async (path, data) =>
  setFile("writeFile", [path, await getFile(data)]);

const read = (path) => setFile("readFile", [path]);

const remove = (path) => setFile("unlink", [path]);

const parseArgs = (cmd) => {
  const args = [];
  let nextDelimiter = 0;
  let prevDelimiter = 0;
  // eslint-disable-next-line no-cond-assign
  while ((nextDelimiter = cmd.indexOf(" ", prevDelimiter)) >= 0) {
    let arg = cmd.substring(prevDelimiter, nextDelimiter);
    let quoteIdx = arg.indexOf("'");
    let dblQuoteIdx = arg.indexOf('"');

    if (quoteIdx === 0 || dblQuoteIdx === 0) {
      /* The argument has a quote at the start i.e, 'id=0,streams=0 id=1,streams=1' */
      const delimiter = arg[0];
      const endDelimiter = cmd.indexOf(delimiter, prevDelimiter + 1);

      if (endDelimiter < 0) {
        throw new Error(
          `Bad command escape sequence ${delimiter} near ${nextDelimiter}`
        );
      }

      arg = cmd.substring(prevDelimiter + 1, endDelimiter);
      prevDelimiter = endDelimiter + 2;
      args.push(arg);
    } else if (quoteIdx > 0 || dblQuoteIdx > 0) {
      /* The argument has a quote in it, it must be ended correctly i,e. title='test' */
      if (quoteIdx === -1) quoteIdx = Infinity;
      if (dblQuoteIdx === -1) dblQuoteIdx = Infinity;
      const delimiter = quoteIdx < dblQuoteIdx ? "'" : '"';
      const quoteOffset = Math.min(quoteIdx, dblQuoteIdx);
      const endDelimiter = cmd.indexOf(
        delimiter,
        prevDelimiter + quoteOffset + 1
      );

      if (endDelimiter < 0) {
        throw new Error(
          `Bad command escape sequence ${delimiter} near ${nextDelimiter}`
        );
      }

      arg = cmd.substring(prevDelimiter, endDelimiter + 1);
      prevDelimiter = endDelimiter + 2;
      args.push(arg);
    } else if (arg !== "") {
      args.push(arg);
      prevDelimiter = nextDelimiter + 1;
    } else {
      prevDelimiter = nextDelimiter + 1;
    }
  }

  if (prevDelimiter !== cmd.length) {
    args.push(cmd.substring(prevDelimiter));
  }

  return args;
};

const string2pointer = (s) => {
  const ptr = Module._malloc((s.length + 1) * Uint8Array.BYTES_PER_ELEMENT);
  for (let i = 0; i < s.length; i += 1) {
    Module.setValue(ptr + i, s.charCodeAt(i), "i8");
  }
  Module.setValue(ptr + s.length, 0, "i8");
  return ptr;
};

const stringList2pointer = (strList) => {
  const listPtr = Module._malloc(
    strList.length * Uint32Array.BYTES_PER_ELEMENT
  );

  strList.forEach((s, idx) => {
    const strPtr = string2pointer(s);
    Module.setValue(listPtr + 4 * idx, strPtr, "i32");
  });

  return listPtr;
};

const detectCompletion = ({ message, type }) => {
  if (
    type === "ffmpeg-stdout" &&
    message === "FFMPEG_END" &&
    runResolve !== null
  ) {
    runResolve();
    runResolve = null;
    running = false;
  }
};

const init_ffmpeg = () => {
  return new Promise((resolve) => {
    if (Object.keys(Module.asm).length) {
      resolve();
      return;
    }
    setTimeout(() => {
      resolve(init_ffmpeg());
    }, 1000);
  });
};

const ffmpeg_run = (_args) => {
  if (ffmpeg === null) {
    throw NO_LOAD;
  } else if (running) {
    throw NO_MULTIPLE_RUN;
  } else {
    running = true;
    return new Promise((resolve) => {
      const args = [...defaultArgs, ...parseArgs(_args)].filter(
        (s) => s.length !== 0
      );
      runResolve = resolve;
      const listPtr = stringList2pointer(args);
      ffmpeg(args.length, listPtr);
    });
  }
};

const defaultArgs = [
  "./ffmpeg", // args[0] is always binary path
  "-nostdin", // Disable interaction mode
  "-hide_banner" // Not to output banner
];

self.onmessage = (event) => {
  // console.log("worker", event.data);
  const { files, type, name, args, url, debug = false } = event.data;
  let bytes = null;
  (async () => {
    try {
      switch (type) {
        case "init":
          Module = {
            urlPrefix: url
          };
          self.importScripts(url + "ffmpeg-core.js");
          await init_ffmpeg();
          ffmpeg = Module.cwrap("main", "number", ["number", "number"]);
          Module.setLogger((_log) => {
            const { type, message } = _log;
            detectCompletion(_log);
            if (debug) {
              console.log(type, message);
            }
          });
          self.postMessage({ type });
          break;
        case "write":
          await write(files.name, files.data);
          self.postMessage({ type, name: files.name });
          break;
        case "read":
          bytes = read(name);
          self.postMessage({ type, name, list: [bytes] });
          break;
        case "remove":
          remove(name);
          self.postMessage({ type, name });
          break;
        case "run":
          await ffmpeg_run(args);
          self.postMessage({ type, name, args });
          break;
        default:
          break;
      }
    } catch (ex) {
      self.postMessage({ type: "error", name: ex.toString() });
    }
  })();
};
