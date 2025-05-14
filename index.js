require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// const bcrypt = require('bcryptjs');
const Creds = require('./models/credsModel');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Config
const ALLOWED_API_KEYS = [
  'xylo',
  'xylo-ai',
  'bingota@19'
];

const ADMIN_CREDENTIALS = {
  username: 'davidx',
  password: 'davidx001',
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'admin')));

// API Key Auth
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (ALLOWED_API_KEYS.includes(apiKey)) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized - Invalid API Key' });
  }
};

// Admin Auth 
const adminAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    next(); // Allow access
  } else {
    res.status(401).json({ error: 'Unauthorized - Invalid credentials' });
  }
};

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.post('/api/logout', (req, res) => {
  // I'm not using this for now since there isn't any user auths
  res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/api/uploadCreds.php', apiKeyAuth, async (req, res) => {
  try {
    const { credsId, credsData } = req.body;
    if (!credsId || !credsData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!credsId.startsWith('XBOT-MD~')) {
      return res.status(400).json({ 
        error: 'Invalid session ID Format - Must Start with "XBOT-MD~"' 
      });
    }

    let parsedData;
    try {
      if (typeof credsData === 'string') {
        parsedData = JSON.parse(credsData);
      } else if (typeof credsData === 'object') {
        parsedData = credsData;
      } else {
        throw new Error('Invalid Data Format');
      }
    } catch (err) {
      return res.status(400).json({ 
        error: 'Invalid credsData - must be valid JSON' 
      });
    }

    const newCreds = new Creds({
      credsId,
      credsData: parsedData
    });

    await newCreds.save();
    res.status(201).json({ 
      sessionId: credsId,
      message: 'Credentials Uploaded Successfully',
      length: JSON.stringify(parsedData).length
    });
  } catch (error) {
    console.error('Error storing credentials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/downloadCreds.php/:credsId', apiKeyAuth, async (req, res) => {
  try {
    const { credsId } = req.params;
    
    if (!credsId.startsWith('XBOT-MD~')) {
      return res.status(400).json({ 
        error: 'Invalid Session ID Format - Must Start with "XBOT-MD~"' 
      });
    }

    const creds = await Creds.findOne({ credsId });

    if (!creds) {
      return res.status(404).json({ error: 'Credentials not Found' });
    }

    res.json({ credsData: creds.credsData });
  } catch (error) {
    console.error('Error retrieving credentials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/admin/login.php', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/admin/creds.php', adminAuth, async (req, res) => {
  try {
    const creds = await Creds.find().sort({ createdAt: -1 });
    res.json(creds);
  } catch (error) {
    console.error('Error fetching all credentials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/admin/creds.php/search.php', adminAuth, async (req, res) => {
  try {
    const { q } = req.query;
    const creds = await Creds.find({ 
      $or: [
        { credsId: { $regex: q, $options: 'i' } },
        { 'credsData.me.id': { $regex: q, $options: 'i' } },
        { 'credsData.me.name': { $regex: q, $options: 'i' } }
      ]
    });
    res.json(creds);
  } catch (error) {
    console.error('Error searching credentials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/admin/creds.php/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { credsData } = req.body;
    
    const updatedCreds = await Creds.findByIdAndUpdate(
      id,
      { credsData },
      { new: true }
    );
    
    if (!updatedCreds) {
      return res.status(404).json({ error: 'Credentials not found' });
    }
    
    res.json(updatedCreds);
  } catch (error) {
    console.error('Error updating credentials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/admin/creds.php/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCreds = await Creds.findByIdAndDelete(id);
    
    if (!deletedCreds) {
      return res.status(404).json({ error: 'Credentials not found' });
    }
    
    res.json({ message: 'Credentials deleted successfully' });
  } catch (error) {
    console.error('Error deleting credentials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
