import { useEffect, useRef } from "react";
import "./App.css";
import { getFrameByNumber2, setUpFile } from "./VideoUtility";
import { WebGLRenderer } from "./Renderer";
import { useState } from "react";
import {
  Button,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from "@chakra-ui/react";

function App() {
  const canvasRef = useRef(null);
  const renderer = useRef(null);
  const [urlValue, setUrlValue] = useState(
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  );
  const [resquestedFrame, setResquestedFrame] = useState(100);
  const [isReady, setIsReady] = useState(false);
  const [isFileCheckLoading, setisFileCheckLoading] = useState(false);
  const [isFileCheckLoaded, setisFileCheckLoaded] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      renderer.current = new WebGLRenderer("webgl", canvasRef.current);
    }

    return () => {};
  }, [canvasRef.current]);

  let frameTimestamp = 0;
  const decoder = new window.VideoDecoder({
    output: handleDecodedFrame,
    error: (error) => {
      console.log("some error", error);
    },
  });

  function handleFileStart() {
    //check if the file uploaded is a valid h.264 codec video
    setisFileCheckLoading(true);
    if (urlValue) {
      setUpFile({
        videoSrc: urlValue,
        srcType: "url",
        onReadyCB: (config) => {
          setIsReady(true);
          setisFileCheckLoading(false);
          decoder.configure(config);
        },
        onEncodedChunk: (data) => {
          for (let i = 0; i < data.length; i++) {
            if (data[i].number === resquestedFrame) {
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
    if (frame.timestamp === frameTimestamp) {
      //render the image.
    }
    renderer.current.draw(frame);
    //if frame is equal to selected frame then render the frame
    frame.close();
  }

  return (
    <div className="App">
      {/* select input */}

      {true ? (
        <>
          <div
            style={{
              width: "100vw",
              height: "100vh",
              background: "#000",
              fontFamily: "'Poppins', sans-serif;",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontSize: "40px" }}>
                Single Video Frame Extract
              </span>
            </div>
            <div
              style={{
                width: "40%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "50px",
              }}
            >
              {/* container to select input */}
              <Input
                placeholder="Enter MP4 url"
                size={"md"}
                style={{ width: "80%" }}
                value={urlValue}
                onChange={(event) => setUrlValue(event.target.value)}
              />
              <Button
                onClick={() => handleFileStart()}
                isLoading={isFileCheckLoading}
              >
                Start
              </Button>
            </div>
            <hr
              style={{
                width: "100%",
                marginTop: "1px solid #333 !important",
                margin: "15px",
              }}
            />
            {isReady ? (
              <>
                <div
                  style={{
                    marginTop: "50px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "30%",
                  }}
                >
                  <NumberInput
                    defaultValue={10}
                    min={1}
                    max={5000}
                    value={resquestedFrame}
                    onChange={(event, value) => setResquestedFrame(value)}
                  >
                    <NumberInputField></NumberInputField>
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>

                  <Button onClick={() => getFrameByNumber2(resquestedFrame)}>
                    Extract
                  </Button>
                </div>
                <div
                  style={{
                    marginTop: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    width: "60%%",
                  }}
                >
                  <canvas
                    style={{
                      height: "400px",
                      width: "60%",
                      margin: "10px 40px",
                      backgroundColor: "#161515d9",
                    }}
                    ref={canvasRef}
                  ></canvas>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-around",
                      flexDirection: "column",
                      height: "100%",
                      width: "40%",
                    }}
                  >
                    <div
                      style={{
                        height: "250px",
                        width: "100%",
                        border: "1px solid white",
                        borderRadius: "20px",
                        backgroundColor: "#161515d9",
                      }}
                    >
                      {/* file info */}
                    </div>
                    <Button>Download Frame</Button>
                  </div>
                </div>
              </>
            ) : (
              <>Loading...</>
            )}
          </div>
        </>
      ) : (
        <>
          <input type="file" accept="video/mp4" />
          url
          <input
            type="url"
            onChange={(event) => setUrlValue(event.target.value)}
          />
          {/* <input
        type="number"
        onChange={(event) => setResquestedFrame(event.target.value)}
          /> */}
          {/* <button onClick={() => getFrameByNumber2(resquestedFrame)}>Start</button> */}
          <canvas height={350} width={700} />
        </>
      )}
    </div>
  );
}

export default App;
