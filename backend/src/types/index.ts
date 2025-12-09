import { Readable, Writable } from 'stream';

export type ProtocolType = 'ftp' | 'ftps' | 'sftp';

export interface ConnectionConfig {
  protocol: ProtocolType;
  host: string;
  port: number;
  username: string;
  password: string;
  privateKey?: string;
}

export interface FileInfo {
  name: string;
  type: 'file' | 'directory' | 'symbolic-link' | 'unknown';
  size: number;
  modifiedAt: string;
  permissions?: string;
}

export interface SessionInfo {
  id: string;
  protocol: ProtocolType;
  host: string;
  username: string;
  currentPath: string;
  connectedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * FTP/SFTP サービスの共通インターフェース
 */
export interface IFileService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  list(path: string): Promise<FileInfo[]>;
  pwd(): Promise<string>;
  cd(path: string): Promise<string>;
  mkdir(path: string): Promise<void>;
  rmdir(path: string): Promise<void>;
  delete(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  downloadToStream(remotePath: string, writable: Writable): Promise<void>;
  uploadFromStream(remotePath: string, readable: Readable): Promise<void>;
  uploadFromBuffer(remotePath: string, buffer: Buffer): Promise<void>;
  isConnected(): boolean;
}

