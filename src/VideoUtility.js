import mp4Box from "mp4box";
let mp4File;
let frameRate;
let videoSrc;

let lastFrameNumber = 0;

const videoDecoder = new VideoDecoder({
  output: (frame) => {
    console.log(frame);
    frame.close();
  },
  error: () => {}
})

export function setUpFile({ videoSrc, srcType, onReadyCB }) {
  videoSrc = videoSrc
  mp4File = mp4Box.createFile();

  const handler = {
    pass: getFrameByNumber,
  };

  mp4File.onSamples= onSample;

  mp4File.onReady = (info) => {
    //mdat box is parsed no video can be used
    if (onReadyCB) onReadyCB(handler);
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

    VideoDecoder.configure(config);

    frameRate = videoTrack.nb_samples / videoTrack.movie_timescale;
  
  };
  if (srcType === "url") {
    fetchData(videoSrc, { start: 0, end: 10 * (1024 * 1024) }, (data) => {
      mp4File.appendBuffer(data);
    });
  }
}

const gop = {};
let lastKey = 0;

function onSample(id, user, samples, clipInfo){
  for(const sample of samples){
    //find closest key to frame requested
      const videoChunk = new window.EncodedVideoChunk({
        type: sample.is_sync ? "key" : "delta",
        timestamp: (1e6 * sample.cts) / sample.timescale,
        duration: (1e6 * sample.duration) / sample.timescale,
        data: sample.data,
        number: sample.number,
      });
      if(videoChunk.type === 'key'){
        lastKey = sample.number;
        gop[sample.number] = {frames: []};
        
      }
      gop[sample.number]?.frames.push({videoChunk,number: sample.number});
     if(sample.number === lastFrameNumber){
      handleEncodedChunk(gop[lastFrameNumber]);
     } 

  }

}



function getFrameByNumber(frameNumber) {
  //seek
  const buff = 10 * (1024 * 1021);
  const time  =  frameNumber / frameRate;
  const dataOffset = mp4File.seek(time, true)
  //fetch
  fetchData(videoSrc, {start: dataOffset.offset, end: dataOffset.offset + buff}, (data) => {
    mp4File.appendBuffer(data)
  });

  lastFrameNumber = frameNumber;

  //read from decoder
  mp4File.start();
  //return
}

function handleEncodedChunk({frames}){
  for(const frame in frames){
    videoDecoder.decode(frame)
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
