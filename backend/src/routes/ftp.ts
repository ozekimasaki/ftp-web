import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { FtpService } from '../services/ftp.service';
import { SftpService } from '../services/sftp.service';
import { ConnectionConfig, SessionInfo, ApiResponse, FileInfo, IFileService } from '../types';
import { sortFiles, buildRemotePath } from '../utils/file.utils';
import { sessionManager, Session } from '../utils/session.manager';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * プロトコルに応じたサービスを作成
 */
function createService(config: ConnectionConfig): IFileService {
  if (config.protocol === 'sftp') {
    return new SftpService(config);
  }
  return new FtpService(config);
}

/**
 * ファイル一覧を取得してソート
 */
async function getAndSortFiles(service: IFileService, path: string): Promise<FileInfo[]> {
  const files = await service.list(path);
  return sortFiles(files);
}

// 接続
router.post('/connect', asyncHandler(async (req: Request, res: Response) => {
  const config: ConnectionConfig = req.body;
  const service = createService(config);

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

  const session: Session = {
    service,
    info: sessionInfo,
    currentPath,
    lock: Promise.resolve(),
  };
  sessionManager.create(sessionId, session);

  // 接続後すぐにファイル一覧を取得して返す
  const files = await getAndSortFiles(service, currentPath);

  const response: ApiResponse<{ session: SessionInfo; files: FileInfo[] }> = {
    success: true,
    data: { session: sessionInfo, files },
  };
  res.json(response);
}));

// 切断
router.post('/disconnect', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  const session = sessionManager.get(sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  // 現在の操作が完了するのを待つ
  await session.lock;

  await session.service.disconnect();
  sessionManager.delete(sessionId);

  const response: ApiResponse = { success: true };
  res.json(response);
}));

// ファイル一覧取得
router.get('/list', asyncHandler(async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const path = (req.query.path as string) || '.';

  const files = await sessionManager.withLock(sessionId, async (session) => {
    return getAndSortFiles(session.service, path);
  });

  const response: ApiResponse<FileInfo[]> = {
    success: true,
    data: files,
  };
  res.json(response);
}));

// ディレクトリ移動（ファイル一覧も一緒に返す）
router.post('/cd', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, path } = req.body;

  const result = await sessionManager.withLock(sessionId, async (session) => {
    const newPath = await session.service.cd(path);
    session.currentPath = newPath;
    session.info.currentPath = newPath;

    const files = await getAndSortFiles(session.service, newPath);
    return { path: newPath, files };
  });

  const response: ApiResponse<{ path: string; files: FileInfo[] }> = {
    success: true,
    data: result,
  };
  res.json(response);
}));

// カレントディレクトリ取得
router.get('/pwd', asyncHandler(async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  const path = await sessionManager.withLock(sessionId, async (session) => {
    return session.service.pwd();
  });

  const response: ApiResponse<{ path: string }> = {
    success: true,
    data: { path },
  };
  res.json(response);
}));

// ディレクトリ作成（ファイル一覧も返す）
router.post('/mkdir', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, path, currentPath } = req.body;

  const files = await sessionManager.withLock(sessionId, async (session) => {
    await session.service.mkdir(path);
    const listPath = currentPath || session.currentPath;
    return getAndSortFiles(session.service, listPath);
  });

  const response: ApiResponse<FileInfo[]> = {
    success: true,
    data: files,
  };
  res.json(response);
}));

// ディレクトリ削除（ファイル一覧も返す）
router.post('/rmdir', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, path, currentPath } = req.body;

  const files = await sessionManager.withLock(sessionId, async (session) => {
    await session.service.rmdir(path);
    const listPath = currentPath || session.currentPath;
    return getAndSortFiles(session.service, listPath);
  });

  const response: ApiResponse<FileInfo[]> = {
    success: true,
    data: files,
  };
  res.json(response);
}));

// ファイル削除（ファイル一覧も返す）
router.post('/delete', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, path, currentPath } = req.body;

  const files = await sessionManager.withLock(sessionId, async (session) => {
    await session.service.delete(path);
    const listPath = currentPath || session.currentPath;
    return getAndSortFiles(session.service, listPath);
  });

  const response: ApiResponse<FileInfo[]> = {
    success: true,
    data: files,
  };
  res.json(response);
}));

// リネーム（ファイル一覧も返す）
router.post('/rename', asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, oldPath, newPath, currentPath } = req.body;

  const files = await sessionManager.withLock(sessionId, async (session) => {
    await session.service.rename(oldPath, newPath);
    const listPath = currentPath || session.currentPath;
    return getAndSortFiles(session.service, listPath);
  });

  const response: ApiResponse<FileInfo[]> = {
    success: true,
    data: files,
  };
  res.json(response);
}));

// ファイルダウンロード
router.get('/download', asyncHandler(async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const remotePath = req.query.path as string;

  const fileName = remotePath.split('/').pop() || 'download';
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  await sessionManager.withLock(sessionId, async (session) => {
    await session.service.downloadToStream(remotePath, res);
  });
}));

// ファイルアップロード（フォルダ構造対応）
router.post('/upload', upload.array('files'), asyncHandler(async (req: Request, res: Response) => {
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

  const result = await sessionManager.withLock(sessionId, async (session) => {
    const uploadResults: { name: string; success: boolean; error?: string }[] = [];
    const createdDirs = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = relativePaths[i];

      try {
        // リモートパスを構築
        const remotePath = buildRemotePath(basePath, relativePath);

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
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    }

    // アップロード後にファイル一覧を取得
    const listPath = basePath || session.currentPath;
    const fileList = await getAndSortFiles(session.service, listPath);

    return { uploadResults, files: fileList };
  });

  const response: ApiResponse<{ uploads: typeof result.uploadResults; files: FileInfo[] }> = {
    success: result.uploadResults.every((r) => r.success),
    data: { uploads: result.uploadResults, files: result.files },
  };
  res.json(response);
}));

// セッション情報取得
router.get('/session', asyncHandler(async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  const session = sessionManager.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const response: ApiResponse<SessionInfo> = {
    success: true,
    data: session.info,
  };
  res.json(response);
}));

export default router;
