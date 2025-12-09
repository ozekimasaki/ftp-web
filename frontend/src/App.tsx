import { useFtp } from './hooks/useFtp';
import { ConnectionForm } from './components/ConnectionForm';
import { FileBrowser } from './components/FileBrowser';

function App() {
  const {
    session,
    files,
    currentPath,
    loading,
    error,
    connect,
    disconnect,
    refreshFiles,
    navigateTo,
    createDirectory,
    deleteItem,
    renameItem,
    downloadFile,
    uploadFiles,
    clearError,
  } = useFtp();

  return (
    <>
      {/* エラー通知 */}
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3 p-4 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-xl backdrop-blur-sm">
            <svg className="w-5 h-5 text-[var(--color-danger)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--color-danger)]">エラー</p>
              <p className="text-sm text-[var(--color-text-muted)] break-words">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="flex-shrink-0 p-1 hover:bg-[var(--color-danger)]/20 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      {session ? (
        <FileBrowser
          session={session}
          files={files}
          currentPath={currentPath}
          loading={loading}
          onNavigate={navigateTo}
          onRefresh={refreshFiles}
          onCreateDirectory={createDirectory}
          onDelete={deleteItem}
          onRename={renameItem}
          onDownload={downloadFile}
          onUpload={uploadFiles}
          onDisconnect={disconnect}
        />
      ) : (
        <ConnectionForm onConnect={connect} loading={loading} />
      )}
    </>
  );
}

export default App;
