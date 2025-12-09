import express from 'express';
import cors from 'cors';
import path from 'path';
import ftpRouter from './routes/ftp';
import type { Server } from 'http';

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json());

// Electron本番環境: フロントエンドの静的ファイルを配信
if (process.env.ELECTRON_RUN_AS_NODE || process.env.SERVE_STATIC) {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  
  // SPA用: すべてのルートをindex.htmlにフォールバック
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// ルート
app.use('/api/ftp', ftpRouter);

// ヘルスチェック
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// サーバーインスタンスを保持
let server: Server | null = null;

// サーバー起動関数（Electronから呼び出し可能）
export function startServer(port: number = Number(PORT)): Promise<Server> {
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(port, () => {
        console.log(`🚀 FTP WebUI Backend running on http://localhost:${port}`);
        resolve(server!);
      });
      server.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

// サーバー停止関数
export function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('Backend server stopped');
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// スタンドアロン実行時（直接実行された場合）
// require.mainがモジュール自身の場合、またはコマンドラインから直接実行された場合
if (require.main === module) {
  startServer();
}

