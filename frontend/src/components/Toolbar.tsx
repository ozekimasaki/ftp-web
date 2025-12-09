import { useRef } from 'react';

interface ToolbarProps {
  currentPath: string;
  loading: boolean;
  showUploadMenu: boolean;
  setShowUploadMenu: (show: boolean) => void;
  onGoUp: () => void;
  onRefresh: () => void;
  onNewFolder: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFolderSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Toolbar({
  currentPath,
  loading,
  showUploadMenu,
  setShowUploadMenu,
  onGoUp,
  onRefresh,
  onNewFolder,
  onFileSelect,
  onFolderSelect,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onGoUp}
        disabled={currentPath === '/'}
        className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="上のフォルダへ"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg disabled:opacity-50 transition-colors"
        title="更新"
      >
        <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      <div className="h-6 w-px bg-[var(--color-border)]" />
      <button
        onClick={onNewFolder}
        className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
        title="新しいフォルダ"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      </button>

      {/* アップロードメニュー */}
      <div className="relative">
        <button
          onClick={() => setShowUploadMenu(!showUploadMenu)}
          className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors flex items-center gap-1"
          title="アップロード"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showUploadMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowUploadMenu(false)}
            />
            <div className="absolute top-full left-0 mt-1 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-20 min-w-[160px]">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-2 text-left hover:bg-[var(--color-surface-hover)] flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-[var(--color-file)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                ファイル
              </button>
              <button
                onClick={() => folderInputRef.current?.click()}
                className="w-full px-4 py-2 text-left hover:bg-[var(--color-surface-hover)] flex items-center gap-3 transition-colors"
              >
                <svg className="w-4 h-4 text-[var(--color-folder)]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                フォルダ
              </button>
            </div>
          </>
        )}

        {/* 隠しinput要素 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={onFileSelect}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          onChange={onFolderSelect}
          className="hidden"
          {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
        />
      </div>
    </div>
  );
}

