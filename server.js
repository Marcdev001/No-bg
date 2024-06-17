const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

app.post('/remove-bg', upload.single('image'), async (req, res) => {
  const inputPath = req.file.path;
  const formData = new FormData();
  formData.append('size', 'auto');
  formData.append('image_file', fs.createReadStream(inputPath), path.basename(inputPath));
  
  if (req.body.bgColor) {
    formData.append('bg_color', req.body.bgColor);
  }

  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.remove.bg/v1.0/removebg',
      data: formData,
      responseType: 'arraybuffer',
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': process.env.REMOVE_BG_API_KEY,
      },
      encoding: null,
    });

    if (response.status !== 200) {
      console.error('Error:', response.status, response.statusText);
      return res.status(response.status).send(response.statusText);
    }

    const outputPath = path.join('uploads', 'no-bg.png');
    fs.writeFileSync(outputPath, response.data);

    res.sendFile(outputPath, { root: '.' });
  } catch (error) {
    console.error('Request failed:', error);
    if (error.response && error.response.status === 503) {
      res.status(503).send('Service Unavailable. Check your internet connection.');
    } else {
      res.status(500).send('Error removing background');
    }
  } finally {
    fs.unlinkSync(inputPath); // Cleanup uploaded file
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});














/* /* const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

app.use(cors());

app.post('/remove-bg', upload.single('image'), async (req, res) => {
  const inputPath = req.file.path;
  const formData = new FormData();
  formData.append('size', 'auto');
  formData.append('image_file', fs.createReadStream(inputPath), path.basename(inputPath));

  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.remove.bg/v1.0/removebg',
      data: formData,
      responseType: 'arraybuffer',
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': process.env.REMOVE_BG_API_KEY,
      },
      encoding: null,
    });

    if (response.status !== 200) {
      console.error('Error:', response.status, response.statusText);
      return res.status(response.status).send(response.statusText);
    }

    const outputPath = path.join('uploads', 'no-bg.png');
    fs.writeFileSync(outputPath, response.data);

    res.sendFile(outputPath, { root: '.' });
  } catch (error) {
    console.error('Request failed:', error);
    res.status(500).send('Error removing background');
  } finally {
    fs.unlinkSync(inputPath); 
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});  */