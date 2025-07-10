/**
 * 限流中间件
 * 演示API限流和安全防护
 */

import { Request, Response, NextFunction } from "express";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

/**
 * 简化的限流实现
 */
class SimpleRateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(private config: RateLimitConfig) {}

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || "unknown";
    const now = Date.now();

    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    const userRequests = this.requests.get(identifier)!;

    // 清理过期请求
    const validRequests = userRequests.filter(
      (timestamp) => now - timestamp < this.config.windowMs
    );

    if (validRequests.length >= this.config.maxRequests) {
      res.status(429).json({
        success: false,
        message: this.config.message,
      });
      return;
    }

    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    next();
  };
}

export const rateLimiter = {
  // 通用API限流
  apiLimiter: new SimpleRateLimiter({
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 100,
    message: "Too many requests, please try again later",
  }).middleware,

  // 登录限流
  loginLimiter: new SimpleRateLimiter({
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: 5,
    message: "Too many login attempts, please try again later",
  }).middleware,

  // 注册限流
  createAccountLimiter: new SimpleRateLimiter({
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 3,
    message: "Too many accounts created, please try again later",
  }).middleware,

  // 密码重置限流
  passwordResetLimiter: new SimpleRateLimiter({
    windowMs: 60 * 60 * 1000, // 1小时
    maxRequests: 3,
    message: "Too many password reset attempts, please try again later",
  }).middleware,
};
