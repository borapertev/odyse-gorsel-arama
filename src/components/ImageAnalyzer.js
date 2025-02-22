import React, { useState } from 'react';
import './ImageAnalyzer.css';

const API_URL = 'http://localhost:5000/api/search-image';

const ImageAnalyzer = () => {
    const [images, setImages] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState(null);

    const handleImageUpload = (event) => {
        const files = Array.from(event.target.files);
        const validFiles = files.filter(file => file.type.startsWith('image/'));
        setImages(prev => [...prev, ...validFiles]);
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setResults(prev => prev.filter((_, i) => i !== index));
    };

    const analyzeImages = async () => {
        setIsAnalyzing(true);
        setError(null);

        try {
            const results = await Promise.all(images.map(async (image) => {
                const formData = new FormData();
                formData.append('image', image);

                const response = await fetch(API_URL, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('API isteği başarısız oldu');
                
                const data = await response.json();
                return {
                    fileName: image.name,
                    matches: data.yuksekEslesme || [] // Sadece yüksek eşleşmeleri al
                };
            }));

            setResults(results);
        } catch (error) {
            setError('Görsel analizi sırasında bir hata oluştu: ' + error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="analyzer-container">
            <div className="upload-section">
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="file-input"
                    id="image-upload"
                />
                <label htmlFor="image-upload" className="upload-button">
                    Görsel Seç
                </label>
                <button
                    onClick={analyzeImages}
                    disabled={images.length === 0 || isAnalyzing}
                    className="analyze-button"
                >
                    {isAnalyzing ? 'Aranıyor...' : 'Ara'}
                </button>
            </div>

            {images.length > 0 && (
                <div className="selected-images">
                    <h3>Seçilen Görseller ({images.length})</h3>
                    <div className="image-preview-grid">
                        {images.map((image, index) => (
                            <div key={index} className="image-preview">
                                <img
                                    src={URL.createObjectURL(image)}
                                    alt={`Preview ${index + 1}`}
                                />
                                <button
                                    onClick={() => removeImage(index)}
                                    className="remove-image"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {results.length > 0 && (
                <div className="analysis-results">
                    {results.map((result, index) => (
                        <div key={index} className="result-item">
                            <h3>{result.fileName}</h3>
                            {result.matches.length > 0 ? (
                                <div className="matches-grid">
                                    {result.matches.map((match, matchIndex) => (
                                        <div key={matchIndex} className="match-item">
                                            <div className="match-image">
                                                <img src={match.imageUrl || match.url} alt="Match" />
                                            </div>
                                            <div className="match-info">
                                                <a href={match.url} target="_blank" rel="noopener noreferrer">
                                                    Kaynağa Git
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>Eşleşme bulunamadı.</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageAnalyzer; 