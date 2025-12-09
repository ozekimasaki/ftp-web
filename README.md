# FTP WebUI

Linux ARM64 環境で動作する、WebベースのFTP/FTPS/SFTPクライアントです。

## 機能

- **マルチプロトコル対応**: FTP、FTPS（SSL/TLS）、SFTP（SSH）
- **ファイルブラウザ**: ディレクトリ一覧、パンくずナビゲーション
- **ファイル操作**: アップロード、ダウンロード、削除、リネーム、フォルダ作成
- **ドラッグ＆ドロップ**: ファイルのアップロードに対応
- **接続プロファイル保存**: 接続情報をブラウザに保存

## 技術スタック

### バックエンド
- Node.js + Express + TypeScript
- `basic-ftp` - FTP/FTPS 接続
- `ssh2-sftp-client` - SFTP 接続

### フロントエンド
- React + TypeScript
- Vite
- Tailwind CSS

## セットアップ

### 必要要件

- Node.js 18 以上
- npm または yarn

### インストール

```bash
# バックエンド
cd backend
npm install

# フロントエンド
cd ../frontend
npm install
```

### 開発サーバー起動

```bash
# バックエンド（ポート 3001）
cd backend
npm run dev

# フロントエンド（ポート 5173）
cd frontend
npm run dev
```

ブラウザで http://localhost:5173 にアクセスしてください。

### 本番ビルド

```bash
# バックエンド
cd backend
npm run build

# フロントエンド
cd frontend
npm run build
```

## 使い方

1. ブラウザで http://localhost:5173 にアクセス
2. 接続情報を入力（プロトコル、ホスト、ポート、ユーザー名、パスワード）
3. 「接続」ボタンをクリック
4. ファイルブラウザでファイル操作を行う

### ファイル操作

- **ダブルクリック**: フォルダを開く
- **ドラッグ＆ドロップ**: ファイルをアップロード
- **右側のアイコン**: ダウンロード、リネーム、削除

## ライセンス

MIT

