import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import chatHandler from './api/chat.js';
import visionHandler from './api/vision.js';
import ttsHandler from './api/tts.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Middleware to log requests
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Legacy Decryption Helper (Used for migrating old localStorage data)
  app.post('/api/decrypt', (req, res) => {
    const { data } = req.body;
    try {
      if (!data) return res.status(400).json({ error: 'No data' });
      const decoded = decodeURIComponent(escape(atob(data)));
      res.json({ decrypted: JSON.parse(decoded) });
    } catch (e) {
      res.status(400).json({ error: 'Decryption failed' });
    }
  });

  app.post('/api/chat', chatHandler);
  app.post('/api/vision', visionHandler);
  app.post('/api/tts', ttsHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
