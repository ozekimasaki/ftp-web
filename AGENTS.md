# AGENTS.md

このリポジトリで作業するコーディングエージェント向けのガイドです。FTP WebUI は React（フロントエンド）+ Express（バックエンド）+ Electron（デスクトップ）で構成される FTP / FTPS / SFTP クライアントです。

## プロジェクト構成

- **`backend/`** — Express + TypeScript の API サーバー。
  - `src/index.ts` — エントリポイント。`/api/ftp` ルートと `/api/health` を登録。`startServer` / `stopServer` をエクスポートし、`ELECTRON_RUN_AS_NODE` または `SERVE_STATIC` が設定されている場合は `frontend/dist` を静的配信する。
  - `src/routes/ftp.ts` — `connect` / `disconnect` / `list` / `cd` / `pwd` / `mkdir` / `rmdir` / `delete` / `rename` / `download` / `upload` / `session` のエンドポイント。
  - `src/services/ftp.service.ts`, `src/services/sftp.service.ts` — `IFileService` の実装。プロトコルに応じて `createService` が選択する。
  - `src/utils/session.manager.ts` — `SessionManager`（シングルトン `sessionManager`）。`withLock` で同一セッションの操作を直列化する。
  - `src/utils/file.utils.ts` — `sortFiles` / `buildRemotePath` / `extractDirectoryPath`。
  - `src/utils/async-handler.ts` — 非同期ルートのエラーハンドリングラッパー。
  - `src/types/index.ts` — `ConnectionConfig` / `FileInfo` / `SessionInfo` / `ApiResponse` / `IFileService` などの共通型。
- **`frontend/`** — React 19 + Vite 7 + Tailwind CSS 4。
  - `src/App.tsx` — ルートコンポーネント。`useFtp` の状態でフォームとファイルブラウザを切り替える。
  - `src/components/` — `ConnectionForm`, `FileBrowser`, `FileTable`, `Toolbar`, `Breadcrumb`, `NewFolderDialog`。
  - `src/hooks/` — `useFtp`（接続・ファイル操作）、`useConnection`（保存済みプロファイル・FileZilla インポート）。
  - `src/lib/` — `api.ts`（バックエンド呼び出し）、`crypto.ts`（AES-GCM 暗号化）、`filezilla.ts`（XML インポート）、`format.ts`。
  - `src/types/index.ts` — フロントエンド側の共通型（`SavedConnection` を含む）。
- **`electron/`** — Electron メインプロセス。
  - `main.ts` — ウィンドウ生成。本番時はバックエンドを子プロセスとして `fork` し、`http://localhost:3001` を読み込む。開発時は Vite dev サーバー（5173）を参照。
  - `preload.ts` — `contextBridge` で `window.electronAPI` を公開。
- **`scripts/build-deb.sh`** — `electron-builder` のアンパック版から `.deb` を生成する Bash スクリプト。
- ルートの `package.json` がワークスペース全体のスクリプトを定義し、`postinstall` で `backend` と `frontend` の依存を導入する。

## セットアップ

```bash
npm install   # postinstall で backend / frontend の依存も自動インストール
```

- Node.js 20.19 以上（または 22.12 以上）が必要（Vite 7 の要件）。

## ビルド / 型チェック / Lint コマンド

このリポジトリには専用の test / typecheck スクリプトは存在しない。型チェックは各パッケージのビルド（`tsc`）が兼ねる。

| 目的 | コマンド | 実行場所 |
| --- | --- | --- |
| 全体ビルド | `npm run build` | ルート |
| バックエンドビルド（型チェック） | `npm run build:backend` | ルート |
| フロントエンドビルド（型チェック + Vite） | `npm run build:frontend` | ルート |
| Electron ビルド（型チェック） | `npm run build:electron` | ルート |
| Lint | `npm run lint` | `frontend/` |
| `.deb` 生成 | `npm run dist:deb` | ルート（Linux + `dpkg-deb` 必要） |

開発サーバー: `npm run dev`（backend + frontend + electron を同時起動）、または `npm run dev:backend` / `npm run dev:frontend` / `npm run dev:electron`。

変更後は最低限、影響範囲に応じて次を実行して確認すること:
- フロントエンド変更: `cd frontend && npm run lint` と `npm run build:frontend`
- バックエンド変更: `npm run build:backend`
- Electron 変更: `npm run build:electron`

> 注: 既存の `frontend` コードには Lint エラーが残っている（`react-hooks/set-state-in-effect`、`prefer-const`）。自分の変更で新たなエラーを増やさないこと。無関係な既存エラーの修正は依頼されない限り行わない。

## コーディング規約

- **言語**: すべて TypeScript。バックエンド / Electron は `strict: true` の CommonJS、フロントエンドは ESM + React 19。
- **型**: `any` を避け、`ApiResponse<T>` や `IFileService` など既存の型・インターフェースを再利用する。バックエンドとフロントエンドで `ConnectionConfig` / `FileInfo` などの型が重複定義されているため、片方を変更する場合は整合性に注意する。
- **バックエンドのルート**: 非同期ハンドラは必ず `asyncHandler` でラップし、レスポンスは `ApiResponse` 形式（`{ success, data?, error? }`）で返す。セッションを扱う操作は `sessionManager.withLock` を経由する。
- **プロトコル追加/変更**: `IFileService` を実装し、`routes/ftp.ts` の `createService` に組み込む。
- **コメント**: 既存コードは日本語コメントが中心。周囲のスタイルに合わせる。過剰なコメントは避ける。
- **フロントエンド**: 関数コンポーネント + フック。スタイルは Tailwind CSS のユーティリティクラスと CSS 変数（`var(--color-...)`）を使用する。

## 注意点

- 秘密情報を扱う: 接続プロファイルのパスワードはフロントエンドで AES-GCM 暗号化して `localStorage` に保存する（鍵は IndexedDB）。平文パスワードや鍵をログ出力・コミットしない。
- `.gitignore` は `*.key` / `*.pem` / `sitemanager.xml` / `connections.json` などを除外している。接続情報ファイルをコミットしないこと。
- FTPS 接続は `rejectUnauthorized: false` で自己署名証明書を許容している（`ftp.service.ts`）。挙動を変更する際は影響を理解した上で行う。
- 本番（Electron）とブラウザ開発の両方で動く必要がある。API のベースパスは常に `/api/ftp`（開発時は Vite proxy 経由）。
- `.deb` ビルド（`scripts/build-deb.sh`）は Linux ARM64 と `dpkg-deb` を前提とする。生成物（`dist/`, `dist-electron/`, `release/`）は `.gitignore` 済み。
- 変更は必要なファイルに限定し、大規模なリファクタリングや無関係なファイルの変更は避ける。
