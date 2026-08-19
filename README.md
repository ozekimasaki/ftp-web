# FTP WebUI

Web ベースの FTP / FTPS / SFTP クライアントです。React 製のフロントエンドと Express 製のバックエンドで構成され、Electron でデスクトップアプリ（Linux ARM64 向け `.deb`）としてもパッケージ化できます。

## 主な機能

- **マルチプロトコル対応**: FTP、FTPS（SSL/TLS）、SFTP（SSH）
- **ファイルブラウザ**: ディレクトリ一覧、パンくずナビゲーション、ディレクトリ優先のソート
- **ファイル操作**: アップロード、ダウンロード、削除、リネーム、フォルダ作成
- **フォルダアップロード**: 相対パスを保持したままディレクトリ構造ごとアップロード
- **接続プロファイル保存**: 接続情報をブラウザの `localStorage` に保存。パスワードは Web Crypto API（AES-GCM）で暗号化し、鍵は IndexedDB に保持
- **FileZilla インポート**: FileZilla の `sitemanager.xml` を読み込んで接続プロファイルとして取り込み
- **デスクトップアプリ**: Electron ベースのネイティブアプリ（`.deb`）

## 技術スタック

### バックエンド (`backend/`)
- Node.js + Express + TypeScript
- `basic-ftp` — FTP / FTPS 接続
- `ssh2-sftp-client` — SFTP 接続
- `multer` — アップロードファイルの受け取り（メモリストレージ）
- `uuid` — セッション ID 生成

### フロントエンド (`frontend/`)
- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4（`@tailwindcss/vite`）

### デスクトップアプリ (`electron/`)
- Electron
- electron-builder（`scripts/build-deb.sh` で `.deb` を生成）

## 必要要件

- Node.js 20.19 以上（または 22.12 以上。Vite 7 の要件）
- npm
- `.deb` パッケージのビルドには Linux 環境と `dpkg-deb` が必要

## セットアップ

```bash
# ルートで実行すると postinstall により backend / frontend の依存も自動でインストールされます
npm install
```

## 使い方（開発）

開発サーバーは 3 つのプロセス（バックエンド・フロントエンド・Electron）で構成されます。

```bash
# すべて同時に起動（backend + frontend + electron）
npm run dev

# 個別に起動する場合
npm run dev:backend    # バックエンド（http://localhost:3001）
npm run dev:frontend   # フロントエンド（http://localhost:5173）
npm run dev:electron   # Vite が起動してから Electron を起動
```

ブラウザで利用する場合は http://localhost:5173 にアクセスしてください。フロントエンドの `/api` リクエストは Vite の proxy 経由でバックエンド（ポート 3001）へ転送されます。

### 接続とファイル操作

1. アプリを起動（デスクトップアプリ or ブラウザ）
2. 接続情報を入力（プロトコル、ホスト、ポート、ユーザー名、パスワード）
3. 「接続」ボタンをクリック
4. ファイルブラウザでファイルを操作
   - **ダブルクリック**: フォルダを開く
   - **ドラッグ＆ドロップ**: ファイル／フォルダをアップロード
   - **各行のアイコン**: ダウンロード、リネーム、削除

## 開発コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | backend / frontend / electron を同時起動 |
| `npm run dev:backend` | バックエンドを `tsx watch` で起動 |
| `npm run dev:frontend` | フロントエンドを Vite dev サーバーで起動 |
| `npm run dev:electron` | frontend の起動を待って Electron を起動 |
| `npm run build` | backend + frontend + electron をすべてビルド |
| `npm run build:backend` | バックエンドを `tsc` でビルド（型チェックを兼ねる） |
| `npm run build:frontend` | フロントエンドを `tsc -b && vite build` でビルド |
| `npm run build:electron` | Electron を `tsc -p tsconfig.electron.json` でビルド |
| `npm run pack` | ビルド後に `electron-builder --dir` でアンパック版を生成 |
| `npm run dist` | ビルド後に `electron-builder --linux deb` を実行 |
| `npm run dist:deb` | `npm run pack` の後に `scripts/build-deb.sh` で `.deb` を生成 |

フロントエンドの Lint は `frontend/` ディレクトリで実行します。

```bash
cd frontend && npm run lint   # ESLint
```

## ビルドと配布（デスクトップアプリ）

```bash
# すべてビルド（backend + frontend + electron）
npm run build

# .deb パッケージを作成
npm run dist:deb
```

出力先: `release/ftp-webui_<version>_arm64.deb`（`<version>` は `package.json` の `version`）

### インストール（Debian / Ubuntu 系）

```bash
sudo dpkg -i release/ftp-webui_<version>_arm64.deb

# 依存関係エラーが出た場合
sudo apt install -f
```

### アンインストール

```bash
sudo dpkg -r ftp-webui
```

## プロジェクト構成

```
.
├── backend/                 # Express + TypeScript バックエンド
│   └── src/
│       ├── index.ts         # サーバーのエントリポイント
│       ├── routes/ftp.ts    # /api/ftp のルート定義
│       ├── services/        # FtpService / SftpService（IFileService 実装）
│       ├── utils/           # session.manager, file.utils, async-handler
│       └── types/           # 共通型定義
├── frontend/                # React + Vite + Tailwind フロントエンド
│   └── src/
│       ├── App.tsx          # ルートコンポーネント
│       ├── components/      # ConnectionForm, FileBrowser, FileTable など
│       ├── hooks/           # useFtp, useConnection
│       ├── lib/             # api, crypto, filezilla, format
│       └── types/           # 共通型定義
├── electron/                # Electron メインプロセス / preload
│   ├── main.ts
│   └── preload.ts
├── scripts/build-deb.sh     # .deb パッケージ生成スクリプト
├── tsconfig.electron.json   # Electron 用 TypeScript 設定
└── package.json             # ルートのワークスペース定義とスクリプト
```

## アーキテクチャ概要

- バックエンドは `IFileService` インターフェースを介して FTP/FTPS（`FtpService`）と SFTP（`SftpService`）を抽象化しています。
- 接続ごとにサーバー側でセッションを保持し、`SessionManager` が `withLock` によって同一セッションの操作を直列化します。
- 本番（Electron）では、バックエンドが `frontend/dist` の静的ファイルを配信し、Electron はバックエンド（ポート 3001）を読み込みます。開発時は Vite dev サーバーを参照します。

## ライセンス

MIT
