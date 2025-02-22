import React, { useState, useCallback } from 'react';
import './App.css';

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer?.files || e.target.files)
      .filter(file => file.type.startsWith('image/'));
    
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }))]);
      setError(null);
    }
  }, []);

  const handleSearch = async () => {
    if (selectedFiles.length === 0) {
      setError('Lütfen en az bir görsel seçin');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const searchResults = await Promise.all(selectedFiles.map(async ({ file }) => {
        const formData = new FormData();
        formData.append('image', file);

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/search-image`, {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        console.log("API Yanıtı:", data);
        
        if (!response.ok) {
          throw new Error(data.error || 'API isteği başarısız oldu');
        }

        return data;
      }));

      console.log("İşlenmiş sonuçlar:", searchResults);
      setResults(searchResults);
    } catch (error) {
      console.error("Hata:", error);
      setError('Görsel analizi sırasında bir hata oluştu: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPlatformIcon = (url) => {
    try {
        const domain = new URL(url).hostname.toLowerCase();
        if (domain.includes('twitter.com') || domain.includes('x.com')) return '𝕏';
        if (domain.includes('instagram.com')) return '📸';
        if (domain.includes('facebook.com')) return 'fb';
        if (domain.includes('reddit.com')) return '🔴';
        if (domain.includes('imgur.com')) return '🖼️';
        return '🌐';
    } catch {
        return '🌐';
    }
  };

  const uploadToImgBB = async (imageFile, engine) => {
    const apiKey = 'e3f3a384e9c3f7fbfeae9e3d89b3efae';
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        const imageUrl = data.data.url;
        if (engine === 'google') {
          // Google Lens için URL
          window.open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imageUrl)}`, '_blank');
        } else if (engine === 'yandex') {
          window.open(`https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`, '_blank');
        }
      } else {
        console.error('Upload error:', data);
        alert('Resim yükleme başarısız oldu. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Resim yükleme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleEngineSearch = (file, engine) => {
    uploadToImgBB(file, engine);
  };

  return (
    <div className="mobile-app">
      <header className="app-header">
        <h1>Odyse Görsel Arama</h1>
      </header>

      <main className="app-content">
        <div 
          className={`upload-card ${isDragging ? 'dragging' : ''}`}
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={onDrop}
            className="file-input"
            id="image-upload"
            multiple
          />
          <label htmlFor="image-upload" className="upload-area">
            <div className="upload-icon">📸</div>
            <div className="upload-text">Fotoğraf Seç veya Sürükle</div>
          </label>
        </div>

        {selectedFiles.length > 0 && (
          <div className="selected-images">
            <div className="image-grid">
              {selectedFiles.map((file, index) => (
                <div key={index} className="image-card">
                  <img src={file.preview} alt={`Preview ${index + 1}`} />
                  <button 
                    onClick={() => {
                      URL.revokeObjectURL(file.preview);
                      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                      setResults(prev => prev.filter((_, i) => i !== index));
                    }} 
                    className="remove-button"
                  >
                    ×
                  </button>
                  {results[index]?.yuksekEslesme?.length > 0 && (
                    <div className="match-badge">
                      {results[index].yuksekEslesme.length} eşleşme
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={handleSearch}
              disabled={isAnalyzing}
              className="search-button"
            >
              {isAnalyzing ? 'Aranıyor...' : 'Aramayı Başlat'}
            </button>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {results.length > 0 && (
          <div className="results-container">
            {results.map((result, fileIndex) => (
              <div key={fileIndex} className="result-card">
                <div className="result-header">
                  <img 
                    src={selectedFiles[fileIndex].preview} 
                    alt={`Source ${fileIndex + 1}`}
                  />
                  <div className="result-info">
                    <h3>Eşleşmeler ({result.yuksekEslesme?.length || 0})</h3>
                    <div className="search-actions">
                      <button 
                        onClick={() => handleEngineSearch(selectedFiles[fileIndex].file, 'google')}
                        className="action-button google"
                      >
                        Google Lens
                      </button>
                      <button 
                        onClick={() => handleEngineSearch(selectedFiles[fileIndex].file, 'yandex')}
                        className="action-button yandex"
                      >
                        Yandex
                      </button>
                    </div>
                  </div>
                </div>

                <div className="matches-list">
                  {result.yuksekEslesme?.map((match, matchIndex) => (
                    <a 
                      key={matchIndex}
                      href={match.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="match-item"
                    >
                      <div className="platform-icon">
                        {getPlatformIcon(match.url)}
                      </div>
                      <div className="match-details">
                        <div className="match-url">{new URL(match.url).hostname}</div>
                        <div className="match-similarity">{match.similarity}</div>
                      </div>
                      <div className="match-arrow">›</div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
