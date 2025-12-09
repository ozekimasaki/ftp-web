import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { UploadFile } from '../lib/api';
import type { ConnectionConfig, FileInfo, SessionInfo } from '../types';

export function useFtp() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (config: ConnectionConfig) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.connect(config);
      if (response.success && response.data) {
        setSession(response.data.session);
        setCurrentPath(response.data.session.currentPath);
        setFiles(response.data.files);
      } else {
        setError(response.error || 'Connection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      await api.disconnect(session.id);
      setSession(null);
      setFiles([]);
      setCurrentPath('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setLoading(false);
    }
  }, [session]);

  const refreshFiles = useCallback(async () => {
    if (!session) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.list(session.id, currentPath);
      if (response.success && response.data) {
        setFiles(response.data);
      } else {
        setError(response.error || 'Failed to list files');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list files');
    } finally {
      setLoading(false);
    }
  }, [session, currentPath]);

  const navigateTo = useCallback(async (path: string) => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.cd(session.id, path);
      if (response.success && response.data) {
        setCurrentPath(response.data.path);
        setFiles(response.data.files);
      } else {
        setError(response.error || 'Failed to change directory');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change directory');
    } finally {
      setLoading(false);
    }
  }, [session]);

  const createDirectory = useCallback(async (name: string) => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
      const response = await api.mkdir(session.id, path, currentPath);
      if (response.success && response.data) {
        setFiles(response.data);
      } else {
        setError(response.error || 'Failed to create directory');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create directory');
    } finally {
      setLoading(false);
    }
  }, [session, currentPath]);

  const deleteItem = useCallback(async (file: FileInfo) => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const path = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      const response = file.type === 'directory'
        ? await api.rmdir(session.id, path, currentPath)
        : await api.deleteFile(session.id, path, currentPath);
      if (response.success && response.data) {
        setFiles(response.data);
      } else {
        setError(response.error || 'Failed to delete');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  }, [session, currentPath]);

  const renameItem = useCallback(async (oldName: string, newName: string) => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const oldPath = currentPath === '/' ? `/${oldName}` : `${currentPath}/${oldName}`;
      const newPath = currentPath === '/' ? `/${newName}` : `${currentPath}/${newName}`;
      const response = await api.rename(session.id, oldPath, newPath, currentPath);
      if (response.success && response.data) {
        setFiles(response.data);
      } else {
        setError(response.error || 'Failed to rename');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename');
    } finally {
      setLoading(false);
    }
  }, [session, currentPath]);

  const downloadFile = useCallback((file: FileInfo) => {
    if (!session || file.type === 'directory') return;
    const path = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
    const url = api.getDownloadUrl(session.id, path);
    window.open(url, '_blank');
  }, [session, currentPath]);

  const uploadFiles = useCallback(async (uploadFiles: UploadFile[], onProgress?: (progress: number) => void) => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.upload(session.id, currentPath, uploadFiles, onProgress);
      if (response.success && response.data) {
        setFiles(response.data.files);
      } else {
        setError(response.error || 'Failed to upload');
      }
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setLoading(false);
    }
  }, [session, currentPath]);

  return {
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
    clearError: () => setError(null),
  };
}
