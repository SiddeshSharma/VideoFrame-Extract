import './App.css';
import { setUpFile } from './VideoUtility';

function App() {

  function handleFileUpload(event){
    //check if the file uploaded is a valid h.264 codec video
    const file = event.target.files[0];
    if(file){
      setUpFile({videoSrc: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', srcType: 'url', onReadyCB: (handler) => {
        console.log(handler);
      }})


    }

  }



  return (
    <div className="App">
      Extract Frame from an Video.

      Upload 

      <input type="file" accept='video/mp4' onChange={handleFileUpload}/>

      url 

      <input type="url"/>
    </div>
  );
}

export default App;
