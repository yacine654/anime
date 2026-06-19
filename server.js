const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const EMBED_API = 'https://www.2embed.cc/api/embedlinks';

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Proxy server is running' });
});

// Main proxy endpoint for anime search
app.get('/api/anime/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ 
        error: 'Missing query parameter "q"',
        example: '/api/anime/search?q=Naruto'
      });
    }

    console.log(`🔍 Searching for: ${q}`);

    // Call 2embed API from server (no CORS issues)
    const response = await fetch(
      `${EMBED_API}?q=${encodeURIComponent(q)}`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );

    if (!response.ok) {
      console.error(`❌ 2embed API error: ${response.status}`);
      return res.status(response.status).json({
        error: `2embed API returned ${response.status}`,
        details: response.statusText
      });
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({
        error: 'No anime found',
        query: q
      });
    }

    console.log(`✅ Found ${data.results.length} results for: ${q}`);

    res.json({
      success: true,
      query: q,
      count: data.results.length,
      results: data.results
    });

  } catch (error) {
    console.error('🔴 Proxy error:', error.message);
    res.status(500).json({
      error: 'Proxy server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint to get embed URL (for reference)
app.get('/api/anime/embed/:id/:ep', (req, res) => {
  const { id, ep } = req.params;
  const embedUrl = `https://www.2embed.cc/embedanime/${id}/${ep}`;
  
  res.json({
    success: true,
    id,
    episode: ep,
    embedUrl: embedUrl,
    htmlSnippet: `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen style="background:#000;"></iframe>`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🎌 Anime Proxy Server Running 🎌    ║
╠════════════════════════════════════════╣
║  Server:   http://localhost:${PORT}           ║
║  Health:   http://localhost:${PORT}/api/health    ║
║  Search:   http://localhost:${PORT}/api/anime/search?q=Naruto ║
╚════════════════════════════════════════╝
  `);
});
