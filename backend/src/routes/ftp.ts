import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { FtpService } from '../services/ftp.service';
import { SftpService } from '../services/sftp.service';
import { ConnectionConfig, SessionInfo, ApiResponse, FileInfo } from '../types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// セッション管理用のMap
const sessions = new Map<string, { 
  service: FtpService | SftpService; 
  info: SessionInfo;
  currentPath: string;
  lock: Promise<unknown>;
}>();

// セッションの操作をキューに入れて直列実行するヘルパー
async function withSessionLock<T>(
  sessionId: string,
  operation: (session: { service: FtpService | SftpService; info: SessionInfo; currentPath: string }) => Promise<T>
): Promise<T> {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  // 前の操作の完了を待つ
  await session.lock;
  
  // 新しい操作を実行し、lockを更新
  const promise = operation(session);
  session.lock = promise.catch(() => {});
  
  return promise;
}

// 接続
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const config: ConnectionConfig = req.body;
    
    let service: FtpService | SftpService;
    
    if (config.protocol === 'sftp') {
      service = new SftpService(config);
    } else {
      service = new FtpService(config);
    }
    
    await service.connect();
    const currentPath = await service.pwd();
    
    const sessionId = uuidv4();
    const sessionInfo: SessionInfo = {
      id: sessionId,
      protocol: config.protocol,
      host: config.host,
      username: config.username,
      currentPath,
      connectedAt: new Date().toISOString(),
    };
    
    sessions.set(sessionId, { 
      service, 
      info: sessionInfo, 
      currentPath,
      lock: Promise.resolve(),
    });
    
    // 接続後すぐにファイル一覧を取得して返す
    const files = await service.list(currentPath);
    const sortedFiles = files.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    
    const response: ApiResponse<{ session: SessionInfo; files: FileInfo[] }> = {
      success: true,
      data: { session: sessionInfo, files: sortedFiles },
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
    res.status(500).json(response);
  }
});

// 切断
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const session = sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // 現在の操作が完了するのを待つ
    await session.lock;
    
    await session.service.disconnect();
    sessions.delete(sessionId);
    
    const response: ApiResponse = { success: true };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Disconnect failed',
    };
    res.status(500).json(response);
  }
});

// ファイル一覧取得
router.get('/list', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    const path = (req.query.path as string) || '.';
    
    const files = await withSessionLock(sessionId, async (session) => {
      return session.service.list(path);
    });
    
    // ソート: ディレクトリ優先、その後名前順
    files.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    
    const response: ApiResponse<FileInfo[]> = {
      success: true,
      data: files,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list files',
    };
    res.status(500).json(response);
  }
});

// ディレクトリ移動（ファイル一覧も一緒に返す）
router.post('/cd', async (req: Request, res: Response) => {
  try {
    const { sessionId, path } = req.body;
    
    const result = await withSessionLock(sessionId, async (session) => {
      const newPath = await session.service.cd(path);
      session.currentPath = newPath;
      session.info.currentPath = newPath;
      
      // cdした後、すぐにlist
      const files = await session.service.list(newPath);
      return { path: newPath, files };
    });
    
    // ソート
    result.files.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    
    const response: ApiResponse<{ path: string; files: FileInfo[] }> = {
      success: true,
      data: result,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change directory',
    };
    res.status(500).json(response);
  }
});

// カレントディレクトリ取得
router.get('/pwd', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    
    const path = await withSessionLock(sessionId, async (session) => {
      return session.service.pwd();
    });
    
    const response: ApiResponse<{ path: string }> = {
      success: true,
      data: { path },
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get current directory',
    };
    res.status(500).json(response);
  }
});

// ディレクトリ作成（ファイル一覧も返す）
router.post('/mkdir', async (req: Request, res: Response) => {
  try {
    const { sessionId, path, currentPath } = req.body;
    
    const files = await withSessionLock(sessionId, async (session) => {
      await session.service.mkdir(path);
      const listPath = currentPath || session.currentPath;
      return session.service.list(listPath);
    });
    
    files.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    
    const response: ApiResponse<FileInfo[]> = { 
      success: true,
      data: files,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create directory',
    };
    res.status(500).json(response);
  }
});

// ディレクトリ削除（ファイル一覧も返す）
router.post('/rmdir', async (req: Request, res: Response) => {
  try {
    const { sessionId, path, currentPath } = req.body;
    
    const files = await withSessionLock(sessionId, async (session) => {
      await session.service.rmdir(path);
      const listPath = currentPath || session.currentPath;
      return session.service.list(listPath);
    });
    
    files.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    
    const response: ApiResponse<FileInfo[]> = { 
      success: true,
      data: files,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove directory',
    };
    res.status(500).json(response);
  }
});

// ファイル削除（ファイル一覧も返す）
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const { sessionId, path, currentPath } = req.body;
    
    const files = await withSessionLock(sessionId, async (session) => {
      await session.service.delete(path);
      const listPath = currentPath || session.currentPath;
      return session.service.list(listPath);
    });
    
    files.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    
    const response: ApiResponse<FileInfo[]> = { 
      success: true,
      data: files,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file',
    };
    res.status(500).json(response);
  }
});

// リネーム（ファイル一覧も返す）
router.post('/rename', async (req: Request, res: Response) => {
  try {
    const { sessionId, oldPath, newPath, currentPath } = req.body;
    
    const files = await withSessionLock(sessionId, async (session) => {
      await session.service.rename(oldPath, newPath);
      const listPath = currentPath || session.currentPath;
      return session.service.list(listPath);
    });
    
    files.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    
    const response: ApiResponse<FileInfo[]> = { 
      success: true,
      data: files,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename',
    };
    res.status(500).json(response);
  }
});

// ファイルダウンロード
router.get('/download', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    const remotePath = req.query.path as string;
    
    const fileName = remotePath.split('/').pop() || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    await withSessionLock(sessionId, async (session) => {
      await session.service.downloadToStream(remotePath, res);
    });
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download file',
    };
    res.status(500).json(response);
  }
});

// ファイルアップロード（フォルダ構造対応）
router.post('/upload', upload.array('files'), async (req: Request, res: Response) => {
  try {
    const { sessionId, basePath } = req.body;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }
    
    // 相対パスを取得（relativePaths[0], relativePaths[1], ... の形式）
    const relativePaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const key = `relativePaths[${i}]`;
      relativePaths.push(req.body[key] || files[i].originalname);
    }
    
    const result = await withSessionLock(sessionId, async (session) => {
      const uploadResults: { name: string; success: boolean; error?: string }[] = [];
      const createdDirs = new Set<string>();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = relativePaths[i];
        
        try {
          // リモートパスを構築
          const remotePath = basePath && basePath !== '/' 
            ? `${basePath}/${relativePath}` 
            : `/${relativePath}`;
          
          // ディレクトリ部分を抽出して作成
          const dirPath = remotePath.substring(0, remotePath.lastIndexOf('/'));
          if (dirPath && !createdDirs.has(dirPath)) {
            try {
              await session.service.mkdir(dirPath);
              createdDirs.add(dirPath);
            } catch {
              // ディレクトリが既に存在する場合は無視
            }
          }
          
          await session.service.uploadFromBuffer(remotePath, file.buffer);
          uploadResults.push({ name: relativePath, success: true });
        } catch (err) {
          uploadResults.push({ 
            name: relativePath, 
            success: false, 
            error: err instanceof Error ? err.message : 'Upload failed' 
          });
        }
      }
      
      // アップロード後にファイル一覧を取得
      const listPath = basePath || session.currentPath;
      const fileList = await session.service.list(listPath);
      
      return { uploadResults, files: fileList };
    });
    
    result.files.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    
    const response: ApiResponse<{ uploads: typeof result.uploadResults; files: FileInfo[] }> = {
      success: result.uploadResults.every(r => r.success),
      data: { uploads: result.uploadResults, files: result.files },
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload files',
    };
    res.status(500).json(response);
  }
});

// セッション情報取得
router.get('/session', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    
    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const response: ApiResponse<SessionInfo> = {
      success: true,
      data: session.info,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get session info',
    };
    res.status(500).json(response);
  }
});

export default router;
