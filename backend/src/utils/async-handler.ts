import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ApiResponse } from '../types';

/**
 * 非同期ルートハンドラーをラップしてエラーハンドリングを共通化
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      };
      res.status(500).json(response);
    });
  };
}

