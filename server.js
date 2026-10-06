const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/extract', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const output = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
    });

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
    console.error(error);
    res.status(500).json({ error: 'Failed to extract video' });
  }
});

app.get('/warmup', (req, res) => {
  res.status(200).send('warm');
});

app.get('/', (req, res) => res.send('BrineTube Extractor is running'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Extractor running on port ${PORT}`));
