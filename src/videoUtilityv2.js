import mp4Box from "mp4box";

// Global variables
let mp4File,
  frameRate = 24,
  videoSrc,
  lastFrameNumber = 0,
  handleEncodedChunk;

//videoDecoder is available in secure context only!
// Move this to app.js if running in a non-secure context

// Main function to setup file
export function setUpFile({ videoSrc, srcType, onReadyCB, onEncodedChunk }) {
  // Set the global variables
  videoSrc = videoSrc;
  mp4File = mp4Box.createFile();
  handleEncodedChunk = onEncodedChunk;

  mp4File.onSamples = onSample;

  // Setup ready callback
  mp4File.onReady = (info) => {
    const videoTrack = info.tracks.find((t) => "video" in t);
    mp4File.setExtractionOptions(videoTrack.id, null, {
      rapAlignment: true,
      nbSamples: 100,
    });
    const config = {
      codec: videoTrack.codec,
      description: getDescription(videoTrack),
      codedHeight: videoTrack.track_height,
      codedWidth: videoTrack.track_width,
    };

    // Call the callback when ready
    if (onReadyCB) onReadyCB(config);
    frameRate = videoTrack.nb_samples / videoTrack.movie_timescale;
  };

  // Fetch data if source type is URL
  if (srcType === "url") {
    fetchData(videoSrc, { start: 0, end: 10 * (1024 * 1024) }, (data) => {
      mp4File.appendBuffer(data);
    });
  }
}

export function getFrameByNumber2(frameNO) {
  getFrameByNumber(frameNO);
}

// Handle the incoming samples
let abort = false;
const gop = {};
const resArray = [];

function onSample(id, user, samples, clipInfo) {
  for (const sample of samples) {
    if (abort) return;
    const videoChunk = new window.EncodedVideoChunk({
      type: sample.is_sync ? "key" : "delta",
      timestamp: (1e6 * sample.cts) / sample.timescale,
      duration: (1e6 * sample.duration) / sample.timescale,
      data: sample.data,
      number: sample.number,
    });

    // Handle key and non-key frames differently
    if (videoChunk.type === "key") {
      gop[sample.number] = { frames: [] };
    }
    gop[sample.number]?.frames.push({ videoChunk, number: sample.number });
    resArray.push({ videoChunk, number: sample.number });

    // If reached the last frame, handle encoded chunk and abort
    if (sample.number >= lastFrameNumber) {
      if (handleEncodedChunk) {
        handleEncodedChunk(resArray);
        mp4File.stop();
        mp4File.flush();
        mp4File = null;
        abort = true;
      }
    }
  }
}

// Fetch the frame by frame number
function getFrameByNumber(frameNumber) {
  const buff = 5 * (1024 * 1024);
  const time = Number(frameNumber / frameRate).toFixed(2);

  const dataOffset2 = mp4File.seek(frameNumber + 100 / frameRate, true);

  const dataOffset = mp4File.seek(time, true);

  // Fetch the necessary data and append to the file
  fetchData(
    videoSrc,
    { start: dataOffset.offset, end: dataOffset2.offset },
    (data) => {
      mp4File.appendBuffer(data);
      mp4File.start();
    }
  );

  lastFrameNumber = frameNumber;
}

// Fetch the necessary data
async function fetchData(url, { start, end }, callback) {
  const response = await fetch(url, {
    headers: {
      Range: `bytes=${Number(start).toFixed()}-${Number(end).toFixed()}`,
    },
  });
  const responseBlob = await response.blob();
  const newBuffer = await responseBlob.arrayBuffer();
  newBuffer.fileStart = start;
  callback(newBuffer);
}

// Retrieve the description of a track
function getDescription(track) {
  const trak = mp4File.getTrackById(track.id);
  const DataStream = mp4Box.DataStream;
  for (const entry of trak.mdia.minf.stbl.stsd.entries) {
    if (entry.avcC || entry.hvcC) {
      const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN);
      if (entry.avcC) {
        entry.avcC.write(stream);
      } else {
        entry.hvcC.write(stream);
      }
      // Remove the box header and return
      return new Uint8Array(stream.buffer, 8);
    }
  }
}
