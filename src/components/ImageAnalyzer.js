import React, { useState } from 'react';
import { analyzeImage } from '../services/googleVision';
import './ImageAnalyzer.css';

const ImageAnalyzer = ({ images, onRemoveImage }) => {
    const [analysisResults, setAnalysisResults] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);

    const analyzeImages = async () => {
        setIsAnalyzing(true);
        setError(null);
        
        try {
            const results = await Promise.all(images.map(async (image) => {
                try {
                    const base64Image = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64String = reader.result.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
                            resolve(base64String);
                        };
                        reader.readAsDataURL(image);
                    });

                    const visionResults = await analyzeImage(base64Image);
                    console.log('Vision Results:', visionResults);

                    // partialMatchingImages skorlarını kontrol edelim
                    if (visionResults.partialMatchingImages) {
                        console.log('Partial Matches Scores:', visionResults.partialMatchingImages.map(match => ({
                            url: match.url,
                            score: match.score || 0.7
                        })));
                    }

                    // URL'leri düzenleyen yardımcı fonksiyon
                    const getPageUrl = (imageUrl) => {
                        if (imageUrl.includes('pbs.twimg.com')) {
                            // Twitter görselleri için mevcut mantık...
                            if (imageUrl.includes('profile_images')) {
                                const matches = imageUrl.match(/profile_images\/(\d+)\//);
                                if (matches && matches[1]) {
                                    return `https://twitter.com/i/user/${matches[1]}`;
                                }
                            } else {
                                const matches = imageUrl.match(/\/([^/]+)\.(jpg|png|jpeg)/i);
                                if (matches && matches[1]) {
                                    const imageId = matches[1].split('_')[0];
                                    return `https://twitter.com/search?q=${imageId}&f=image`;
                                }
                            }
                        } else if (imageUrl.includes('linktr.ee')) {
                            // Linktr.ee görselleri için ana URL'i çıkar
                            const matches = imageUrl.match(/\/([a-f0-9-]+)_/i);
                            if (matches && matches[1]) {
                                return `https://linktr.ee/${matches[1]}`;
                            }
                        }
                        return imageUrl;
                    };

                    // Filtrelenecek URL'leri kontrol eden fonksiyon
                    const shouldShowResult = (url) => {
                        // iamlooly hesabına ait sonuçları filtrele
                        if (url.includes('twitter.com/iamlooly') || 
                            url.includes('x.com/iamlooly') ||
                            url.includes('t.co/iamlooly')) {
                            return false;
                        }
                        return true;
                    };

                    return {
                        imageName: image.name,
                        error: false,
                        matches: {
                            fullMatches: visionResults.fullMatchingImages?.map(match => ({
                                url: match.url,
                                pageUrl: getPageUrl(match.url),
                                score: 1.0
                            })).filter(match => shouldShowResult(match.pageUrl)) || [],
                            partialMatches: [
                                // pagesWithMatchingImages için güvenli erişim
                                ...(visionResults.pagesWithMatchingImages?.flatMap(page => {
                                    if (page.fullMatchingImages?.[0]?.url) {
                                        return [{
                                            url: page.fullMatchingImages[0].url,
                                            pageUrl: page.url,
                                            pageTitle: page.pageTitle,
                                            score: 0.8
                                        }];
                                    }
                                    return [];
                                }) || []),
                                // partialMatchingImages için güvenli erişim
                                ...(visionResults.partialMatchingImages?.map(match => ({
                                    url: match.url,
                                    pageUrl: getPageUrl(match.url),
                                    pageTitle: match.url.split('/').pop(),
                                    score: match.score || 0.7
                                })) || [])
                            ].filter(match => 
                                match.url && 
                                match.score >= 0.7 && 
                                shouldShowResult(match.pageUrl)
                            )
                        }
                    };
                } catch (error) {
                    console.error('Image analysis error:', error);
                    return {
                        imageName: image.name,
                        error: true,
                        errorMessage: error.message
                    };
                }
            }));

            setAnalysisResults(results);
        } catch (error) {
            console.error('Analiz hatası:', error);
            setError('Analiz sırasında bir hata oluştu');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Fotoğraf silindiğinde ilgili analiz sonucunu da sil
    const handleRemoveImage = (index) => {
        // Önce fotoğrafı sil
        onRemoveImage(index);
        // Sonra analiz sonucunu sil
        setAnalysisResults(prevResults => 
            prevResults.filter((_, i) => i !== index)
        );
    };

    return (
        <div className="analyzer-container">
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}
            
            {images.length > 0 && (
                <div className="selected-images">
                    <h3>Seçilen Fotoğraflar ({images.length})</h3>
                    <div className="image-preview-grid">
                        {images.map((image, index) => (
                            <div key={index} className="image-preview">
                                <img
                                    src={URL.createObjectURL(image)}
                                    alt={`Preview ${index + 1}`}
                                />
                                <button 
                                    className="remove-image"
                                    onClick={() => handleRemoveImage(index)}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        className="analyze-button"
                        onClick={analyzeImages}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? 'Analiz Ediliyor...' : 'Analizi Başlat'}
                    </button>
                </div>
            )}

            {analysisResults.length > 0 && (
                <div className="analysis-results">
                    <h3>Analiz Sonuçları</h3>
                    {analysisResults.map((result, index) => (
                        <div key={index} className="result-item">
                            <h4>{result.imageName}</h4>
                            {result.error ? (
                                <div className="error-message">
                                    {result.errorMessage}
                                </div>
                            ) : (
                                <>
                                    {result.matches.fullMatches.length > 0 && (
                                        <div className="match-section">
                                            <h5>Tam Eşleşmeler</h5>
                                            <div className="matches-grid">
                                                {result.matches.fullMatches.map((match, i) => (
                                                    <a 
                                                        key={i}
                                                        href={match.pageUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="match-item"
                                                    >
                                                        <img src={match.url} alt="Eşleşen görsel" />
                                                        <span className="match-score">
                                                            {Math.round(match.score * 100)}% benzerlik
                                                        </span>
                                                        {match.pageTitle && (
                                                            <span className="page-title">
                                                                {match.pageTitle}
                                                            </span>
                                                        )}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {result.matches.partialMatches.length > 0 && (
                                        <div className="match-section">
                                            <h5>Kısmi Eşleşmeler</h5>
                                            <div className="matches-grid">
                                                {result.matches.partialMatches.map((match, i) => (
                                                    <a 
                                                        key={i}
                                                        href={match.pageUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="match-item"
                                                    >
                                                        <img src={match.url} alt="Benzer görsel" />
                                                        <span className="match-score">
                                                            {Math.round(match.score * 100)}% benzerlik
                                                        </span>
                                                        <span className="page-title">
                                                            {match.pageTitle}
                                                        </span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ImageAnalyzer; 