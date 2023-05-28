import { useEffect, useRef } from "react";
import "./App.css";
import { getFrameByNumber2, setUpFile } from "./VideoUtility";
import { WebGLRenderer } from "./Renderer";

function App() {
  const resquestedFrame = 2000;
  const canvasRef = useRef(null);
  const renderer = useRef(null);
  useEffect(() => {
    if(canvasRef.current){
      renderer.current = new WebGLRenderer("webgl", canvasRef.current);
    }
  
    return () => {
      
    }
  }, [])
  
  let frameTimestamp = 0;
  const decoder = new window.VideoDecoder({
    output: handleDecodedFrame,
    error: (error) => {
      console.log("some error", error);
    },
  });

  function handleFileUpload(event) {
    
    //check if the file uploaded is a valid h.264 codec video
    const file = event.target.files[0];
    if (file) {
      setUpFile({
        videoSrc:
          "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        srcType: "url",
        onReadyCB: (config) => {
          decoder.configure(config);
        },
        onEncodedChunk: (data) => {
          console.log(data);
          for (let i = 0; i < data.length; i++) {
            if(data[i].number === resquestedFrame){
              console.log(data[i].videoChunk);
              frameTimestamp = data[i].videoChunk.timestamp;
            }
            if (data[i].videoChunk) {
              decoder.decode(data[i].videoChunk);
            }
          }
        },
      });
    }
  }

  function handleDecodedFrame(frame) {
    console.log(frame.timestamp, frameTimestamp);
    if(frame.timestamp === frameTimestamp){
      //render the image.
      renderer.current.draw(frame);
    }
    //if frame is equal to selected frame then render the frame
    frame.close();
  }

  return (
    <div className="App">
      Extract Frame from an Video. Upload
      <input type="file" accept="video/mp4" onChange={handleFileUpload} />
      url
      <input type="url" />
      <button onClick={() => getFrameByNumber2(resquestedFrame)}>Start</button>
      <canvas height={800} width={1200} ref={canvasRef}/>
    </div>
  );
}

export default App;
