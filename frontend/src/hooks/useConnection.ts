import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProtocolType, SavedConnection } from '../types';
import { encryptPassword, decryptPassword } from '../lib/crypto';
import { parseFileZillaXml } from '../lib/filezilla';

const STORAGE_KEY = 'ftp-saved-connections-v2'; // 暗号化版
const OLD_STORAGE_KEY = 'ftp-saved-connections'; // 旧版（マイグレーション用）

// 暗号化されたパスワードを持つ保存済み接続
interface EncryptedSavedConnection {
  id: string;
  name: string;
  config: {
    protocol: ProtocolType;
    host: string;
    port: number;
    username: string;
    encryptedPassword: string;
  };
}

interface UseConnectionReturn {
  savedConnections: SavedConnection[];
  importStatus: { success: boolean; message: string } | null;
  setImportStatus: (status: { success: boolean; message: string } | null) => void;
  handleSave: (
    connectionName: string,
    protocol: ProtocolType,
    host: string,
    port: number,
    username: string,
    password: string
  ) => Promise<void>;
  handleLoadConnection: (conn: SavedConnection) => {
    protocol: ProtocolType;
    host: string;
    port: number;
    username: string;
    password: string;
  };
  handleDeleteConnection: (id: string) => Promise<void>;
  handleImportFileZilla: (file: File) => Promise<void>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

/**
 * 保存済み接続の管理フック
 */
export function useConnection(): UseConnectionReturn {
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 接続を保存（内部用）
  const saveConnectionsInternal = useCallback(async (connections: SavedConnection[]) => {
    const encrypted: EncryptedSavedConnection[] = await Promise.all(
      connections.map(async (conn) => ({
        id: conn.id,
        name: conn.name,
        config: {
          protocol: conn.config.protocol,
          host: conn.config.host,
          port: conn.config.port,
          username: conn.config.username,
          encryptedPassword: await encryptPassword(conn.config.password),
        },
      }))
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
  }, []);

  // 保存済み接続を読み込み、必要ならマイグレーション
  useEffect(() => {
    const loadConnections = async () => {
      // 新形式のデータを読み込み
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const encrypted: EncryptedSavedConnection[] = JSON.parse(saved);
          const decrypted: SavedConnection[] = await Promise.all(
            encrypted.map(async (conn) => ({
              id: conn.id,
              name: conn.name,
              config: {
                protocol: conn.config.protocol,
                host: conn.config.host,
                port: conn.config.port,
                username: conn.config.username,
                password: await decryptPassword(conn.config.encryptedPassword),
              },
            }))
          );
          setSavedConnections(decrypted);
          return;
        } catch {
          // ignore
        }
      }

      // 旧形式のデータがあればマイグレーション
      const oldSaved = localStorage.getItem(OLD_STORAGE_KEY);
      if (oldSaved) {
        try {
          const oldConnections: SavedConnection[] = JSON.parse(oldSaved);
          if (oldConnections.length > 0) {
            setSavedConnections(oldConnections);
            // 新形式で保存
            await saveConnectionsInternal(oldConnections);
            // 旧データを削除
            localStorage.removeItem(OLD_STORAGE_KEY);
          }
        } catch {
          // ignore
        }
      }
    };
    loadConnections();
  }, [saveConnectionsInternal]);

  // 接続を保存
  const handleSave = useCallback(
    async (
      connectionName: string,
      protocol: ProtocolType,
      host: string,
      port: number,
      username: string,
      password: string
    ) => {
      if (!connectionName.trim()) return;

      const newConnection: SavedConnection = {
        id: Date.now().toString(),
        name: connectionName,
        config: { protocol, host, port, username, password },
      };

      const updated = [...savedConnections, newConnection];
      setSavedConnections(updated);
      await saveConnectionsInternal(updated);
    },
    [savedConnections, saveConnectionsInternal]
  );

  // 接続情報を読み込み
  const handleLoadConnection = useCallback((conn: SavedConnection) => {
    return {
      protocol: conn.config.protocol,
      host: conn.config.host,
      port: conn.config.port,
      username: conn.config.username,
      password: conn.config.password || '',
    };
  }, []);

  // 接続を削除
  const handleDeleteConnection = useCallback(
    async (id: string) => {
      const updated = savedConnections.filter((c) => c.id !== id);
      setSavedConnections(updated);
      await saveConnectionsInternal(updated);
    },
    [savedConnections, saveConnectionsInternal]
  );

  // FileZilla XMLインポート
  const handleImportFileZilla = useCallback(
    async (file: File) => {
      try {
        const content = await file.text();
        const imported = parseFileZillaXml(content);

        if (imported.length === 0) {
          setImportStatus({ success: false, message: 'インポート可能なサーバーが見つかりませんでした' });
          return;
        }

        // 既存の接続とマージ
        const updated = [...savedConnections, ...imported];
        setSavedConnections(updated);
        await saveConnectionsInternal(updated);

        setImportStatus({ success: true, message: `${imported.length}件のサーバーをインポートしました` });
      } catch (error) {
        setImportStatus({
          success: false,
          message: error instanceof Error ? error.message : 'インポートに失敗しました',
        });
      }
    },
    [savedConnections, saveConnectionsInternal]
  );

  return {
    savedConnections,
    importStatus,
    setImportStatus,
    handleSave,
    handleLoadConnection,
    handleDeleteConnection,
    handleImportFileZilla,
    fileInputRef,
  };
}

