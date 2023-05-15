import mp4Box from "mp4box";
let mp4File;
let frameRate = 24;
let videoSrc = "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

let lastFrameNumber = 0;
let handleEncodedChunk;

//videoDecoder is avilable in secure context only!,
//move this to app.js

export function setUpFile({ videoSrc, srcType, onReadyCB, onEncodedChunk }) {
  videoSrc = videoSrc
  mp4File = mp4Box.createFile();
  handleEncodedChunk = onEncodedChunk

  const handler = {
    pass: getFrameByNumber,
  };

  mp4File.onSamples= onSample;

  mp4File.onReady = (info) => {
    console.log(info);
    //mdat box is parsed no video can be used
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
    
    if (onReadyCB) onReadyCB(config);
    
    frameRate = videoTrack.nb_samples / videoTrack.movie_timescale;
  
  };
  if (srcType === "url") {
    fetchData(videoSrc, { start: 0, end: 10 * (1024 * 1024) }, (data) => {
      mp4File.appendBuffer(data);
    });
  }
}

export function getFrameByNumber2(frameNO){
  getFrameByNumber(frameNO);
}

const gop = {};
const resArray = [];
let lastKey = 0;
let abort = false;

function onSample(id, user, samples, clipInfo){
  for(const sample of samples){
    if(abort) return;
    // console.log("rec samples", sample.number);
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
        gop[sample.number]?.frames.push( {videoChunk, number: sample.number} );
        
      }else{
        gop[sample.number]?.frames.push({videoChunk,number: sample.number});
      }
      resArray.push({videoChunk, number: sample.number})
     if(sample.number >= lastFrameNumber){
      if(handleEncodedChunk){
        handleEncodedChunk(resArray);
        abort = true;
      }
     } 

  }

}



function getFrameByNumber(frameNumber) {
  //seek
  const buff = 5 * (1024 * 1024);
  const time  =  Number(frameNumber / frameRate).toFixed(2);
  console.log("Seeking to TIme:", time);


  const dataOffset2 = mp4File.seek(frameNumber + 100 / frameRate, true);

  const dataOffset = mp4File.seek(time, true);

  console.log(dataOffset);
  //fetch
  fetchData(videoSrc, {start: dataOffset.offset, end: dataOffset2.offset}, (data) => {
    mp4File.appendBuffer(data);
    console.log("calling start again");
    mp4File.start();
  });

  lastFrameNumber = frameNumber;

  //read from decoder
  //return
}



async function fetchData(url, { start, end }, callback) {
  console.log(Number(start).toFixed(),Number(end).toFixed());
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
