from flask import Flask, request, jsonify, render_template_string
import requests
import base64
import os
from flask_cors import CORS
from dotenv import load_dotenv
import re
from google.cloud import vision

# .env dosyasını yükle
load_dotenv()

app = Flask(__name__)
# Production için Vercel URL'ini ekleyin
CORS(app, resources={r"/*": {"origins": [
    "http://localhost:3000",
    "https://your-app-name.vercel.app"  # Vercel'de yayınladıktan sonra buraya kendi URL'inizi ekleyin
]}})

# HTML template
HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Görsel Arama</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .upload-form {
            text-align: center;
            margin: 20px 0;
        }
        .results {
            margin-top: 20px;
        }
        .result-group {
            margin-bottom: 20px;
        }
        .result-group h2 {
            color: #666;
            font-size: 1.2em;
        }
        .result-item {
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .result-item a {
            color: #0066cc;
            text-decoration: none;
        }
        .result-item a:hover {
            text-decoration: underline;
        }
        #loading {
            display: none;
            text-align: center;
            margin: 20px 0;
        }
        .button {
            background-color: #0066cc;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .button:hover {
            background-color: #0052a3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Görsel Arama</h1>
        <div class="upload-form">
            <form id="uploadForm" enctype="multipart/form-data">
                <input type="file" id="imageInput" accept="image/*" required>
                <button type="submit" class="button">Ara</button>
            </form>
        </div>
        <div id="loading">Aranıyor...</div>
        <div id="results" class="results"></div>
    </div>

    <script>
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fileInput = document.getElementById('imageInput');
            const loading = document.getElementById('loading');
            const results = document.getElementById('results');
            
            if (!fileInput.files[0]) {
                alert('Lütfen bir görsel seçin');
                return;
            }
            
            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            
            loading.style.display = 'block';
            results.innerHTML = '';
            
            try {
                const response = await fetch('/api/search-image', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    let resultsHtml = '';
                    
                    if (data.yuksekEslesme && data.yuksekEslesme.length > 0) {
                        resultsHtml += `
                            <div class="result-group">
                                <h2>Yüksek Eşleşmeler</h2>
                                ${data.yuksekEslesme.map(match => `
                                    <div class="result-item">
                                        <a href="${match.url}" target="_blank">${match.url}</a>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }
                    
                    if (data.ortaEslesme && data.ortaEslesme.length > 0) {
                        resultsHtml += `
                            <div class="result-group">
                                <h2>Orta Eşleşmeler</h2>
                                ${data.ortaEslesme.map(match => `
                                    <div class="result-item">
                                        <a href="${match.url}" target="_blank">${match.url}</a>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    }
                    
                    if (!resultsHtml) {
                        resultsHtml = '<p>Eşleşme bulunamadı.</p>';
                    }
                    
                    results.innerHTML = resultsHtml;
                } else {
                    results.innerHTML = `<p>Hata: ${data.error || 'Bilinmeyen bir hata oluştu'}</p>`;
                }
            } catch (error) {
                results.innerHTML = '<p>Bir hata oluştu. Lütfen tekrar deneyin.</p>';
                console.error('Error:', error);
            } finally {
                loading.style.display = 'none';
            }
        });
    </script>
</body>
</html>
"""

# API anahtarını .env'den al
api_key = os.getenv('REACT_APP_VISION_API_KEY')

@app.route('/')
def index():
    """Ana sayfa"""
    return render_template_string(HTML_TEMPLATE)

def process_twitter_url(url):
    try:
        # Media ID'yi bul
        media_match = re.search(r'media/([A-Za-z0-9_-]+)\.(jpg|png|jpeg)', url)
        if media_match:
            media_id = media_match.group(1)
            # Önce medya sayfasına yönlendir
            return f"https://x.com/iamodys3e/media"
        
        # Tweet ID'yi bul
        tweet_match = re.search(r'status/(\d+)', url)
        if tweet_match:
            tweet_id = tweet_match.group(1)
            return f"https://x.com/iamodys3e/status/{tweet_id}"
        
        return url
    except Exception as e:
        print(f"Twitter URL işleme hatası: {e}")
        return url

def calculate_similarity_score(match_type, web_detection_score=None):
    base_scores = {
        'pages': 1.0,      # Tam sayfa eşleşmeleri
        'full': 0.95,      # Tam görsel eşleşmeleri
        'partial': 0.8,    # Kısmi eşleşmeler
        'similar': 0.6     # Benzer görseller
    }
    
    if web_detection_score:
        # Google Vision API'nin döndürdüğü skoru da hesaba kat
        return min(1.0, base_scores[match_type] * web_detection_score)
    return base_scores[match_type]

@app.route('/api/search-image', methods=['POST'])
def search_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'Görsel dosyası bulunamadı'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'Dosya seçilmedi'}), 400

        # Görseli base64'e çevir
        image_content = file.read()
        encoded_image = base64.b64encode(image_content).decode('utf-8')

        # Vision API isteği için JSON hazırla
        post_data = {
            "requests": [
                {
                    "image": {
                        "content": encoded_image
                    },
                    "features": [
                        {
                            "type": "WEB_DETECTION",
                            "maxResults": 100
                        }
                    ]
                }
            ]
        }

        # Vision API'ye istek gönder
        vision_url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
        headers = {'Content-Type': 'application/json'}
        
        response = requests.post(vision_url, headers=headers, json=post_data)
        result = response.json()

        if 'error' in result:
            return jsonify({'error': result['error'].get('message', 'API hatası')}), 400

        web_detection = result['responses'][0].get('webDetection', {})
        all_matches = []

        # Web sayfalarından eşleşmeleri al
        if 'pagesWithMatchingImages' in web_detection:
            for page in web_detection['pagesWithMatchingImages']:
                url = page.get('url', '')
                if url and not url.startswith('data:'):
                    score = calculate_similarity_score('pages', page.get('score', 1.0))
                    if score >= 0.6:  # Sadece %60 ve üzeri eşleşmeleri al
                        all_matches.append({
                            'url': url,
                            'score': score,
                            'similarity': f"%{int(score * 100)}"
                        })

        # Tam eşleşmeleri al
        if 'fullMatchingImages' in web_detection:
            for match in web_detection['fullMatchingImages']:
                url = match.get('url', '')
                if url and not url.startswith('data:'):
                    score = calculate_similarity_score('full', match.get('score', 0.95))
                    if score >= 0.6:  # Sadece %60 ve üzeri eşleşmeleri al
                        all_matches.append({
                            'url': url,
                            'score': score,
                            'similarity': f"%{int(score * 100)}"
                        })

        # URL'leri temizle ve benzersiz yap
        seen_urls = set()
        cleaned_matches = []
        
        for match in all_matches:
            url = match['url'].split('?')[0]  # URL parametrelerini kaldır
            base_url = url.split('#')[0]      # Fragment'i kaldır
            
            # Bazı özel durumları filtrele
            if any(skip in base_url.lower() for skip in [
                'data:', 'blob:', 'localhost', '127.0.0.1',
                'search?', 'search/'
            ]):
                continue
                
            if base_url not in seen_urls:
                seen_urls.add(base_url)
                cleaned_matches.append({
                    'url': base_url,
                    'score': match['score'],
                    'similarity': match['similarity']
                })

        # Skorlarına göre sırala
        sorted_matches = sorted(
            [m for m in cleaned_matches if float(m['score']) >= 0.6],
            key=lambda x: x['score'],
            reverse=True
        )

        return jsonify({
            'yuksekEslesme': sorted_matches[:20],  # En iyi 20 sonucu döndür
            'ortaEslesme': []
        })

    except Exception as e:
        print("Hata:", str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)