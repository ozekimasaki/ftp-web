interface BreadcrumbProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumb({ currentPath, onNavigate }: BreadcrumbProps) {
  const pathParts = currentPath.split('/').filter(Boolean);

  const handleClick = (index: number) => {
    if (index === -1) {
      onNavigate('/');
    } else {
      const path = '/' + pathParts.slice(0, index + 1).join('/');
      onNavigate(path);
    }
  };

  return (
    <div className="flex-1 flex items-center gap-1 ml-4 px-3 py-2 bg-[var(--color-background)] rounded-lg overflow-x-auto">
      <button
        onClick={() => handleClick(-1)}
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
            onClick={() => handleClick(i)}
            className="hover:text-[var(--color-primary)] transition-colors"
          >
            {part}
          </button>
        </span>
      ))}
    </div>
  );
}

