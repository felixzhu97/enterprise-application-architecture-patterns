/**
 * 认证中间件
 * 演示认证和授权机制
 */

import { Request, Response, NextFunction } from "express";
import { BusinessError } from "./error-handler";

/**
 * 扩展会话类型
 */
declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      email: string;
      role: string;
    };
  }
}

/**
 * 检查用户是否已认证
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.session?.user) {
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      // API 请求返回 JSON
      res.status(401).json({
        success: false,
        message: "需要登录才能访问此资源",
      });
    } else {
      // Web 请求重定向到登录页
      const returnUrl = encodeURIComponent(req.originalUrl);
      res.redirect(`/login?returnUrl=${returnUrl}`);
    }
    return;
  }

  next();
};

/**
 * 检查用户角色权限
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.user) {
      throw new BusinessError("需要登录", 401);
    }

    const userRole = req.session.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      if (req.xhr || req.headers.accept?.includes("application/json")) {
        res.status(403).json({
          success: false,
          message: "权限不足",
        });
      } else {
        throw new BusinessError("权限不足", 403);
      }
      return;
    }

    next();
  };
};

/**
 * 可选认证中间件
 * 如果有会话则加载用户信息，但不强制要求登录
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 设置模板变量
  res.locals.currentUser = req.session?.user || null;
  res.locals.isAuthenticated = !!req.session?.user;

  next();
};

/**
 * 管理员权限中间件
 */
export const requireAdmin = requireRole("admin");

/**
 * 管理员或经理权限中间件
 */
export const requireManager = requireRole(["admin", "manager"]);

/**
 * 检查用户是否为资源所有者或管理员
 */
export const requireOwnerOrAdmin = (getUserId: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.user) {
      throw new BusinessError("需要登录", 401);
    }

    const currentUserId = req.session.user.id;
    const currentUserRole = req.session.user.role;
    const resourceUserId = getUserId(req);

    // 管理员可以访问所有资源
    if (currentUserRole === "admin") {
      next();
      return;
    }

    // 用户只能访问自己的资源
    if (currentUserId === resourceUserId) {
      next();
      return;
    }

    throw new BusinessError("权限不足", 403);
  };
};

/**
 * API 密钥认证中间件（用于外部API调用）
 */
export const requireApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    res.status(401).json({
      success: false,
      message: "缺少API密钥",
    });
    return;
  }

  // 验证API密钥（这里简化实现）
  const validApiKeys = process.env.VALID_API_KEYS?.split(",") || [];

  if (!validApiKeys.includes(apiKey)) {
    res.status(401).json({
      success: false,
      message: "API密钥无效",
    });
    return;
  }

  next();
};

/**
 * JWT 令牌认证中间件（用于移动端API）
 */
export const requireJwtToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "缺少或格式错误的认证令牌",
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    // 这里应该验证JWT令牌
    // const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    // req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "令牌无效或已过期",
    });
  }
};
