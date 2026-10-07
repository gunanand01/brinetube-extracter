const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/extract', async (req, res) => {
  const { url, cookies } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let cookiesPath = null;

  try {
    // Write cookies to a temp file if provided
    if (cookies && typeof cookies === 'string' && cookies.trim().length > 0) {
      cookiesPath = path.join('/tmp', `cookies-${Date.now()}.txt`);
      fs.writeFileSync(cookiesPath, cookies, 'utf8');
    }

    const options = {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    };

    if (cookiesPath) {
      options.cookies = cookiesPath;
    }

    const output = await youtubedl(url, options);

    const formats = output.formats
      .filter((f) => f.url && f.ext === 'mp4')
      .map((f) => ({
        quality: f.format_note || f.resolution || 'unknown',
        url: f.url,
        ext: f.ext,
        hasAudio: f.acodec !== 'none',
        hasVideo: f.vcodec !== 'none',
      }));

    res.json({
      title: output.title,
      thumbnails: output.thumbnails || [],
      formats: formats,
    });
  } catch (error) {
    console.error('Extraction error:', error.message);
    res.status(500).json({ error: 'Failed to extract video' });
  } finally {
    // Clean up cookies file
    if (cookiesPath && fs.existsSync(cookiesPath)) {
      try {
        fs.unlinkSync(cookiesPath);
      } catch (e) {
        console.error('Failed to delete cookies file:', e.message);
      }
    }
  }
});

app.get('/warmup', (req, res) => {
  res.status(200).send('warm');
});

app.get('/', (req, res) => res.send('BrineTube Extractor is running'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Extractor running on port ${PORT}`));
