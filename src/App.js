import { useEffect, useRef } from "react";
import "./App.css";
import { getFrameByNumber2, setUpFile } from "./VideoUtility";
import { WebGLRenderer } from "./Renderer";
import { useState } from "react";
import {
  Button,
  Fade,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from "@chakra-ui/react";
import { VideoUtility } from "./videoUtilityModule";

function App() {
  const canvasRef = useRef(null);
  const renderer = useRef(null);
  const decoder = useRef(null);
  const videoUility = useRef(null);
  const [urlValue, setUrlValue] = useState(
    "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
  );
  const [resquestedFrame, setResquestedFrame] = useState(100);
  const [isReady, setIsReady] = useState(false);
  const [isFileCheckLoading, setisFileCheckLoading] = useState(false);
  const [urlError, setUrlError] = useState(false);
  const [fileConfig, setFileConfig] = useState({});
  const [isVerifed, setIsVerifed] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      renderer.current = new WebGLRenderer("webgl", canvasRef.current);
    }
    if (!decoder.current) {
      decoder.current = new window.VideoDecoder({
        output: handleDecodedFrame,
        error: (error) => {
          console.log("some error", error);
        },
      });
    }
    return () => {};
  }, [canvasRef.current]);

  let frameTimestamp = 0;

  async function handleLinkVerification() {
    async function validateMP4(url) {
      const controller = new AbortController();
      const response = await fetch(url, { signal: controller.signal });
      const reader = response.body.getReader();
      const { value: chunk } = await reader.read(); // read the first chunk
      reader.releaseLock(); // release the lock so that the stream can be canceled

      const signature = new TextDecoder("ascii").decode(
        new Uint8Array(chunk.slice(4, 8))
      );
      console.log(signature);
      // MP4 files should have 'ftyp' here.
      return { urlErrorCheck: signature === "ftyp", cancelSignal: controller };
    }

    const { urlErrorCheck, cancelSignal } = await validateMP4(urlValue);
    cancelSignal.abort();
    setUrlError(urlErrorCheck);
    setIsVerifed(urlErrorCheck);
  }

  async function handleFileStart() {
    //validate url first
    //try string ops to check valid mp4 file
    if (!isVerifed) {
      return;
    }
    //try fetching data
    //check if the file uploaded is a valid h.264 codec video
    if (urlValue) {
      console.log("requesting frame number:", frameTimestamp);
      setisFileCheckLoading(true);
      //find way to initiate file again.
      videoUility.current = new VideoUtility({
        videoSrc: urlValue,
        srcType: "url",
        onReadyCB: (config) => {
          console.log(config);
          setIsReady(true);
          setisFileCheckLoading(false);
          decoder.current.configure(config);
        },
        onEncodedChunk: (data) => {
          for (let i = 0; i < data.length; i++) {
            if (data[i].number === resquestedFrame) {
              frameTimestamp = data[i].videoChunk.timestamp;
            }
            if (data[i].videoChunk) {
              decoder.current.decode(data[i].videoChunk);
            }
          }
        },
      });
    }
  }

  function handleDecodedFrame(frame) {
    if (frame.timestamp === frameTimestamp) {
      //render the frame.
    }
    //FIX-ME: Draw single requested frame instead of all frame in buffer.
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
                color={!urlError ? "tomato" : ""}
                onChange={(event) => setUrlValue(event.target.value)}
              />
              <Button
                variant="unstyled"
                onClick={() => handleLinkVerification()}
              >
                Verify
              </Button>
              <span>-</span>
              <Button
                onClick={() => handleFileStart()}
                isLoading={isFileCheckLoading}
                isActive={!isVerifed}
                disabled={!isVerifed}
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
                <Fade in={isReady}>
                  <div
                    style={{
                      marginTop: "50px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <NumberInput
                      defaultValue={10}
                      min={1}
                      max={5000}
                      value={resquestedFrame}
                      onChange={(event, value) => setResquestedFrame(value)}
                      style={{ margin: "0px 10px" }}
                    >
                      <NumberInputField></NumberInputField>
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>

                    <Button
                      onClick={() =>
                        videoUility.current.requestFrameByNumber(
                          resquestedFrame
                        )
                      }
                    >
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
                        <span>Video Resolution: </span>
                        <span>
                          {/* {fileConfig.codedHeight} x {fileConfig.codedWidth} */}
                        </span>
                      </div>
                    </div>
                  </div>
                </Fade>
              </>
            ) : (
              <>
                <span>Click on Start button after adding mp4 file url 🚀</span>
              </>
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
