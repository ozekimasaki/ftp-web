import * as ftp from 'basic-ftp';
import { Readable, Writable } from 'stream';
import { ConnectionConfig, FileInfo, IFileService } from '../types';

export class FtpService implements IFileService {
  private client: ftp.Client;
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.client = new ftp.Client();
    this.client.ftp.verbose = false;
    this.config = config;
  }

  async connect(): Promise<void> {
    await this.client.access({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      secure: this.config.protocol === 'ftps',
      secureOptions: this.config.protocol === 'ftps' ? { rejectUnauthorized: false } : undefined,
    });
  }

  async disconnect(): Promise<void> {
    this.client.close();
  }

  async list(path: string): Promise<FileInfo[]> {
    const files = await this.client.list(path);
    return files.map((file) => ({
      name: file.name,
      type: file.isDirectory ? 'directory' : file.isSymbolicLink ? 'symbolic-link' : file.isFile ? 'file' : 'unknown',
      size: file.size,
      modifiedAt: file.modifiedAt?.toISOString() || new Date().toISOString(),
      permissions: file.permissions ? this.formatPermissions(file.permissions) : undefined,
    }));
  }

  private formatPermissions(permissions: ftp.UnixPermissions): string {
    const format = (p: number) => {
      let s = '';
      s += (p & 4) ? 'r' : '-';
      s += (p & 2) ? 'w' : '-';
      s += (p & 1) ? 'x' : '-';
      return s;
    };
    return format(permissions.user) + format(permissions.group) + format(permissions.world);
  }

  async pwd(): Promise<string> {
    return await this.client.pwd();
  }

  async cd(path: string): Promise<string> {
    await this.client.cd(path);
    return await this.pwd();
  }

  async mkdir(path: string): Promise<void> {
    await this.client.ensureDir(path);
  }

  async rmdir(path: string): Promise<void> {
    await this.client.removeDir(path);
  }

  async delete(path: string): Promise<void> {
    await this.client.remove(path);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.client.rename(oldPath, newPath);
  }

  async downloadToStream(remotePath: string, writable: Writable): Promise<void> {
    await this.client.downloadTo(writable, remotePath);
  }

  async uploadFromStream(remotePath: string, readable: Readable): Promise<void> {
    await this.client.uploadFrom(readable, remotePath);
  }

  async uploadFromBuffer(remotePath: string, buffer: Buffer): Promise<void> {
    const readable = Readable.from(buffer);
    await this.client.uploadFrom(readable, remotePath);
  }

  isConnected(): boolean {
    return !this.client.closed;
  }
}

