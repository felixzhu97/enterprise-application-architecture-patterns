/**
 * 会话状态模式 (Session State Patterns) 实现
 *
 * 这个模块演示了三种主要的会话状态管理模式：
 * 1. Client Session State - 客户端会话状态
 * 2. Server Session State - 服务器端会话状态
 * 3. Database Session State - 数据库会话状态
 *
 * 每种模式都有其适用场景和优缺点
 */

import { Request, Response, NextFunction } from "express";
import { createHash, randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import { Redis } from "ioredis";

// ======================== 会话状态接口定义 ========================

/**
 * 会话数据接口
 */
export interface SessionData {
  userId?: string;
  username?: string;
  email?: string;
  role?: string;
  preferences?: {
    language: string;
    theme: string;
    timezone: string;
  };
  shoppingCart?: {
    items: Array<{
      productId: string;
      quantity: number;
      price: number;
    }>;
    total: number;
  };
  lastActivity?: Date;
  csrfToken?: string;
}

/**
 * 会话状态管理接口
 */
export interface SessionStateManager {
  createSession(data: SessionData): Promise<string>;
  getSession(sessionId: string): Promise<SessionData | null>;
  updateSession(sessionId: string, data: Partial<SessionData>): Promise<void>;
  destroySession(sessionId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;
}

// ======================== 1. 客户端会话状态 (Client Session State) ========================

/**
 * 客户端会话状态管理器
 *
 * 优点：
 * - 服务器无状态，易于扩展
 * - 减少服务器内存使用
 * - 支持负载均衡
 *
 * 缺点：
 * - 数据大小受限（Cookie 4KB限制）
 * - 安全性依赖加密
 * - 每次请求都要传输数据
 */
export class ClientSessionStateManager implements SessionStateManager {
  private readonly secretKey: string;
  private readonly maxAge: number;

  constructor(secretKey: string, maxAge: number = 24 * 60 * 60 * 1000) {
    this.secretKey = secretKey;
    this.maxAge = maxAge;
  }

  /**
   * 创建客户端会话（JWT Token）
   */
  async createSession(data: SessionData): Promise<string> {
    const sessionData = {
      ...data,
      lastActivity: new Date(),
      csrfToken: this.generateCSRFToken(),
    };

    // 使用JWT创建签名的token
    const token = jwt.sign(sessionData, this.secretKey, {
      expiresIn: this.maxAge / 1000,
      issuer: "enterprise-architecture-patterns",
      subject: data.userId,
    });

    return token;
  }

  /**
   * 解析客户端会话
   */
  async getSession(token: string): Promise<SessionData | null> {
    try {
      const decoded = jwt.verify(token, this.secretKey) as SessionData;

      // 检查会话是否过期
      if (decoded.lastActivity) {
        const lastActivity = new Date(decoded.lastActivity);
        const now = new Date();
        if (now.getTime() - lastActivity.getTime() > this.maxAge) {
          return null;
        }
      }

      return decoded;
    } catch (error) {
      console.error("Invalid session token:", error);
      return null;
    }
  }

  /**
   * 更新客户端会话（需要重新生成token）
   */
  async updateSession(
    token: string,
    updateData: Partial<SessionData>
  ): Promise<void> {
    const currentSession = await this.getSession(token);
    if (!currentSession) {
      throw new Error("Invalid session");
    }

    const newSessionData = {
      ...currentSession,
      ...updateData,
      lastActivity: new Date(),
    };

    // 客户端状态需要重新生成token，这里只是演示
    // 实际使用中需要将新token返回给客户端
    console.log("New session token needed for client-side state");
  }

  async destroySession(token: string): Promise<void> {
    // 客户端状态销毁只需要客户端删除token
    // 这里可以维护一个黑名单用于无效化token
    console.log("Session destroyed on client side");
  }

  async cleanupExpiredSessions(): Promise<void> {
    // 客户端状态自动过期，无需清理
    console.log("Client sessions auto-expire");
  }

  private generateCSRFToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Express中间件：从Cookie中提取客户端会话
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const token =
        req.cookies?.sessionToken ||
        req.headers.authorization?.replace("Bearer ", "");

      if (token) {
        try {
          const sessionData = await this.getSession(token);
          if (sessionData) {
            (req as any).session = sessionData;
          }
        } catch (error) {
          console.error("Session middleware error:", error);
        }
      }

      next();
    };
  }
}

// ======================== 2. 服务器端会话状态 (Server Session State) ========================

/**
 * 服务器端会话状态管理器
 *
 * 优点：
 * - 可以存储大量数据
 * - 安全性高（数据不暴露给客户端）
 * - 支持复杂的会话逻辑
 *
 * 缺点：
 * - 占用服务器内存
 * - 扩展性受限
 * - 需要sticky sessions或外部存储
 */
export class ServerSessionStateManager implements SessionStateManager {
  private readonly sessions: Map<string, SessionData> = new Map();
  private readonly maxAge: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxAge: number = 30 * 60 * 1000) {
    // 30分钟默认
    this.maxAge = maxAge;

    // 定期清理过期会话
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  /**
   * 创建服务器端会话
   */
  async createSession(data: SessionData): Promise<string> {
    const sessionId = this.generateSessionId();
    const sessionData = {
      ...data,
      lastActivity: new Date(),
      csrfToken: this.generateCSRFToken(),
    };

    this.sessions.set(sessionId, sessionData);
    console.log(`Created server session: ${sessionId}`);

    return sessionId;
  }

  /**
   * 获取服务器端会话
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // 检查会话是否过期
    if (session.lastActivity) {
      const lastActivity = new Date(session.lastActivity);
      const now = new Date();
      if (now.getTime() - lastActivity.getTime() > this.maxAge) {
        this.sessions.delete(sessionId);
        return null;
      }
    }

    // 更新最后活动时间
    session.lastActivity = new Date();
    return session;
  }

  /**
   * 更新服务器端会话
   */
  async updateSession(
    sessionId: string,
    updateData: Partial<SessionData>
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const updatedSession = {
      ...session,
      ...updateData,
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, updatedSession);
    console.log(`Updated server session: ${sessionId}`);
  }

  /**
   * 销毁服务器端会话
   */
  async destroySession(sessionId: string): Promise<void> {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`Destroyed server session: ${sessionId}`);
    }
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity) {
        const lastActivity = new Date(session.lastActivity);
        if (now.getTime() - lastActivity.getTime() > this.maxAge) {
          this.sessions.delete(sessionId);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired server sessions`);
    }
  }

  private generateSessionId(): string {
    return randomBytes(32).toString("hex");
  }

  private generateCSRFToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(
        (session) =>
          session.lastActivity &&
          new Date().getTime() - new Date(session.lastActivity).getTime() <
            5 * 60 * 1000
      ).length,
    };
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }
}

// ======================== 3. 数据库会话状态 (Database Session State) ========================

/**
 * 数据库会话状态管理器
 *
 * 优点：
 * - 高可用性和持久性
 * - 支持多服务器共享
 * - 可以存储大量数据
 * - 支持复杂查询和分析
 *
 * 缺点：
 * - 性能相对较低
 * - 增加数据库负载
 * - 需要额外的数据库表
 */
export class DatabaseSessionStateManager implements SessionStateManager {
  private readonly redis: Redis;
  private readonly keyPrefix: string;
  private readonly maxAge: number;

  constructor(
    redis: Redis,
    keyPrefix: string = "session:",
    maxAge: number = 30 * 60
  ) {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
    this.maxAge = maxAge; // 秒为单位
  }

  /**
   * 创建数据库会话
   */
  async createSession(data: SessionData): Promise<string> {
    const sessionId = this.generateSessionId();
    const sessionKey = this.keyPrefix + sessionId;

    const sessionData = {
      ...data,
      lastActivity: new Date().toISOString(),
      csrfToken: this.generateCSRFToken(),
    };

    // 存储到Redis，设置过期时间
    await this.redis.setex(
      sessionKey,
      this.maxAge,
      JSON.stringify(sessionData)
    );

    console.log(`Created database session: ${sessionId}`);
    return sessionId;
  }

  /**
   * 获取数据库会话
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const sessionKey = this.keyPrefix + sessionId;

    try {
      const sessionDataStr = await this.redis.get(sessionKey);

      if (!sessionDataStr) {
        return null;
      }

      const sessionData = JSON.parse(sessionDataStr) as SessionData;

      // 更新最后活动时间和过期时间
      sessionData.lastActivity = new Date();
      await this.redis.setex(
        sessionKey,
        this.maxAge,
        JSON.stringify(sessionData)
      );

      return sessionData;
    } catch (error) {
      console.error("Error getting database session:", error);
      return null;
    }
  }

  /**
   * 更新数据库会话
   */
  async updateSession(
    sessionId: string,
    updateData: Partial<SessionData>
  ): Promise<void> {
    const sessionKey = this.keyPrefix + sessionId;

    try {
      const currentSessionStr = await this.redis.get(sessionKey);

      if (!currentSessionStr) {
        throw new Error("Session not found");
      }

      const currentSession = JSON.parse(currentSessionStr) as SessionData;
      const updatedSession = {
        ...currentSession,
        ...updateData,
        lastActivity: new Date(),
      };

      await this.redis.setex(
        sessionKey,
        this.maxAge,
        JSON.stringify(updatedSession)
      );

      console.log(`Updated database session: ${sessionId}`);
    } catch (error) {
      console.error("Error updating database session:", error);
      throw error;
    }
  }

  /**
   * 销毁数据库会话
   */
  async destroySession(sessionId: string): Promise<void> {
    const sessionKey = this.keyPrefix + sessionId;

    try {
      const deleted = await this.redis.del(sessionKey);

      if (deleted > 0) {
        console.log(`Destroyed database session: ${sessionId}`);
      }
    } catch (error) {
      console.error("Error destroying database session:", error);
      throw error;
    }
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(): Promise<void> {
    // Redis会自动过期，但我们可以主动清理一些数据
    try {
      const pattern = this.keyPrefix + "*";
      const keys = await this.redis.keys(pattern);

      let cleanedCount = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired database sessions`);
      }
    } catch (error) {
      console.error("Error cleaning up expired sessions:", error);
    }
  }

  private generateSessionId(): string {
    return randomBytes(32).toString("hex");
  }

  private generateCSRFToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * 获取会话统计信息
   */
  async getSessionStats() {
    try {
      const pattern = this.keyPrefix + "*";
      const keys = await this.redis.keys(pattern);

      let activeSessions = 0;
      const now = new Date();

      for (const key of keys) {
        const sessionStr = await this.redis.get(key);
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr) as SessionData;
            if (session.lastActivity) {
              const lastActivity = new Date(session.lastActivity);
              if (now.getTime() - lastActivity.getTime() < 5 * 60 * 1000) {
                activeSessions++;
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      return {
        totalSessions: keys.length,
        activeSessions,
      };
    } catch (error) {
      console.error("Error getting session stats:", error);
      return { totalSessions: 0, activeSessions: 0 };
    }
  }

  /**
   * 获取所有活跃用户
   */
  async getActiveUsers(): Promise<string[]> {
    try {
      const pattern = this.keyPrefix + "*";
      const keys = await this.redis.keys(pattern);
      const activeUsers: string[] = [];
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      for (const key of keys) {
        const sessionStr = await this.redis.get(key);
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr) as SessionData;
            if (
              session.userId &&
              session.lastActivity &&
              new Date(session.lastActivity) > fiveMinutesAgo
            ) {
              activeUsers.push(session.userId);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      return [...new Set(activeUsers)]; // 去重
    } catch (error) {
      console.error("Error getting active users:", error);
      return [];
    }
  }
}

// ======================== 会话状态工厂 ========================

/**
 * 会话状态管理器工厂
 */
export class SessionStateFactory {
  static createClientSessionManager(
    secretKey: string,
    maxAge?: number
  ): ClientSessionStateManager {
    return new ClientSessionStateManager(secretKey, maxAge);
  }

  static createServerSessionManager(
    maxAge?: number
  ): ServerSessionStateManager {
    return new ServerSessionStateManager(maxAge);
  }

  static createDatabaseSessionManager(
    redis: Redis,
    keyPrefix?: string,
    maxAge?: number
  ): DatabaseSessionStateManager {
    return new DatabaseSessionStateManager(redis, keyPrefix, maxAge);
  }
}

// ======================== 使用示例和最佳实践 ========================

/**
 * 会话状态使用示例
 */
export class SessionStateExample {
  private clientManager: ClientSessionStateManager;
  private serverManager: ServerSessionStateManager;
  private databaseManager: DatabaseSessionStateManager;

  constructor(secretKey: string, redis: Redis) {
    this.clientManager =
      SessionStateFactory.createClientSessionManager(secretKey);
    this.serverManager = SessionStateFactory.createServerSessionManager();
    this.databaseManager =
      SessionStateFactory.createDatabaseSessionManager(redis);
  }

  /**
   * 演示不同会话状态模式的使用
   */
  async demonstrateSessionPatterns() {
    const userData: SessionData = {
      userId: "user-123",
      username: "john_doe",
      email: "john@example.com",
      role: "user",
      preferences: {
        language: "zh-CN",
        theme: "dark",
        timezone: "Asia/Shanghai",
      },
    };

    console.log("=== 会话状态模式演示 ===");

    // 1. 客户端会话状态
    console.log("\n1. 客户端会话状态 (JWT Token):");
    const clientToken = await this.clientManager.createSession(userData);
    console.log("Token长度:", clientToken.length);

    const clientSession = await this.clientManager.getSession(clientToken);
    console.log("获取的会话数据:", clientSession?.username);

    // 2. 服务器端会话状态
    console.log("\n2. 服务器端会话状态 (内存):");
    const serverSessionId = await this.serverManager.createSession(userData);
    console.log("Session ID:", serverSessionId);

    const serverSession = await this.serverManager.getSession(serverSessionId);
    console.log("获取的会话数据:", serverSession?.username);

    console.log("服务器会话统计:", this.serverManager.getSessionStats());

    // 3. 数据库会话状态
    console.log("\n3. 数据库会话状态 (Redis):");
    const dbSessionId = await this.databaseManager.createSession(userData);
    console.log("Session ID:", dbSessionId);

    const dbSession = await this.databaseManager.getSession(dbSessionId);
    console.log("获取的会话数据:", dbSession?.username);

    console.log(
      "数据库会话统计:",
      await this.databaseManager.getSessionStats()
    );

    // 演示会话更新
    console.log("\n=== 会话更新演示 ===");

    await this.serverManager.updateSession(serverSessionId, {
      preferences: { ...userData.preferences!, theme: "light" },
    });

    const updatedSession = await this.serverManager.getSession(serverSessionId);
    console.log("更新后的主题:", updatedSession?.preferences?.theme);
  }

  /**
   * 选择会话状态模式的指导原则
   */
  getSessionPatternGuidelines(): string {
    return `
    会话状态模式选择指南：
    
    1. 客户端会话状态 (Client Session State)
       适用场景：
       - 无状态应用
       - 微服务架构
       - 负载均衡环境
       - 会话数据量小（<4KB）
       
       注意事项：
       - 数据加密和签名
       - 敏感信息不要存储在客户端
       - 考虑token刷新机制
    
    2. 服务器端会话状态 (Server Session State)
       适用场景：
       - 单体应用
       - 会话数据量大
       - 需要复杂的会话逻辑
       - 对性能要求高的场景
       
       注意事项：
       - 内存使用限制
       - 服务器重启会丢失会话
       - 扩展性受限
    
    3. 数据库会话状态 (Database Session State)
       适用场景：
       - 分布式系统
       - 高可用性要求
       - 需要会话持久化
       - 多服务器共享会话
       
       注意事项：
       - 数据库性能影响
       - 网络延迟
       - 需要定期清理过期数据
    
    最佳实践：
    - 根据应用特点选择合适的模式
    - 可以组合使用多种模式
    - 考虑安全性和性能平衡
    - 实现适当的过期和清理机制
    `;
  }
}

export default {
  SessionStateFactory,
  ClientSessionStateManager,
  ServerSessionStateManager,
  DatabaseSessionStateManager,
  SessionStateExample,
};
