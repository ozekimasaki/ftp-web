# FTP WebUI

Linux ARM64 環境で動作する、WebベースのFTP/FTPS/SFTPクライアントです。  
デスクトップアプリ（.deb）としてもインストール可能です。

## 機能

- **マルチプロトコル対応**: FTP、FTPS（SSL/TLS）、SFTP（SSH）
- **ファイルブラウザ**: ディレクトリ一覧、パンくずナビゲーション
- **ファイル操作**: アップロード、ダウンロード、削除、リネーム、フォルダ作成
- **ドラッグ＆ドロップ**: ファイルのアップロードに対応
- **接続プロファイル保存**: 接続情報をブラウザに保存
- **デスクトップアプリ**: Electronベースのネイティブアプリ

## インストール（デスクトップアプリ）

### .deb パッケージ（Debian/Ubuntu系）

[Releases](https://github.com/ozekimasaki/ftp_dev/releases) から最新の `.deb` ファイルをダウンロードしてインストール：

```bash
sudo dpkg -i ftp-webui_1.0.0_arm64.deb

# 依存関係エラーが出た場合
sudo apt install -f
```

### アンインストール

```bash
sudo dpkg -r ftp-webui
```

## 技術スタック

### バックエンド
- Node.js + Express + TypeScript
- `basic-ftp` - FTP/FTPS 接続
- `ssh2-sftp-client` - SFTP 接続

### フロントエンド
- React + TypeScript
- Vite
- Tailwind CSS

### デスクトップアプリ
- Electron
- electron-builder

## 開発者向け

### 必要要件

- Node.js 18 以上
- npm

### セットアップ

```bash
# 依存関係インストール（backend/frontend も自動でインストール）
npm install
```

### 開発サーバー起動

```bash
# バックエンド（ポート 3001）
npm run dev:backend

# フロントエンド（ポート 5173）
npm run dev:frontend
```

ブラウザで http://localhost:5173 にアクセスしてください。

### ビルド

```bash
# すべてビルド（backend + frontend + electron）
npm run build

# .deb パッケージ作成
npm run dist:deb
```

出力先: `release/ftp-webui_1.0.0_arm64.deb`

## 使い方

1. アプリを起動（デスクトップアプリ or ブラウザ）
2. 接続情報を入力（プロトコル、ホスト、ポート、ユーザー名、パスワード）
3. 「接続」ボタンをクリック
4. ファイルブラウザでファイル操作を行う

### ファイル操作

- **ダブルクリック**: フォルダを開く
- **ドラッグ＆ドロップ**: ファイルをアップロード
- **右側のアイコン**: ダウンロード、リネーム、削除

## ライセンス

MIT
