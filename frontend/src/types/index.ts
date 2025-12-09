export type ProtocolType = 'ftp' | 'ftps' | 'sftp';

export interface ConnectionConfig {
  protocol: ProtocolType;
  host: string;
  port: number;
  username: string;
  password: string;
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

export interface SavedConnection {
  id: string;
  name: string;
  config: ConnectionConfig;
}

