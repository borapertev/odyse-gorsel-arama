import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import ImageAnalyzer from './components/ImageAnalyzer';
import './App.css';

function App() {
    const [selectedImages, setSelectedImages] = useState([]);

    const handleImagesSelected = (images) => {
        setSelectedImages(prevImages => [...prevImages, ...images]);
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>iamholyik Görsel Arama Aracı</h1>
                <p>Fotoğrafları yükleyerek internet üzerindeki benzer görselleri bulun</p>
            </header>
            
            <main>
                <ImageUploader onImagesSelected={handleImagesSelected} />
                <ImageAnalyzer 
                    images={selectedImages}
                    onRemoveImage={(index) => {
                        setSelectedImages(prevImages => 
                            prevImages.filter((_, i) => i !== index)
                        );
                    }} 
                />
            </main>
        </div>
    );
}

export default App;
