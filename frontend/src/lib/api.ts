import type { ConnectionConfig, FileInfo, SessionInfo, ApiResponse } from '../types';

const API_BASE = '/api/ftp';

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  return response.json();
}

export interface UploadFile {
  file: File;
  relativePath: string; // フォルダ内の相対パス
}

export const api = {
  async connect(config: ConnectionConfig): Promise<ApiResponse<{ session: SessionInfo; files: FileInfo[] }>> {
    return request<{ session: SessionInfo; files: FileInfo[] }>('/connect', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async disconnect(sessionId: string): Promise<ApiResponse> {
    return request('/disconnect', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  async list(sessionId: string, path: string = '.'): Promise<ApiResponse<FileInfo[]>> {
    return request<FileInfo[]>(`/list?sessionId=${sessionId}&path=${encodeURIComponent(path)}`);
  },

  async cd(sessionId: string, path: string): Promise<ApiResponse<{ path: string; files: FileInfo[] }>> {
    return request<{ path: string; files: FileInfo[] }>('/cd', {
      method: 'POST',
      body: JSON.stringify({ sessionId, path }),
    });
  },

  async pwd(sessionId: string): Promise<ApiResponse<{ path: string }>> {
    return request<{ path: string }>(`/pwd?sessionId=${sessionId}`);
  },

  async mkdir(sessionId: string, path: string, currentPath: string): Promise<ApiResponse<FileInfo[]>> {
    return request<FileInfo[]>('/mkdir', {
      method: 'POST',
      body: JSON.stringify({ sessionId, path, currentPath }),
    });
  },

  async rmdir(sessionId: string, path: string, currentPath: string): Promise<ApiResponse<FileInfo[]>> {
    return request<FileInfo[]>('/rmdir', {
      method: 'POST',
      body: JSON.stringify({ sessionId, path, currentPath }),
    });
  },

  async deleteFile(sessionId: string, path: string, currentPath: string): Promise<ApiResponse<FileInfo[]>> {
    return request<FileInfo[]>('/delete', {
      method: 'POST',
      body: JSON.stringify({ sessionId, path, currentPath }),
    });
  },

  async rename(sessionId: string, oldPath: string, newPath: string, currentPath: string): Promise<ApiResponse<FileInfo[]>> {
    return request<FileInfo[]>('/rename', {
      method: 'POST',
      body: JSON.stringify({ sessionId, oldPath, newPath, currentPath }),
    });
  },

  getDownloadUrl(sessionId: string, path: string): string {
    return `${API_BASE}/download?sessionId=${sessionId}&path=${encodeURIComponent(path)}`;
  },

  async upload(
    sessionId: string,
    basePath: string,
    uploadFiles: UploadFile[],
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ uploads: { name: string; success: boolean; error?: string }[]; files: FileInfo[] }>> {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('basePath', basePath);
    
    // ファイルと相対パスを追加
    uploadFiles.forEach((uf, index) => {
      formData.append('files', uf.file);
      formData.append(`relativePaths[${index}]`, uf.relativePath);
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress((e.loaded / e.total) * 100);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Failed to parse response'));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      
      xhr.open('POST', `${API_BASE}/upload`);
      xhr.send(formData);
    });
  },
};
