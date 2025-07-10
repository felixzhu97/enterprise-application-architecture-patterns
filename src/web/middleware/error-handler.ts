/**
 * 错误处理中间件
 * 演示统一错误处理策略
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../../infrastructure/config/logger";

/**
 * 应用错误类
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 业务逻辑错误
 */
export class BusinessError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422);
    this.details = details;
  }

  public readonly details?: any;
}

/**
 * 未授权错误
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "未授权访问") {
    super(message, 401);
  }
}

/**
 * 禁止访问错误
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "禁止访问") {
    super(message, 403);
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "资源") {
    super(`${resource}未找到`, 404);
  }
}

/**
 * 冲突错误
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

/**
 * 统一错误处理中间件
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 记录错误日志
  logger.error("应用错误", err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // 如果是已知的应用错误
  if (err instanceof AppError) {
    const response = {
      error: {
        message: err.message,
        type: err.constructor.name,
        statusCode: err.statusCode,
      },
      timestamp: new Date().toISOString(),
      path: req.url,
    };

    // 如果是验证错误，添加详细信息
    if (err instanceof ValidationError && err.details) {
      (response.error as any).details = err.details;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // 处理 Mongoose 验证错误
  if (err.name === "ValidationError") {
    const validationError = new ValidationError(
      "数据验证失败",
      extractValidationErrors(err)
    );
    res.status(validationError.statusCode).json({
      error: {
        message: validationError.message,
        type: "ValidationError",
        statusCode: validationError.statusCode,
        details: validationError.details,
      },
      timestamp: new Date().toISOString(),
      path: req.url,
    });
    return;
  }

  // 处理 JWT 错误
  if (err.name === "JsonWebTokenError") {
    const jwtError = new UnauthorizedError("无效的访问令牌");
    res.status(jwtError.statusCode).json({
      error: {
        message: jwtError.message,
        type: "UnauthorizedError",
        statusCode: jwtError.statusCode,
      },
      timestamp: new Date().toISOString(),
      path: req.url,
    });
    return;
  }

  if (err.name === "TokenExpiredError") {
    const expiredError = new UnauthorizedError("访问令牌已过期");
    res.status(expiredError.statusCode).json({
      error: {
        message: expiredError.message,
        type: "UnauthorizedError",
        statusCode: expiredError.statusCode,
      },
      timestamp: new Date().toISOString(),
      path: req.url,
    });
    return;
  }

  // 处理数据库连接错误
  if (
    err.name === "MongoNetworkError" ||
    err.message.includes("ECONNREFUSED")
  ) {
    res.status(503).json({
      error: {
        message: "数据库连接失败，请稍后重试",
        type: "ServiceUnavailableError",
        statusCode: 503,
      },
      timestamp: new Date().toISOString(),
      path: req.url,
    });
    return;
  }

  // 默认的服务器内部错误
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(500).json({
    error: {
      message: isDevelopment ? err.message : "服务器内部错误",
      type: "InternalServerError",
      statusCode: 500,
      ...(isDevelopment && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
    path: req.url,
  });
}

/**
 * 提取验证错误详情
 */
function extractValidationErrors(err: any): any {
  const errors: any = {};

  if (err.errors) {
    Object.keys(err.errors).forEach((key) => {
      errors[key] = err.errors[key].message;
    });
  }

  return errors;
}

/**
 * 异步错误处理包装器
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError(`路径 ${req.originalUrl}`);
  next(error);
}
