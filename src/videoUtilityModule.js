import mp4Box from "mp4box";

export class VideoUtility {
  #videoSrc = null;
  #srcType = null;
  #onReadyCB = null;
  #onEncodedChunk = null;

  //local variables
  #mp4file;
  #frameRate = 0;
  #lastFrameNumber;

  constructor({ videoSrc, srcType, onReadyCB, onEncodedChunk }) {
    //initiate constructior
    this.#videoSrc = videoSrc;
    this.srcType = srcType;
    this.#onReadyCB = onReadyCB.bind(this);
    this.#onEncodedChunk = onEncodedChunk.bind(this);

    this.initFile();
  }

  initFile() {
    this.#mp4file = mp4Box.createFile();
    this.#mp4file.onSamples = this.onSample.bind(this);
    this.#mp4file.handleEncodedChunk = this.#onEncodedChunk;
    this.#mp4file.onReady = (info) => {
      const videoTrack = info.tracks.find((t) => "video" in t);
      this.#mp4file.setExtractionOptions(videoTrack.id, null, {
        rapAlignment: true,
        nbSamples: 100,
      });
      const config = {
        codec: videoTrack.codec,
        description: this.getDescription(videoTrack),
        codedHeight: videoTrack.track_height,
        codedWidth: videoTrack.track_width,
      };

      if (this.#onReadyCB) this.#onReadyCB(config);

      this.#frameRate = videoTrack.nb_samples / videoTrack.movie_timescale;
    };
    //initalize file
    this.fetchData(
      this.#videoSrc,
      { start: 0, end: 10 * (1024 * 1024) },
      (data) => {
        this.#mp4file.appendBuffer(data);
      }
    );
  }

  requestFrameByNumber(frameNo) {
    //external request
    this.#gop = {};
    this.#resArray = [];
    this.#abort = false;
    this.#lastFrameNumber = frameNo;
    this.initFile();
    setTimeout(() => {
      this.getFrameByNumber(frameNo);
    }, 5000);
  }

  #gop = {};
  #resArray = [];
  #lastKey = 0;
  #abort = false;

  onSample(id, user, samples, clipInfo) {
    for (const sample of samples) {
      if (this.#abort) return;
      // console.log("rec samples", sample.number);
      //find closest key to frame requested
      const videoChunk = new window.EncodedVideoChunk({
        type: sample.is_sync ? "key" : "delta",
        timestamp: (1e6 * sample.cts) / sample.timescale,
        duration: (1e6 * sample.duration) / sample.timescale,
        data: sample.data,
        number: sample.number,
      });
      if (videoChunk.type === "key") {
        this.#lastKey = sample.number;
        this.#gop[sample.number] = { frames: [] };
        this.#gop[sample.number]?.frames.push({
          videoChunk,
          number: sample.number,
        });
      } else {
        this.#gop[sample.number]?.frames.push({
          videoChunk,
          number: sample.number,
        });
      }
      this.#resArray.push({ videoChunk, number: sample.number });
      if (sample.number >= this.#lastFrameNumber) {
        if (this.#onEncodedChunk) {
          this.#onEncodedChunk(this.#resArray);
          this.#mp4file.stop();
          this.#abort = true;

          this.#mp4file = null;
        }
      }
    }
  }

  getFrameByNumber(frameNumber) {
    //seek to particular frame
    const time = Number(frameNumber / this.#frameRate).toFixed(2);
    console.log("Seeking to TIme:", time);

    const dataOffset2 = this.#mp4file.seek(
      frameNumber + 100 / this.#frameRate,
      true
    );

    const dataOffset = this.#mp4file.seek(time, true);

    console.log(dataOffset);
    //fetch
    this.fetchData(
      this.#videoSrc,
      { start: dataOffset.offset, end: dataOffset2.offset },
      (data) => {
        this.#mp4file.appendBuffer(data);
        console.log("calling start again");
        this.#mp4file.start();
      }
    );

    this.#lastFrameNumber = frameNumber;
  }

  getDescription(track) {
    // Taken from the description method of this WebCodecs sample MP4Demuxer:
    //    https://github.com/w3c/webcodecs/blob/main/samples/video-decode-display/demuxer_mp4.js
    //make this dynamic
    const trak = this.#mp4file.getTrackById(track.id);
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

  async fetchData(url, { start, end }, callback) {
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
}
