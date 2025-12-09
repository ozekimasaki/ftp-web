import SftpClient from 'ssh2-sftp-client';
import { Readable, Writable } from 'stream';
import { ConnectionConfig, FileInfo } from '../types/index.js';

export class SftpService {
  private client: SftpClient;
  private config: ConnectionConfig;
  private connected: boolean = false;

  constructor(config: ConnectionConfig) {
    this.client = new SftpClient();
    this.config = config;
  }

  async connect(): Promise<void> {
    await this.client.connect({
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      password: this.config.password,
      privateKey: this.config.privateKey,
    });
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    await this.client.end();
    this.connected = false;
  }

  async list(path: string): Promise<FileInfo[]> {
    const files = await this.client.list(path);
    return files.map((file) => ({
      name: file.name,
      type: file.type === 'd' ? 'directory' : file.type === 'l' ? 'symbolic-link' : file.type === '-' ? 'file' : 'unknown',
      size: file.size,
      modifiedAt: new Date(file.modifyTime).toISOString(),
      permissions: this.formatPermissions(file.rights),
    }));
  }

  private formatPermissions(rights: { user: string; group: string; other: string }): string {
    return rights.user + rights.group + rights.other;
  }

  async pwd(): Promise<string> {
    return await this.client.cwd();
  }

  async cd(path: string): Promise<string> {
    // SFTP doesn't have a cd command, so we just return the path if it exists
    const exists = await this.client.exists(path);
    if (exists !== 'd') {
      throw new Error(`Directory not found: ${path}`);
    }
    return path;
  }

  async mkdir(path: string): Promise<void> {
    await this.client.mkdir(path, true);
  }

  async rmdir(path: string): Promise<void> {
    await this.client.rmdir(path, true);
  }

  async delete(path: string): Promise<void> {
    await this.client.delete(path);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.client.rename(oldPath, newPath);
  }

  async downloadToStream(remotePath: string, writable: Writable): Promise<void> {
    await this.client.get(remotePath, writable);
  }

  async uploadFromStream(remotePath: string, readable: Readable): Promise<void> {
    await this.client.put(readable, remotePath);
  }

  async uploadFromBuffer(remotePath: string, buffer: Buffer): Promise<void> {
    await this.client.put(buffer, remotePath);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

