require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const axios = require('axios');

const app = express();
const upload = multer({ dest: 'uploads/' });

const uploadsDir = path.join(__dirname, 'uploads');
const outputsDir = path.join(__dirname, 'outputs');

async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

(async () => {
  await ensureDir(uploadsDir);
  await ensureDir(outputsDir);
})();

app.use(cors());
app.use('/outputs', express.static(outputsDir));

app.post('/remove-bg', upload.single('image'), async (req, res) => {
  const inputPath = req.file.path;
  const { bgColor, backgroundDesign } = req.body;

  try {
    const formData = new URLSearchParams();
    formData.append('size', 'auto');
    formData.append('image_file_b64', (await fs.readFile(inputPath)).toString('base64'));

    if (bgColor) {
      formData.append('bg_color', bgColor);
    } else if (backgroundDesign) {
      formData.append('bg_image_url', backgroundDesign);
    }

    const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Api-Key': process.env.REMOVE_BG_API_KEY,
      },
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    if (response.status !== 200) {
      console.error('Error:', response.status, response.statusText);
      return res.status(response.status).send(response.statusText);
    }

    const outputPath = path.join(outputsDir, `${path.basename(inputPath)}_no_bg.png`);
    await fs.writeFile(outputPath, Buffer.from(response.data));

    res.sendFile(outputPath);
  } catch (error) {
    console.error('Request failed:', error.message);
    if (error.code === 'ECONNABORTED') {
      res.status(503).send('Service Unavailable. The request timed out.');
    } else if (!error.response) {
      res.status(503).send('Service Unavailable.');
    } else {
      res.status(error.response.status).send(error.response.data || 'Error removing background');
    }
  } finally {
    await fs.unlink(inputPath);
  }
});

app.post('/crop-image', upload.single('file'), async (req, res) => {
  const file = req.file;
  const { width, height, x, y } = req.body;

  if (!file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const image = sharp(file.path);
    const metadata = await image.metadata();

    const cropWidth = Math.min(parseInt(width) || 1, metadata.width);
    const cropHeight = Math.min(parseInt(height) || 1, metadata.height);
    const cropX = Math.min(Math.max(parseInt(x) || 0, 0), metadata.width - cropWidth);
    const cropY = Math.min(Math.max(parseInt(y) || 0, 0), metadata.height - cropHeight);

    const outputPath = path.join(outputsDir, `${file.filename}_cropped.png`);
    
    await image
      .extract({ width: cropWidth, height: cropHeight, left: cropX, top: cropY })
      .toFile(outputPath);

    res.sendFile(outputPath);
  } catch (error) {
    console.error('Error cropping image:', error);
    res.status(500).json({ message: `Error cropping image: ${error.message}` });
  } finally {
    try {
      await fs.unlink(file.path);
    } catch (unlinkError) {
      console.error('Error deleting file:', unlinkError);
    }
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});