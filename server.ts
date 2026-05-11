import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'Node.js Express backend' });
  });

  // Example API route for checking backend
  app.get('/api/status', (req, res) => {
    res.json({ 
      online: true, 
      message: 'Node.js backend is handling requests successfully.' 
    });
  });

  const isProd = process.env.NODE_ENV === 'production';

  // Vite middleware for development
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
