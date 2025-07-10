/**
 * CSRF 保护中间件
 * 演示安全防护机制
 */

import { Request, Response, NextFunction } from "express";

/**
 * CSRF 保护中间件
 */
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 简化的CSRF实现
  if (
    req.method === "POST" ||
    req.method === "PUT" ||
    req.method === "DELETE"
  ) {
    const token = req.body._csrf || req.headers["x-csrf-token"];
    const sessionToken = req.session?.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
      res.status(403).json({
        success: false,
        message: "CSRF token validation failed",
      });
      return;
    }
  }

  next();
};
