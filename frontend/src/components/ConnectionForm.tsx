import { useState, useEffect } from 'react';
import type { ConnectionConfig, ProtocolType } from '../types';
import { useConnection } from '../hooks/useConnection';

interface ConnectionFormProps {
  onConnect: (config: ConnectionConfig) => void;
  loading: boolean;
}

export function ConnectionForm({ onConnect, loading }: ConnectionFormProps) {
  const [protocol, setProtocol] = useState<ProtocolType>('sftp');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const {
    savedConnections,
    importStatus,
    setImportStatus,
    handleSave,
    handleLoadConnection,
    handleDeleteConnection,
    handleImportFileZilla,
    fileInputRef,
  } = useConnection();

  useEffect(() => {
    // デフォルトポートを設定
    if (protocol === 'sftp') {
      setPort(22);
    } else {
      setPort(21);
    }
  }, [protocol]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect({ protocol, host, port, username, password });
  };

  const onSave = async () => {
    await handleSave(connectionName, protocol, host, port, username, password);
    setConnectionName('');
    setShowSaveDialog(false);
  };

  const onLoadConnection = (conn: typeof savedConnections[0]) => {
    const config = handleLoadConnection(conn);
    setProtocol(config.protocol);
    setHost(config.host);
    setPort(config.port);
    setUsername(config.username);
    setPassword(config.password);
  };

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImportFileZilla(file);
      setShowImportDialog(false);
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-folder)] flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-folder)] bg-clip-text text-transparent">
              FTP WebUI
            </h1>
          </div>
          <p className="text-[var(--color-text-muted)]">
            FTP / FTPS / SFTP クライアント
          </p>
        </div>

        {/* インポートステータス */}
        {importStatus && (
          <div className={`mb-4 p-4 rounded-lg border ${
            importStatus.success 
              ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]'
              : 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30 text-[var(--color-danger)]'
          }`}>
            <div className="flex items-center justify-between">
              <span>{importStatus.message}</span>
              <button onClick={() => setImportStatus(null)} className="opacity-70 hover:opacity-100">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* 保存済み接続 */}
        {savedConnections.length > 0 && (
          <div className="mb-6 p-4 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-sm font-medium text-[var(--color-text-muted)]">保存済み接続</h3>
              </div>
              <button
                onClick={() => setShowImportDialog(true)}
                className="text-xs px-2 py-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded transition-colors"
              >
                インポート
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {savedConnections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onLoadConnection(conn)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                  >
                    <span className="text-xs font-medium px-2 py-1 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)] uppercase flex-shrink-0">
                      {conn.config.protocol}
                    </span>
                    <span className="font-medium truncate">{conn.name}</span>
                    <span className="text-[var(--color-text-muted)] text-sm truncate">
                      {conn.config.username}@{conn.config.host}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteConnection(conn.id)}
                    className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 接続がない場合のインポートボタン */}
        {savedConnections.length === 0 && (
          <div className="mb-6 p-6 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] border-dashed text-center">
            <svg className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
            <p className="text-[var(--color-text-muted)] mb-3">保存済みの接続がありません</p>
            <button
              onClick={() => setShowImportDialog(true)}
              className="text-sm px-4 py-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors"
            >
              FileZillaからインポート
            </button>
          </div>
        )}

        {/* 接続フォーム */}
        <form onSubmit={handleSubmit} className="p-6 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
          {/* プロトコル選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              プロトコル
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['ftp', 'ftps', 'sftp'] as ProtocolType[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProtocol(p)}
                  className={`py-3 px-4 rounded-lg font-medium uppercase transition-all ${
                    protocol === p
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-background)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* ホスト & ポート */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                ホスト
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="example.com"
                required
                autoComplete="off"
                className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                ポート
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value) || 21)}
                required
                className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
          </div>

          {/* ユーザー名 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
              autoComplete="username"
              className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>

          {/* パスワード */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-folder)] text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  接続中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  接続
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowSaveDialog(!showSaveDialog)}
              className="py-3 px-4 bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
              title="接続を保存"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>

          {/* 保存ダイアログ */}
          {showSaveDialog && (
            <div className="mt-4 p-4 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-[var(--color-info)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-[var(--color-text-muted)]">
                  パスワードはAES-256-GCMで暗号化されます
                </span>
              </div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">
                接続名
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  placeholder="My Server"
                  className="flex-1 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!connectionName.trim()}
                  className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </form>

        {/* セキュリティ情報 */}
        <div className="mt-4 text-center text-xs text-[var(--color-text-muted)]">
          <p>保存されたパスワードはこのデバイス専用の鍵で暗号化されます</p>
        </div>
      </div>

      {/* FileZillaインポートダイアログ */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md border border-[var(--color-border)]">
            <h3 className="text-lg font-medium mb-4">FileZillaからインポート</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              FileZillaのサイトマネージャーからエクスポートしたXMLファイルを選択してください。
            </p>
            <div className="mb-4 p-4 bg-[var(--color-background)] rounded-lg border border-dashed border-[var(--color-border)]">
              <div className="text-center">
                <svg className="w-10 h-10 mx-auto mb-2 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <label className="cursor-pointer">
                  <span className="text-[var(--color-primary)] hover:underline">ファイルを選択</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml"
                    onChange={onFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">XMLファイル (.xml)</p>
              </div>
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mb-4">
              <p className="font-medium mb-1">エクスポート方法:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>FileZillaを開く</li>
                <li>ファイル → サイトマネージャーをエクスポート</li>
                <li>XMLファイルを保存</li>
              </ol>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-4 py-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
