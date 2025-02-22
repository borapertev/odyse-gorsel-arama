const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/search-image', async (req, res) => {
    try {
        const { image } = req.body;
        
        const response = await axios.get(
            'https://www.googleapis.com/customsearch/v1', 
            {
                params: {
                    key: process.env.GOOGLE_API_KEY,
                    cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
                    searchType: 'image',
                    q: image
                }
            }
        );

        const matches = response.data.items.map(item => ({
            url: item.link,
            thumbnail: item.image.thumbnailLink,
            title: item.title,
            similarity: '100%' // Google API benzerlik skoru vermiyor
        }));

        res.json({ matches });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            error: true, 
            message: 'Görsel arama sırasında bir hata oluştu' 
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 