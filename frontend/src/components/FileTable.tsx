import { useState } from 'react';
import type { FileInfo } from '../types';
import { formatFileSize, formatDate } from '../lib/format';

interface FileTableProps {
  files: FileInfo[];
  loading: boolean;
  onDoubleClick: (file: FileInfo) => void;
  onDownload: (file: FileInfo) => void;
  onRename: (file: FileInfo, newName: string) => void;
  onDelete: (file: FileInfo) => void;
}

function getFileIcon(file: FileInfo) {
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
}

export function FileTable({
  files,
  loading,
  onDoubleClick,
  onDownload,
  onRename,
  onDelete,
}: FileTableProps) {
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [renameFile, setRenameFile] = useState<FileInfo | null>(null);
  const [newName, setNewName] = useState('');

  const handleRename = () => {
    if (renameFile && newName.trim() && newName !== renameFile.name) {
      onRename(renameFile, newName.trim());
    }
    setRenameFile(null);
    setNewName('');
  };

  const startRename = (file: FileInfo) => {
    setRenameFile(file);
    setNewName(file.name);
  };

  return (
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
              onDoubleClick={() => onDoubleClick(file)}
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
                {file.type === 'directory' ? '-' : formatFileSize(file.size)}
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
                      startRename(file);
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
  );
}

