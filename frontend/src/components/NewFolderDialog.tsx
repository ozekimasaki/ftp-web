interface NewFolderDialogProps {
  isOpen: boolean;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

export function NewFolderDialog({
  isOpen,
  folderName,
  onFolderNameChange,
  onCreate,
  onClose,
}: NewFolderDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md border border-[var(--color-border)]">
        <h3 className="text-lg font-medium mb-4">新しいフォルダ</h3>
        <input
          type="text"
          value={folderName}
          onChange={(e) => onFolderNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onCreate()}
          placeholder="フォルダ名"
          autoFocus
          className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] mb-4"
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onCreate}
            disabled={!folderName.trim()}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            作成
          </button>
        </div>
      </div>
    </div>
  );
}

