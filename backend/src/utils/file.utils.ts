import { FileInfo } from '../types';

/**
 * ファイル一覧をソート（ディレクトリ優先、その後名前順）
 */
export function sortFiles(files: FileInfo[]): FileInfo[] {
  return files.sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * リモートパスを構築
 */
export function buildRemotePath(basePath: string, fileName: string): string {
  if (!basePath || basePath === '/') {
    return `/${fileName}`;
  }
  return `${basePath}/${fileName}`;
}

/**
 * パスからディレクトリ部分を抽出
 */
export function extractDirectoryPath(path: string): string {
  const lastSlashIndex = path.lastIndexOf('/');
  if (lastSlashIndex <= 0) {
    return '/';
  }
  return path.substring(0, lastSlashIndex);
}

