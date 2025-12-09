import { useState, useCallback, useRef } from 'react';
import type { FileInfo, SessionInfo } from '../types';
import type { UploadFile } from '../lib/api';

interface FileBrowserProps {
  session: SessionInfo;
  files: FileInfo[];
  currentPath: string;
  loading: boolean;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  onCreateDirectory: (name: string) => void;
  onDelete: (file: FileInfo) => void;
  onRename: (oldName: string, newName: string) => void;
  onDownload: (file: FileInfo) => void;
  onUpload: (files: UploadFile[], onProgress?: (progress: number) => void) => Promise<unknown>;
  onDisconnect: () => void;
}

export function FileBrowser({
  session,
  files,
  currentPath,
  loading,
  onNavigate,
  onRefresh,
  onCreateDirectory,
  onDelete,
  onRename,
  onDownload,
  onUpload,
  onDisconnect,
}: FileBrowserProps) {
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameFile, setRenameFile] = useState<FileInfo | null>(null);
  const [newName, setNewName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const pathParts = currentPath.split('/').filter(Boolean);

  const handleDoubleClick = (file: FileInfo) => {
    if (file.type === 'directory') {
      const newPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      onNavigate(newPath);
    }
  };

  const handleGoUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    onNavigate('/' + parts.join('/'));
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      onNavigate('/');
    } else {
      const path = '/' + pathParts.slice(0, index + 1).join('/');
      onNavigate(path);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateDirectory(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderDialog(false);
    }
  };

  const handleRename = () => {
    if (renameFile && newName.trim() && newName !== renameFile.name) {
      onRename(renameFile.name, newName.trim());
    }
    setRenameFile(null);
    setNewName('');
  };

  // FileListをUploadFile[]に変換
  const convertToUploadFiles = (fileList: FileList): UploadFile[] => {
    return Array.from(fileList).map((file) => ({
      file,
      // webkitRelativePathがあればそれを使用、なければファイル名
      relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    }));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    const uploadFiles: UploadFile[] = [];
    
    // webkitGetAsEntry APIを使用してフォルダ内のファイルを取得
    const readEntries = async (entry: FileSystemEntry, basePath: string = ''): Promise<void> => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        const file = await new Promise<File>((resolve, reject) => {
          fileEntry.file(resolve, reject);
        });
        const relativePath = basePath ? `${basePath}/${file.name}` : file.name;
        uploadFiles.push({ file, relativePath });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const dirReader = dirEntry.createReader();
        const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
        const newBasePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        for (const subEntry of entries) {
          await readEntries(subEntry, newBasePath);
        }
      }
    };
    
    // DataTransferItemListからエントリを読み取り
    const promises: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          promises.push(readEntries(entry));
        }
      }
    }
    
    await Promise.all(promises);
    
    if (uploadFiles.length > 0) {
      setUploadProgress(0);
      await onUpload(uploadFiles, (progress) => setUploadProgress(progress));
      setUploadProgress(null);
    }
  }, [onUpload]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const uploadFiles = convertToUploadFiles(selectedFiles);
      setUploadProgress(0);
      setShowUploadMenu(false);
      await onUpload(uploadFiles, (progress) => setUploadProgress(progress));
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  const handleFolderInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const uploadFiles = convertToUploadFiles(selectedFiles);
      setUploadProgress(0);
      setShowUploadMenu(false);
      await onUpload(uploadFiles, (progress) => setUploadProgress(progress));
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (file: FileInfo) => {
    if (file.type === 'directory') {
      return (
        <svg className="w-5 h-5 text-[var(--color-folder)]" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-[var(--color-file)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--color-background)]">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-folder)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
            <span className="font-medium text-[var(--color-text)]">FTP WebUI</span>
          </div>
          <div className="h-6 w-px bg-[var(--color-border)]" />
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)] uppercase font-medium">
              {session.protocol}
            </span>
            <span className="text-[var(--color-text-muted)]">
              {session.username}@{session.host}
            </span>
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="flex items-center gap-2 px-3 py-2 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          切断
        </button>
      </header>

      {/* ツールバー */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <button
          onClick={handleGoUp}
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
          onClick={() => setShowNewFolderDialog(true)}
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
            onChange={handleFileInput}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            onChange={handleFolderInput}
            className="hidden"
            {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
          />
        </div>

        {/* パンくずナビゲーション */}
        <div className="flex-1 flex items-center gap-1 ml-4 px-3 py-2 bg-[var(--color-background)] rounded-lg overflow-x-auto">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className="flex items-center hover:text-[var(--color-primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center">
              <span className="mx-1 text-[var(--color-text-muted)]">/</span>
              <button
                onClick={() => handleBreadcrumbClick(i)}
                className="hover:text-[var(--color-primary)] transition-colors"
              >
                {part}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* アップロード進捗 */}
      {uploadProgress !== null && (
        <div className="px-4 py-2 bg-[var(--color-surface)]">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-muted)]">アップロード中...</span>
            <div className="flex-1 h-2 bg-[var(--color-background)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-success)] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-sm text-[var(--color-text-muted)]">{Math.round(uploadProgress)}%</span>
          </div>
        </div>
      )}

      {/* ファイル一覧 */}
      <div
        className={`flex-1 overflow-auto relative ${isDragging ? 'ring-2 ring-[var(--color-primary)] ring-inset' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-[var(--color-primary)]/10 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium text-[var(--color-primary)]">ファイルまたはフォルダをドロップ</p>
            </div>
          </div>
        )}

        <table className="w-full">
          <thead className="sticky top-0 bg-[var(--color-surface)] text-left text-sm text-[var(--color-text-muted)]">
            <tr className="border-b border-[var(--color-border)]">
              <th className="py-3 px-4 font-medium">名前</th>
              <th className="py-3 px-4 font-medium w-28">サイズ</th>
              <th className="py-3 px-4 font-medium w-44">更新日時</th>
              <th className="py-3 px-4 font-medium w-28">権限</th>
              <th className="py-3 px-4 font-medium w-32">操作</th>
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-[var(--color-text-muted)]">
                  {loading ? '読み込み中...' : 'ファイルがありません'}
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  onDoubleClick={() => handleDoubleClick(file)}
                  className={`border-b border-[var(--color-border)] cursor-pointer transition-colors ${
                    selectedFile?.name === file.name
                      ? 'bg-[var(--color-primary)]/10'
                      : 'hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file)}
                      {renameFile?.name === file.name ? (
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onBlur={handleRename}
                          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                          autoFocus
                          className="px-2 py-1 bg-[var(--color-background)] border border-[var(--color-primary)] rounded text-[var(--color-text)] focus:outline-none"
                        />
                      ) : (
                        <span className={file.type === 'directory' ? 'text-[var(--color-folder)]' : ''}>
                          {file.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[var(--color-text-muted)]">
                    {file.type === 'directory' ? '-' : formatSize(file.size)}
                  </td>
                  <td className="py-3 px-4 text-[var(--color-text-muted)]">
                    {formatDate(file.modifiedAt)}
                  </td>
                  <td className="py-3 px-4 font-mono text-sm text-[var(--color-text-muted)]">
                    {file.permissions || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {file.type !== 'directory' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload(file);
                          }}
                          className="p-1.5 hover:bg-[var(--color-surface)] rounded transition-colors"
                          title="ダウンロード"
                        >
                          <svg className="w-4 h-4 text-[var(--color-info)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameFile(file);
                          setNewName(file.name);
                        }}
                        className="p-1.5 hover:bg-[var(--color-surface)] rounded transition-colors"
                        title="名前変更"
                      >
                        <svg className="w-4 h-4 text-[var(--color-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`"${file.name}" を削除しますか？`)) {
                            onDelete(file);
                          }
                        }}
                        className="p-1.5 hover:bg-[var(--color-surface)] rounded transition-colors"
                        title="削除"
                      >
                        <svg className="w-4 h-4 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 新規フォルダダイアログ */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md border border-[var(--color-border)]">
            <h3 className="text-lg font-medium mb-4">新しいフォルダ</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              placeholder="フォルダ名"
              autoFocus
              className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ステータスバー */}
      <footer className="px-4 py-2 bg-[var(--color-surface)] border-t border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
        <div className="flex items-center justify-between">
          <span>{files.length} 項目</span>
          <span>{currentPath}</span>
        </div>
      </footer>
    </div>
  );
}
