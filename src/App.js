import './App.css';

function App() {





  function handleFileUpload(event){
    //check if the file uploaded is a valid h.264 codec video
    const file = event.files[0];
    if(file){



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
