import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { fork, ChildProcess } from 'child_process';

// 開発環境かどうかを判定
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const BACKEND_PORT = 3001;
const FRONTEND_DEV_PORT = 5173;

function getBackendPath(): string {
  if (isDev) {
    return path.join(__dirname, '..', 'backend', 'dist', 'index.js');
  }
  // パッケージ化されたアプリでは、resourcesPath配下にファイルがある
  return path.join(process.resourcesPath, 'backend', 'dist', 'index.js');
}

function getFrontendPath(): string {
  if (isDev) {
    return path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  }
  return path.join(process.resourcesPath, 'frontend', 'dist', 'index.html');
}

async function startBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const backendEntry = getBackendPath();
    console.log(`Starting backend from: ${backendEntry}`);

    // Node.js子プロセスとしてバックエンドを起動
    backendProcess = fork(backendEntry, [], {
      env: { 
        ...process.env, 
        PORT: String(BACKEND_PORT),
        SERVE_STATIC: isDev ? '' : 'true',
      },
      stdio: 'pipe',
    });

    backendProcess.stdout?.on('data', (data) => {
      const message = data.toString().trim();
      console.log(`[Backend] ${message}`);
      if (message.includes('running on')) {
        resolve();
      }
    });

    backendProcess.stderr?.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
      reject(err);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      backendProcess = null;
    });

    // タイムアウト後に解決（サーバーが起動済みでもメッセージが来ない場合）
    setTimeout(() => resolve(), 3000);
  });
}

function stopBackend(): void {
  if (backendProcess) {
    console.log('Stopping backend...');
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'FTP WebUI',
    show: false,
  });

  // 外部リンクをデフォルトブラウザで開く
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // ウィンドウの準備ができたら表示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    // 開発時はVite開発サーバーを参照
    await mainWindow.loadURL(`http://localhost:${FRONTEND_DEV_PORT}`);
    mainWindow.webContents.openDevTools();
  } else {
    // 本番時はバックエンドサーバー経由でフロントエンドを読み込む
    await mainWindow.loadURL(`http://localhost:${BACKEND_PORT}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// アプリケーション初期化
app.whenReady().then(async () => {
  try {
    // 本番環境ではバックエンドを起動
    if (!isDev) {
      await startBackend();
    }
    await createWindow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    app.quit();
  }
});

// すべてのウィンドウが閉じられたとき
app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS: ドックアイコンクリック時
app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

// アプリ終了前のクリーンアップ
app.on('before-quit', () => {
  stopBackend();
});

