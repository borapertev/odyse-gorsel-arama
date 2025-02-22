const API_KEY = 'AIzaSyCQw-75MzuMJJ9-H4QtxK3M8vpy4hfh3n8';
const API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

export const analyzeImage = async (base64Image) => {
    try {
        const response = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [
                    {
                        image: {
                            content: base64Image
                        },
                        features: [
                            {
                                type: 'WEB_DETECTION',
                                maxResults: 50
                            }
                        ]
                    }
                ]
            })
        });

        const data = await response.json();
        console.log('Vision API Response:', data);
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'API request failed');
        }

        if (!data.responses || !data.responses[0]) {
            throw new Error('Invalid API response format');
        }

        const webDetection = data.responses[0].webDetection || {};
        console.log('Web Detection Results:', webDetection);
        return webDetection;
    } catch (error) {
        console.error('Google Vision API Error:', error);
        throw error;
    }
}; 