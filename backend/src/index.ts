import express from 'express';
import cors from 'cors';
import ftpRouter from './routes/ftp.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json());

// ルート
app.use('/api/ftp', ftpRouter);

// ヘルスチェック
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 FTP WebUI Backend running on http://localhost:${PORT}`);
});

