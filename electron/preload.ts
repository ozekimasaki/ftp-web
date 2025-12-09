import { contextBridge, ipcRenderer } from 'electron';

// Electronの機能を安全にレンダラープロセスに公開
contextBridge.exposeInMainWorld('electronAPI', {
  // アプリ情報
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // プラットフォーム情報
  platform: process.platform,
  
  // 開発モードかどうか
  isDev: process.env.NODE_ENV === 'development',
});

// TypeScript用の型定義
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      platform: NodeJS.Platform;
      isDev: boolean;
    };
  }
}

