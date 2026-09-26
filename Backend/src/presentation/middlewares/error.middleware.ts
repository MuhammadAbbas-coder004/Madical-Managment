import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Always log the full error so it appears in the terminal
  console.error('\n--- Unhandled Error ---');
  console.error('Message :', err?.message);
  console.error('Stack   :', err?.stack);
  console.error('-----------------------\n');

  // Multer errors (wrong file type, size exceeded, unexpected field, etc.)
  // arrive here via next(err) from multer middleware – return 400 with the
  // real message so the client knows exactly what went wrong.
  if (err instanceof MulterError) {
    res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
    return;
  }

  // Custom errors thrown with a message (e.g. unsupported mime type)
  if (err?.message === 'Only PDF, JPG, JPEG, and PNG files are allowed') {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  const statusCode: number = typeof err?.statusCode === 'number' ? err.statusCode : 500;
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(statusCode).json({
    success: false,
    message: isDev ? (err?.message || 'Internal Server Error') : 'Internal Server Error',
    ...(isDev && err?.stack ? { stack: err.stack } : {}),
  });
};
