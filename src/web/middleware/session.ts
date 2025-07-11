/**
 * 会话管理中间件
 * 演示 Session State 模式
 *
 * Session State 模式管理用户会话状态，支持：
 * - Client Session State（客户端状态）
 * - Server Session State（服务器端状态）
 * - Database Session State（数据库状态）
 */

import { Application } from "express";
import session from "express-session";
import ConnectRedis from "connect-redis";
import { createClient } from "redis";
import { logger } from "../../infrastructure/config/logger";

/**
 * 会话数据接口
 */
export interface SessionData {
  userId?: string;
  username?: string;
  role?: string;
  loginTime?: Date;
  lastActivity?: Date;
  isAuthenticated?: boolean;
  shoppingCart?: ShoppingCartSession;
  preferences?: UserPreferences;
  temporaryData?: { [key: string]: any };
}

/**
 * 购物车会话数据
 */
export interface ShoppingCartSession {
  items: CartItem[];
  totalAmount: number;
  currency: string;
  lastUpdated: Date;
}

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  language: string;
  theme: "light" | "dark";
  timezone: string;
  currency: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

/**
 * 会话管理器
 * 演示不同的会话状态存储策略
 */
export class SessionManager {
  private redisClient: any;

  constructor() {
    this.initializeRedis();
  }

  /**
   * 初始化 Redis 客户端
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redisClient = createClient({
        socket: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379", 10),
        },
        password: process.env.REDIS_PASSWORD || undefined,
      });

      await this.redisClient.connect();
      logger.info("Redis 客户端连接成功");
    } catch (error) {
      logger.error("Redis 连接失败", error as Error);
      throw error;
    }
  }

  /**
   * 获取会话数据
   */
  async getSessionData(sessionId: string): Promise<SessionData | null> {
    try {
      const data = await this.redisClient.get(`session:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error("获取会话数据失败", error as Error, { sessionId });
      return null;
    }
  }

  /**
   * 保存会话数据
   */
  async saveSessionData(
    sessionId: string,
    data: SessionData,
    ttl: number = 3600
  ): Promise<void> {
    try {
      const serializedData = JSON.stringify({
        ...data,
        lastActivity: new Date(),
      });

      await this.redisClient.setEx(`session:${sessionId}`, ttl, serializedData);
      logger.debug("会话数据已保存", { sessionId });
    } catch (error) {
      logger.error("保存会话数据失败", error as Error, { sessionId });
      throw error;
    }
  }

  /**
   * 删除会话数据
   */
  async deleteSessionData(sessionId: string): Promise<void> {
    try {
      await this.redisClient.del(`session:${sessionId}`);
      logger.debug("会话数据已删除", { sessionId });
    } catch (error) {
      logger.error("删除会话数据失败", error as Error, { sessionId });
      throw error;
    }
  }

  /**
   * 清理过期会话
   */
  async cleanExpiredSessions(): Promise<void> {
    try {
      const keys = await this.redisClient.keys("session:*");
      let cleanedCount = 0;

      for (const key of keys) {
        const ttl = await this.redisClient.ttl(key);
        if (ttl === -1) {
          // 没有过期时间的键
          await this.redisClient.expire(key, 3600); // 设置1小时过期
          cleanedCount++;
        }
      }

      logger.info(`清理了 ${cleanedCount} 个过期会话`);
    } catch (error) {
      logger.error("清理过期会话失败", error as Error);
    }
  }
}

// 全局会话管理器实例
export const sessionManager = new SessionManager();

/**
 * 设置会话中间件
 */
export function setupSession(app: Application): void {
  // 检查是否有Redis配置，如果没有则使用内存存储
  const useRedis = process.env.REDIS_HOST && process.env.REDIS_HOST !== "";

  let sessionStore: any;

  if (useRedis) {
    try {
      // 创建 Redis 客户端
      const redisClient = createClient({
        socket: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379", 10),
        },
        password: process.env.REDIS_PASSWORD || undefined,
      });

      // 连接Redis（同步等待）
      redisClient.connect().catch((err: any) => {
        logger.error("Session Redis 连接失败，将使用内存存储", err);
      });

      // 创建 Redis 存储
      const RedisStore = new (ConnectRedis as any)(session);
      sessionStore = new RedisStore({ client: redisClient });

      logger.info("使用Redis作为会话存储");
    } catch (error) {
      logger.error("Redis配置失败，使用内存存储", error as Error);
      sessionStore = undefined; // 使用默认内存存储
    }
  } else {
    logger.info("未配置Redis，使用内存存储");
    sessionStore = undefined; // 使用默认内存存储
  }

  // 配置会话中间件
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "default-secret-key",
      name: "ecommerce.session",
      resave: false,
      saveUninitialized: false,
      rolling: true, // 每次请求都重新设置过期时间
      cookie: {
        secure: process.env.NODE_ENV === "production", // HTTPS 环境下启用
        httpOnly: true, // 防止 XSS 攻击
        maxAge: parseInt(process.env.SESSION_MAX_AGE || "86400000", 10), // 24小时
        sameSite: "strict", // CSRF 保护
      },
    })
  );

  // 会话活动跟踪中间件
  app.use((req, res, next) => {
    if (req.session && req.session.user) {
      // 更新最后活动时间
      (req.session as any).lastActivity = new Date();

      // 记录用户活动
      logger.debug("用户会话活动", {
        userId: req.session.user.id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        url: req.url,
      });
    }
    next();
  });

  // 定期清理过期会话
  setInterval(() => {
    sessionManager.cleanExpiredSessions();
  }, 60 * 60 * 1000); // 每小时清理一次
}

/**
 * 会话辅助函数
 */
export class SessionHelper {
  /**
   * 设置用户登录会话
   */
  static setUserSession(req: any, user: any): void {
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.loginTime = new Date();
    req.session.lastActivity = new Date();
    req.session.isAuthenticated = true;
  }

  /**
   * 清除用户会话
   */
  static clearUserSession(req: any): void {
    req.session.userId = undefined;
    req.session.username = undefined;
    req.session.role = undefined;
    req.session.loginTime = undefined;
    req.session.isAuthenticated = false;
  }

  /**
   * 检查用户是否已登录
   */
  static isAuthenticated(req: any): boolean {
    return !!(req.session && req.session.isAuthenticated && req.session.userId);
  }

  /**
   * 获取购物车数据
   */
  static getShoppingCart(req: any): ShoppingCartSession {
    if (!req.session.shoppingCart) {
      req.session.shoppingCart = {
        items: [],
        totalAmount: 0,
        currency: "CNY",
        lastUpdated: new Date(),
      };
    }
    return req.session.shoppingCart;
  }

  /**
   * 添加商品到购物车
   */
  static addToCart(req: any, item: CartItem): void {
    const cart = this.getShoppingCart(req);

    // 检查商品是否已存在
    const existingItem = cart.items.find((i) => i.productId === item.productId);

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      cart.items.push(item);
    }

    // 重新计算总金额
    cart.totalAmount = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    cart.lastUpdated = new Date();
    req.session.shoppingCart = cart;
  }

  /**
   * 从购物车移除商品
   */
  static removeFromCart(req: any, productId: string): void {
    const cart = this.getShoppingCart(req);
    cart.items = cart.items.filter((item) => item.productId !== productId);

    // 重新计算总金额
    cart.totalAmount = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    cart.lastUpdated = new Date();
    req.session.shoppingCart = cart;
  }

  /**
   * 清空购物车
   */
  static clearCart(req: any): void {
    req.session.shoppingCart = {
      items: [],
      totalAmount: 0,
      currency: "CNY",
      lastUpdated: new Date(),
    };
  }

  /**
   * 设置用户偏好
   */
  static setUserPreferences(
    req: any,
    preferences: Partial<UserPreferences>
  ): void {
    if (!req.session.preferences) {
      req.session.preferences = {
        language: "zh-CN",
        theme: "light",
        timezone: "Asia/Shanghai",
        currency: "CNY",
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
      };
    }

    Object.assign(req.session.preferences, preferences);
  }

  /**
   * 获取用户偏好
   */
  static getUserPreferences(req: any): UserPreferences {
    return (
      req.session.preferences || {
        language: "zh-CN",
        theme: "light",
        timezone: "Asia/Shanghai",
        currency: "CNY",
        notifications: {
          email: true,
          sms: false,
          push: true,
        },
      }
    );
  }

  /**
   * 设置临时数据
   */
  static setTemporaryData(req: any, key: string, value: any): void {
    if (!req.session.temporaryData) {
      req.session.temporaryData = {};
    }
    req.session.temporaryData[key] = value;
  }

  /**
   * 获取并清除临时数据
   */
  static getAndClearTemporaryData(req: any, key: string): any {
    if (!req.session.temporaryData) {
      return undefined;
    }

    const value = req.session.temporaryData[key];
    delete req.session.temporaryData[key];
    return value;
  }
}
