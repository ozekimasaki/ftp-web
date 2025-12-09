import { IFileService, SessionInfo } from '../types';

/**
 * セッション情報の型定義
 */
export interface Session {
  service: IFileService;
  info: SessionInfo;
  currentPath: string;
  lock: Promise<unknown>;
}

/**
 * FTP/SFTP セッション管理クラス
 */
export class SessionManager {
  private sessions = new Map<string, Session>();

  /**
   * セッションを作成
   */
  create(sessionId: string, session: Session): void {
    this.sessions.set(sessionId, session);
  }

  /**
   * セッションを取得
   */
  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * セッションを削除
   */
  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * セッションが存在するか確認
   */
  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * セッションの操作をロック付きで実行
   */
  async withLock<T>(
    sessionId: string,
    operation: (session: Session) => Promise<T>
  ): Promise<T> {
    const session = this.sessions.get(sessionId);
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
}

// シングルトンインスタンス
export const sessionManager = new SessionManager();

