import { useState, useCallback } from 'react';
import type { FileInfo, SessionInfo } from '../types';
import type { UploadFile } from '../lib/api';
import { Toolbar } from './Toolbar';
import { Breadcrumb } from './Breadcrumb';
import { FileTable } from './FileTable';
import { NewFolderDialog } from './NewFolderDialog';

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
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);

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

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateDirectory(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolderDialog(false);
    }
  };

  const handleRename = (file: FileInfo, newName: string) => {
    onRename(file.name, newName);
  };

  // FileListをUploadFile[]に変換
  const convertToUploadFiles = (fileList: FileList): UploadFile[] => {
    return Array.from(fileList).map((file) => ({
      file,
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
        <Toolbar
          currentPath={currentPath}
          loading={loading}
          showUploadMenu={showUploadMenu}
          setShowUploadMenu={setShowUploadMenu}
          onGoUp={handleGoUp}
          onRefresh={onRefresh}
          onNewFolder={() => setShowNewFolderDialog(true)}
          onFileSelect={handleFileInput}
          onFolderSelect={handleFolderInput}
        />
        <Breadcrumb currentPath={currentPath} onNavigate={onNavigate} />
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

        <FileTable
          files={files}
          loading={loading}
          onDoubleClick={handleDoubleClick}
          onDownload={onDownload}
          onRename={handleRename}
          onDelete={onDelete}
        />
      </div>

      {/* 新規フォルダダイアログ */}
      <NewFolderDialog
        isOpen={showNewFolderDialog}
        folderName={newFolderName}
        onFolderNameChange={setNewFolderName}
        onCreate={handleCreateFolder}
        onClose={() => {
          setShowNewFolderDialog(false);
          setNewFolderName('');
        }}
      />

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
