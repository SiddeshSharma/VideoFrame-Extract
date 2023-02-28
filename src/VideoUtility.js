import { createFile } from "mp4box";
let mp4File;

export function setUpFile({ videoSrc, srcType, onReadyCB }) {
  mp4File = createFile();

  mp4File.onReady = (info) => {
    //mdat box is parsed no video can be used
    if (onReadyCB) onReadyCB();
    const videoTrack = info.tracks.find((t) => "video" in t);
    mp4File.setExtractionOptions(videoTrack.id, null, {
      rapAlignment: true,
      nbSamples: 10,
    });

    const config = {
      codec: videoTrack.codec,
      description: getDescription(videoTrack),
      codedHeight: videoTrack.track_height,
      codedWidth: videoTrack.track_width,
    };
  };
  if (srcType === "url") {
    fetchData(videoSrc, { start: 0, end: 10 * (1024 * 1024) }, (data) => {
      mp4File.appendBuffer(data);
    });
  }
}

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

function getDescription(track) {
  // Taken from the description method of this WebCodecs sample MP4Demuxer:
  //    https://github.com/w3c/webcodecs/blob/main/samples/video-decode-display/demuxer_mp4.js
  //make this dynamic
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
      return new Uint8Array(stream.buffer, 8); // Remove the box header.
    }
  }
}
