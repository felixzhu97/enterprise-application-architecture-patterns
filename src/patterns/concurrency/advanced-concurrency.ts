/**
 * 高级并发模式 (Advanced Concurrency Patterns)
 *
 * 扩展并发控制机制，包含：
 * 1. Coarse-Grained Lock - 粗粒度锁
 * 2. Implicit Lock - 隐式锁
 * 3. Lock Manager - 锁管理器
 * 4. Deadlock Detection - 死锁检测
 */

import { DatabaseConnection } from "../../infrastructure/database/data-source";

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * 锁类型枚举
 */
enum LockType {
  SHARED = "SHARED", // 共享锁（读锁）
  EXCLUSIVE = "EXCLUSIVE", // 排他锁（写锁）
}

/**
 * 锁粒度枚举
 */
enum LockGranularity {
  ROW = "ROW", // 行级锁
  TABLE = "TABLE", // 表级锁
  DATABASE = "DATABASE", // 数据库级锁
  OBJECT = "OBJECT", // 对象级锁
  AGGREGATE = "AGGREGATE", // 聚合级锁
}

/**
 * 锁状态枚举
 */
enum LockStatus {
  ACQUIRED = "ACQUIRED", // 已获取
  WAITING = "WAITING", // 等待中
  TIMEOUT = "TIMEOUT", // 超时
  DEADLOCK = "DEADLOCK", // 死锁
}

/**
 * 锁信息接口
 */
interface LockInfo {
  id: string;
  resourceId: string;
  sessionId: string;
  lockType: LockType;
  granularity: LockGranularity;
  status: LockStatus;
  acquiredAt: Date;
  expiresAt?: Date;
  waitingSince?: Date;
}

/**
 * 事务会话接口
 */
interface TransactionSession {
  id: string;
  userId: string;
  startedAt: Date;
  lastActivity: Date;
  isActive: boolean;
  isolationLevel:
    | "READ_UNCOMMITTED"
    | "READ_COMMITTED"
    | "REPEATABLE_READ"
    | "SERIALIZABLE";
}

// ============================================================================
// 锁兼容性矩阵
// ============================================================================

/**
 * 锁兼容性检查器
 */
class LockCompatibilityChecker {
  private static compatibilityMatrix: Map<string, boolean> = new Map([
    // 共享锁与共享锁兼容
    [`${LockType.SHARED}-${LockType.SHARED}`, true],
    // 共享锁与排他锁不兼容
    [`${LockType.SHARED}-${LockType.EXCLUSIVE}`, false],
    // 排他锁与共享锁不兼容
    [`${LockType.EXCLUSIVE}-${LockType.SHARED}`, false],
    // 排他锁与排他锁不兼容
    [`${LockType.EXCLUSIVE}-${LockType.EXCLUSIVE}`, false],
  ]);

  /**
   * 检查两个锁是否兼容
   */
  static isCompatible(lock1: LockType, lock2: LockType): boolean {
    const key = `${lock1}-${lock2}`;
    return this.compatibilityMatrix.get(key) || false;
  }

  /**
   * 检查新锁是否可以与现有锁共存
   */
  static canAcquire(
    requestedLock: LockType,
    existingLocks: LockType[]
  ): boolean {
    return existingLocks.every((existingLock) =>
      this.isCompatible(requestedLock, existingLock)
    );
  }
}

// ============================================================================
// 1. Coarse-Grained Lock - 粗粒度锁
// ============================================================================

/**
 * 粗粒度锁管理器
 *
 * 使用较大的锁粒度来减少锁的数量和管理开销，但可能降低并发性
 *
 * 特点：
 * - 锁定较大的数据单元（表、对象聚合、业务流程）
 * - 减少锁管理开销
 * - 降低死锁概率
 * - 可能影响并发性能
 */
class CoarseGrainedLockManager {
  private db: DatabaseConnection;
  private lockRegistry: Map<string, LockInfo[]> = new Map();
  private waitQueue: Map<
    string,
    Array<{
      sessionId: string;
      lockType: LockType;
      resolve: Function;
      reject: Function;
    }>
  > = new Map();
  private lockTimeout: number = 30000; // 30秒超时

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * 获取聚合级锁
   * 锁定整个业务聚合，确保业务操作的原子性
   */
  async acquireAggregateLock(
    aggregateId: string,
    sessionId: string,
    lockType: LockType,
    timeout: number = this.lockTimeout
  ): Promise<string> {
    const lockId = this.generateLockId();
    const resourceKey = `aggregate:${aggregateId}`;

    console.log(
      `尝试获取聚合锁: ${aggregateId} (${lockType}) - 会话: ${sessionId}`
    );

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.removeFromWaitQueue(resourceKey, sessionId);
        reject(new Error(`获取聚合锁超时: ${aggregateId}`));
      }, timeout);

      const tryAcquire = () => {
        const existingLocks = this.lockRegistry.get(resourceKey) || [];
        const existingLockTypes = existingLocks
          .filter((lock) => lock.status === LockStatus.ACQUIRED)
          .map((lock) => lock.lockType);

        if (LockCompatibilityChecker.canAcquire(lockType, existingLockTypes)) {
          // 可以获取锁
          const lockInfo: LockInfo = {
            id: lockId,
            resourceId: aggregateId,
            sessionId,
            lockType,
            granularity: LockGranularity.AGGREGATE,
            status: LockStatus.ACQUIRED,
            acquiredAt: new Date(),
            expiresAt: new Date(Date.now() + timeout),
          };

          if (!this.lockRegistry.has(resourceKey)) {
            this.lockRegistry.set(resourceKey, []);
          }
          this.lockRegistry.get(resourceKey)!.push(lockInfo);

          clearTimeout(timeoutId);
          console.log(`成功获取聚合锁: ${aggregateId} - 锁ID: ${lockId}`);
          resolve(lockId);
        } else {
          // 需要等待，加入等待队列
          if (!this.waitQueue.has(resourceKey)) {
            this.waitQueue.set(resourceKey, []);
          }
          this.waitQueue.get(resourceKey)!.push({
            sessionId,
            lockType,
            resolve: () => {
              clearTimeout(timeoutId);
              resolve(lockId);
            },
            reject: () => {
              clearTimeout(timeoutId);
              reject(new Error(`获取聚合锁失败: ${aggregateId}`));
            },
          });

          console.log(
            `聚合锁冲突，加入等待队列: ${aggregateId} - 会话: ${sessionId}`
          );
        }
      };

      tryAcquire();
    });
  }

  /**
   * 获取表级锁
   * 锁定整个表，用于大批量操作或模式变更
   */
  async acquireTableLock(
    tableName: string,
    sessionId: string,
    lockType: LockType
  ): Promise<string> {
    const lockId = this.generateLockId();
    const resourceKey = `table:${tableName}`;

    console.log(`获取表级锁: ${tableName} (${lockType}) - 会话: ${sessionId}`);

    // 使用数据库原生表锁
    try {
      if (lockType === LockType.SHARED) {
        await this.db.query(`LOCK TABLES ${tableName} READ`);
      } else {
        await this.db.query(`LOCK TABLES ${tableName} WRITE`);
      }

      const lockInfo: LockInfo = {
        id: lockId,
        resourceId: tableName,
        sessionId,
        lockType,
        granularity: LockGranularity.TABLE,
        status: LockStatus.ACQUIRED,
        acquiredAt: new Date(),
      };

      if (!this.lockRegistry.has(resourceKey)) {
        this.lockRegistry.set(resourceKey, []);
      }
      this.lockRegistry.get(resourceKey)!.push(lockInfo);

      console.log(`成功获取表级锁: ${tableName} - 锁ID: ${lockId}`);
      return lockId;
    } catch (error) {
      throw new Error(`获取表级锁失败: ${tableName} - ${error}`);
    }
  }

  /**
   * 获取业务流程锁
   * 锁定整个业务流程，确保复杂业务操作的一致性
   */
  async acquireBusinessProcessLock(
    processId: string,
    sessionId: string,
    lockType: LockType = LockType.EXCLUSIVE
  ): Promise<string> {
    const lockId = this.generateLockId();
    const resourceKey = `process:${processId}`;

    console.log(`获取业务流程锁: ${processId} - 会话: ${sessionId}`);

    // 检查流程是否已被锁定
    const existingLocks = this.lockRegistry.get(resourceKey) || [];
    const hasConflict = existingLocks.some(
      (lock) =>
        lock.status === LockStatus.ACQUIRED &&
        !LockCompatibilityChecker.isCompatible(lockType, lock.lockType)
    );

    if (hasConflict) {
      throw new Error(`业务流程已被锁定: ${processId}`);
    }

    const lockInfo: LockInfo = {
      id: lockId,
      resourceId: processId,
      sessionId,
      lockType,
      granularity: LockGranularity.OBJECT,
      status: LockStatus.ACQUIRED,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + 300000), // 5分钟过期
    };

    if (!this.lockRegistry.has(resourceKey)) {
      this.lockRegistry.set(resourceKey, []);
    }
    this.lockRegistry.get(resourceKey)!.push(lockInfo);

    console.log(`成功获取业务流程锁: ${processId} - 锁ID: ${lockId}`);
    return lockId;
  }

  /**
   * 释放锁
   */
  async releaseLock(lockId: string): Promise<void> {
    let found = false;
    let resourceKey = "";

    // 查找并移除锁
    for (const [key, locks] of this.lockRegistry.entries()) {
      const lockIndex = locks.findIndex((lock) => lock.id === lockId);
      if (lockIndex !== -1) {
        const lock = locks[lockIndex];
        locks.splice(lockIndex, 1);

        // 如果是表锁，解锁表
        if (lock.granularity === LockGranularity.TABLE) {
          await this.db.query("UNLOCK TABLES");
        }

        resourceKey = key;
        found = true;
        console.log(`释放锁: ${lockId} - 资源: ${lock.resourceId}`);
        break;
      }
    }

    if (!found) {
      console.warn(`未找到要释放的锁: ${lockId}`);
      return;
    }

    // 处理等待队列
    await this.processWaitQueue(resourceKey);
  }

  /**
   * 释放会话的所有锁
   */
  async releaseSessionLocks(sessionId: string): Promise<void> {
    console.log(`释放会话所有锁: ${sessionId}`);

    const locksToRelease: string[] = [];

    for (const locks of this.lockRegistry.values()) {
      locks.forEach((lock) => {
        if (lock.sessionId === sessionId) {
          locksToRelease.push(lock.id);
        }
      });
    }

    for (const lockId of locksToRelease) {
      await this.releaseLock(lockId);
    }
  }

  /**
   * 处理等待队列
   */
  private async processWaitQueue(resourceKey: string): Promise<void> {
    const waitQueue = this.waitQueue.get(resourceKey);
    if (!waitQueue || waitQueue.length === 0) {
      return;
    }

    const existingLocks = this.lockRegistry.get(resourceKey) || [];
    const existingLockTypes = existingLocks
      .filter((lock) => lock.status === LockStatus.ACQUIRED)
      .map((lock) => lock.lockType);

    // 尝试满足等待队列中的请求
    const toProcess = [...waitQueue];
    this.waitQueue.set(resourceKey, []);

    for (const request of toProcess) {
      if (
        LockCompatibilityChecker.canAcquire(request.lockType, existingLockTypes)
      ) {
        request.resolve();
      } else {
        // 重新加入等待队列
        if (!this.waitQueue.has(resourceKey)) {
          this.waitQueue.set(resourceKey, []);
        }
        this.waitQueue.get(resourceKey)!.push(request);
      }
    }
  }

  /**
   * 从等待队列中移除请求
   */
  private removeFromWaitQueue(resourceKey: string, sessionId: string): void {
    const waitQueue = this.waitQueue.get(resourceKey);
    if (waitQueue) {
      const filtered = waitQueue.filter((req) => req.sessionId !== sessionId);
      this.waitQueue.set(resourceKey, filtered);
    }
  }

  /**
   * 生成锁ID
   */
  private generateLockId(): string {
    return `lock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取锁状态信息
   */
  getLockStatus(): { [resourceKey: string]: LockInfo[] } {
    const status: { [key: string]: LockInfo[] } = {};
    for (const [key, locks] of this.lockRegistry.entries()) {
      status[key] = [...locks];
    }
    return status;
  }

  /**
   * 清理过期锁
   */
  async cleanupExpiredLocks(): Promise<void> {
    const now = new Date();
    const expiredLocks: string[] = [];

    for (const locks of this.lockRegistry.values()) {
      locks.forEach((lock) => {
        if (lock.expiresAt && lock.expiresAt < now) {
          expiredLocks.push(lock.id);
        }
      });
    }

    for (const lockId of expiredLocks) {
      await this.releaseLock(lockId);
    }

    if (expiredLocks.length > 0) {
      console.log(`清理了 ${expiredLocks.length} 个过期锁`);
    }
  }
}

// ============================================================================
// 2. Implicit Lock - 隐式锁
// ============================================================================

/**
 * 隐式锁管理器
 *
 * 在框架层面自动管理锁，应用代码无需显式处理锁逻辑
 *
 * 特点：
 * - 透明的锁管理
 * - 基于事务边界自动加锁/解锁
 * - 减少开发者的锁管理负担
 * - 智能锁升级和降级
 */
class ImplicitLockManager {
  private db: DatabaseConnection;
  private sessionManager: TransactionSessionManager;
  private coarseLockManager: CoarseGrainedLockManager;
  private autoLockConfig: Map<string, LockConfiguration> = new Map();

  constructor(db: DatabaseConnection) {
    this.db = db;
    this.sessionManager = new TransactionSessionManager(db);
    this.coarseLockManager = new CoarseGrainedLockManager(db);
    this.setupDefaultLockConfiguration();
  }

  /**
   * 配置自动锁策略
   */
  private setupDefaultLockConfiguration(): void {
    // 订单聚合的锁配置
    this.autoLockConfig.set("Order", {
      defaultLockType: LockType.EXCLUSIVE,
      granularity: LockGranularity.AGGREGATE,
      autoUpgrade: true,
      maxHoldTime: 60000, // 1分钟
      deadlockRetry: 3,
    });

    // 用户账户的锁配置
    this.autoLockConfig.set("Account", {
      defaultLockType: LockType.EXCLUSIVE,
      granularity: LockGranularity.OBJECT,
      autoUpgrade: false,
      maxHoldTime: 30000, // 30秒
      deadlockRetry: 2,
    });

    // 产品库存的锁配置
    this.autoLockConfig.set("Inventory", {
      defaultLockType: LockType.EXCLUSIVE,
      granularity: LockGranularity.ROW,
      autoUpgrade: true,
      maxHoldTime: 15000, // 15秒
      deadlockRetry: 5,
    });
  }

  /**
   * 事务装饰器 - 隐式锁管理
   */
  withImplicitLocking<T>(
    entityType: string,
    entityId: string,
    operation: () => Promise<T>
  ): (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) => void {
    return (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor
    ) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const sessionId = this.getSessionId?.() || "implicit-session";
        const lockConfig = this.autoLockConfig.get(entityType);

        if (!lockConfig) {
          // 没有锁配置，直接执行
          return originalMethod.apply(this, args);
        }

        console.log(
          `隐式锁: ${entityType}:${entityId} - 操作: ${propertyName}`
        );

        let lockId: string | null = null;
        let attempts = 0;
        const maxAttempts = lockConfig.deadlockRetry + 1;

        while (attempts < maxAttempts) {
          try {
            // 自动获取锁
            lockId = await this.acquireImplicitLock(
              entityType,
              entityId,
              sessionId,
              lockConfig
            );

            // 执行业务操作
            const result = await originalMethod.apply(this, args);

            // 自动释放锁
            if (lockId) {
              await this.coarseLockManager.releaseLock(lockId);
            }

            return result;
          } catch (error) {
            if (lockId) {
              await this.coarseLockManager.releaseLock(lockId);
            }

            if (this.isDeadlockError(error) && attempts < maxAttempts - 1) {
              attempts++;
              const delay = Math.pow(2, attempts) * 100; // 指数退避
              console.log(`死锁检测，重试第 ${attempts} 次，延迟 ${delay}ms`);
              await this.delay(delay);
              continue;
            }

            throw error;
          }
        }

        throw new Error(`操作失败，已重试 ${maxAttempts} 次: ${propertyName}`);
      };
    };
  }

  /**
   * 获取隐式锁
   */
  private async acquireImplicitLock(
    entityType: string,
    entityId: string,
    sessionId: string,
    config: LockConfiguration
  ): Promise<string> {
    const resourceId = `${entityType}:${entityId}`;

    switch (config.granularity) {
      case LockGranularity.AGGREGATE:
        return this.coarseLockManager.acquireAggregateLock(
          resourceId,
          sessionId,
          config.defaultLockType,
          config.maxHoldTime
        );

      case LockGranularity.OBJECT:
        return this.coarseLockManager.acquireBusinessProcessLock(
          resourceId,
          sessionId,
          config.defaultLockType
        );

      case LockGranularity.ROW:
        // 对于行级锁，使用数据库的SELECT FOR UPDATE
        return this.acquireRowLevelImplicitLock(entityId, sessionId, config);

      default:
        throw new Error(`不支持的锁粒度: ${config.granularity}`);
    }
  }

  /**
   * 获取行级隐式锁
   */
  private async acquireRowLevelImplicitLock(
    entityId: string,
    sessionId: string,
    config: LockConfiguration
  ): Promise<string> {
    const lockId = `implicit-row-${entityId}-${sessionId}`;

    try {
      // 使用SELECT FOR UPDATE获取行锁
      await this.db.query("SELECT id FROM entities WHERE id = ? FOR UPDATE", [
        entityId,
      ]);

      console.log(`隐式行锁获取成功: ${entityId} - 会话: ${sessionId}`);
      return lockId;
    } catch (error) {
      throw new Error(`隐式行锁获取失败: ${entityId} - ${error}`);
    }
  }

  /**
   * 智能锁升级
   * 当检测到潜在冲突时，自动将细粒度锁升级为粗粒度锁
   */
  async upgradeLock(
    currentLockId: string,
    fromGranularity: LockGranularity,
    toGranularity: LockGranularity,
    sessionId: string
  ): Promise<string> {
    console.log(
      `锁升级: ${fromGranularity} -> ${toGranularity} - 会话: ${sessionId}`
    );

    // 释放当前锁
    await this.coarseLockManager.releaseLock(currentLockId);

    // 获取更粗粒度的锁
    const resourceId = `upgraded-${Date.now()}`;
    return this.coarseLockManager.acquireAggregateLock(
      resourceId,
      sessionId,
      LockType.EXCLUSIVE
    );
  }

  /**
   * 锁降级
   * 当操作范围缩小时，将粗粒度锁降级为细粒度锁
   */
  async downgradeLock(
    currentLockId: string,
    fromGranularity: LockGranularity,
    toGranularity: LockGranularity,
    sessionId: string
  ): Promise<string> {
    console.log(
      `锁降级: ${fromGranularity} -> ${toGranularity} - 会话: ${sessionId}`
    );

    // 释放当前锁
    await this.coarseLockManager.releaseLock(currentLockId);

    // 获取更细粒度的锁
    const resourceId = `downgraded-${Date.now()}`;
    return this.coarseLockManager.acquireBusinessProcessLock(
      resourceId,
      sessionId,
      LockType.SHARED
    );
  }

  /**
   * 检查是否为死锁错误
   */
  private isDeadlockError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || "";
    return (
      errorMessage.includes("deadlock") ||
      errorMessage.includes("lock wait timeout") ||
      errorMessage.includes("circular dependency")
    );
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 监控锁使用情况
   */
  generateLockReport(): ImplicitLockReport {
    const coarseLockStatus = this.coarseLockManager.getLockStatus();
    const activeSessionCount = this.sessionManager.getActiveSessionCount();

    const report: ImplicitLockReport = {
      timestamp: new Date(),
      activeSessionCount,
      totalLocks: Object.values(coarseLockStatus).reduce(
        (sum, locks) => sum + locks.length,
        0
      ),
      locksByGranularity: {
        [LockGranularity.ROW]: 0,
        [LockGranularity.OBJECT]: 0,
        [LockGranularity.AGGREGATE]: 0,
        [LockGranularity.TABLE]: 0,
        [LockGranularity.DATABASE]: 0,
      },
      locksByType: {
        [LockType.SHARED]: 0,
        [LockType.EXCLUSIVE]: 0,
      },
      averageLockHoldTime: 0,
      deadlockCount: 0,
    };

    // 统计锁信息
    for (const locks of Object.values(coarseLockStatus)) {
      locks.forEach((lock) => {
        report.locksByGranularity[lock.granularity]++;
        report.locksByType[lock.lockType]++;
      });
    }

    return report;
  }
}

// ============================================================================
// 事务会话管理器
// ============================================================================

/**
 * 事务会话管理器
 */
class TransactionSessionManager {
  private db: DatabaseConnection;
  private activeSessions: Map<string, TransactionSession> = new Map();

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * 创建新会话
   */
  createSession(
    userId: string,
    isolationLevel: TransactionSession["isolationLevel"] = "READ_COMMITTED"
  ): string {
    const sessionId = `session-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const session: TransactionSession = {
      id: sessionId,
      userId,
      startedAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      isolationLevel,
    };

    this.activeSessions.set(sessionId, session);
    console.log(`创建事务会话: ${sessionId} - 用户: ${userId}`);

    return sessionId;
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): TransactionSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * 更新会话活动时间
   */
  updateSessionActivity(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * 关闭会话
   */
  closeSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.activeSessions.delete(sessionId);
      console.log(`关闭事务会话: ${sessionId}`);
    }
  }

  /**
   * 获取活跃会话数量
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(maxIdleTime: number = 1800000): void {
    // 30分钟
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > maxIdleTime) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach((sessionId) => this.closeSession(sessionId));

    if (expiredSessions.length > 0) {
      console.log(`清理了 ${expiredSessions.length} 个过期会话`);
    }
  }
}

// ============================================================================
// 死锁检测器
// ============================================================================

/**
 * 死锁检测器
 */
class DeadlockDetector {
  private waitGraph: Map<string, Set<string>> = new Map(); // 等待图

  /**
   * 添加等待关系
   */
  addWaitRelation(waitingSession: string, holdingSession: string): void {
    if (!this.waitGraph.has(waitingSession)) {
      this.waitGraph.set(waitingSession, new Set());
    }
    this.waitGraph.get(waitingSession)!.add(holdingSession);
  }

  /**
   * 移除等待关系
   */
  removeWaitRelation(waitingSession: string, holdingSession: string): void {
    const waitSet = this.waitGraph.get(waitingSession);
    if (waitSet) {
      waitSet.delete(holdingSession);
      if (waitSet.size === 0) {
        this.waitGraph.delete(waitingSession);
      }
    }
  }

  /**
   * 检测死锁
   */
  detectDeadlock(): string[] | null {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const session of this.waitGraph.keys()) {
      if (!visited.has(session)) {
        const cycle = this.dfsDetectCycle(session, visited, recursionStack, []);
        if (cycle) {
          return cycle;
        }
      }
    }

    return null;
  }

  /**
   * 深度优先搜索检测环
   */
  private dfsDetectCycle(
    session: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[]
  ): string[] | null {
    visited.add(session);
    recursionStack.add(session);
    path.push(session);

    const waitSet = this.waitGraph.get(session);
    if (waitSet) {
      for (const waitingFor of waitSet) {
        if (!visited.has(waitingFor)) {
          const cycle = this.dfsDetectCycle(
            waitingFor,
            visited,
            recursionStack,
            [...path]
          );
          if (cycle) {
            return cycle;
          }
        } else if (recursionStack.has(waitingFor)) {
          // 找到环
          const cycleStart = path.indexOf(waitingFor);
          return path.slice(cycleStart).concat([waitingFor]);
        }
      }
    }

    recursionStack.delete(session);
    return null;
  }

  /**
   * 清除等待图
   */
  clear(): void {
    this.waitGraph.clear();
  }
}

// ============================================================================
// 配置和报告接口
// ============================================================================

/**
 * 锁配置接口
 */
interface LockConfiguration {
  defaultLockType: LockType;
  granularity: LockGranularity;
  autoUpgrade: boolean;
  maxHoldTime: number;
  deadlockRetry: number;
}

/**
 * 隐式锁报告接口
 */
interface ImplicitLockReport {
  timestamp: Date;
  activeSessionCount: number;
  totalLocks: number;
  locksByGranularity: { [key in LockGranularity]: number };
  locksByType: { [key in LockType]: number };
  averageLockHoldTime: number;
  deadlockCount: number;
}

// ============================================================================
// 使用示例和测试
// ============================================================================

/**
 * 高级并发模式使用示例
 */
export class AdvancedConcurrencyDemo {
  private coarseLockManager: CoarseGrainedLockManager;
  private implicitLockManager: ImplicitLockManager;
  private sessionManager: TransactionSessionManager;
  private deadlockDetector: DeadlockDetector;

  constructor(db: DatabaseConnection) {
    this.coarseLockManager = new CoarseGrainedLockManager(db);
    this.implicitLockManager = new ImplicitLockManager(db);
    this.sessionManager = new TransactionSessionManager(db);
    this.deadlockDetector = new DeadlockDetector();
  }

  /**
   * 演示粗粒度锁
   */
  async demonstrateCoarseGrainedLocking(): Promise<void> {
    console.log("\n=== 粗粒度锁演示 ===");

    const session1 = this.sessionManager.createSession("user1");
    const session2 = this.sessionManager.createSession("user2");

    try {
      // 会话1获取订单聚合锁
      const orderLock = await this.coarseLockManager.acquireAggregateLock(
        "order-12345",
        session1,
        LockType.EXCLUSIVE
      );
      console.log("会话1获取订单聚合排他锁");

      // 会话2尝试获取同一订单的共享锁（应该失败）
      try {
        await this.coarseLockManager.acquireAggregateLock(
          "order-12345",
          session2,
          LockType.SHARED,
          5000
        );
      } catch (error) {
        console.log("会话2获取锁失败（预期行为）:", error.message);
      }

      // 会话1释放锁
      await this.coarseLockManager.releaseLock(orderLock);
      console.log("会话1释放锁");

      // 现在会话2可以获取锁
      const sharedLock = await this.coarseLockManager.acquireAggregateLock(
        "order-12345",
        session2,
        LockType.SHARED
      );
      console.log("会话2成功获取共享锁");

      await this.coarseLockManager.releaseLock(sharedLock);
    } finally {
      this.sessionManager.closeSession(session1);
      this.sessionManager.closeSession(session2);
    }
  }

  /**
   * 演示表级锁
   */
  async demonstrateTableLocking(): Promise<void> {
    console.log("\n=== 表级锁演示 ===");

    const session = this.sessionManager.createSession("admin");

    try {
      // 获取表级写锁（用于批量操作）
      const tableLock = await this.coarseLockManager.acquireTableLock(
        "products",
        session,
        LockType.EXCLUSIVE
      );
      console.log("获取产品表排他锁，准备批量更新");

      // 模拟批量操作
      console.log("执行批量价格更新...");
      await this.delay(2000);

      // 释放表锁
      await this.coarseLockManager.releaseLock(tableLock);
      console.log("批量操作完成，释放表锁");
    } finally {
      this.sessionManager.closeSession(session);
    }
  }

  /**
   * 演示隐式锁
   */
  async demonstrateImplicitLocking(): Promise<void> {
    console.log("\n=== 隐式锁演示 ===");

    // 使用装饰器的示例业务类
    class OrderService {
      constructor(private lockManager: ImplicitLockManager) {}

      getSessionId(): string {
        return "service-session";
      }

      // 使用隐式锁装饰器
      @(this.implicitLockManager.withImplicitLocking(
        "Order",
        "order-1",
        this.processOrder
      ))
      async processOrder(orderId: string): Promise<void> {
        console.log(`处理订单: ${orderId}`);

        // 模拟复杂的业务逻辑
        await this.delay(1000);
        console.log("验证库存...");

        await this.delay(500);
        console.log("计算价格...");

        await this.delay(800);
        console.log("更新订单状态...");

        console.log(`订单 ${orderId} 处理完成`);
      }

      @(this.implicitLockManager.withImplicitLocking(
        "Account",
        "account-1",
        this.updateBalance
      ))
      async updateBalance(accountId: string, amount: number): Promise<void> {
        console.log(`更新账户余额: ${accountId}, 金额: ${amount}`);

        // 模拟账户余额更新
        await this.delay(500);
        console.log("余额更新完成");
      }

      private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
    }

    const orderService = new OrderService(this.implicitLockManager);

    // 并发执行多个操作
    const operations = [
      orderService.processOrder("order-1"),
      orderService.updateBalance("account-1", 100),
      orderService.updateBalance("account-1", -50), // 可能冲突
    ];

    try {
      await Promise.all(operations);
      console.log("所有隐式锁操作完成");
    } catch (error) {
      console.log("隐式锁操作失败:", error.message);
    }
  }

  /**
   * 演示死锁检测
   */
  async demonstrateDeadlockDetection(): Promise<void> {
    console.log("\n=== 死锁检测演示 ===");

    // 模拟死锁情况
    this.deadlockDetector.addWaitRelation("session-A", "session-B");
    this.deadlockDetector.addWaitRelation("session-B", "session-C");
    this.deadlockDetector.addWaitRelation("session-C", "session-A"); // 形成环

    const deadlock = this.deadlockDetector.detectDeadlock();
    if (deadlock) {
      console.log("检测到死锁:", deadlock.join(" -> "));
      console.log("死锁解决方案: 终止最年轻的事务");
    } else {
      console.log("未检测到死锁");
    }

    // 解决死锁
    this.deadlockDetector.removeWaitRelation("session-C", "session-A");
    console.log("移除等待关系，解决死锁");

    const afterResolution = this.deadlockDetector.detectDeadlock();
    console.log("死锁解决后检测结果:", afterResolution ? "仍有死锁" : "无死锁");
  }

  /**
   * 演示锁性能监控
   */
  async demonstrateLockMonitoring(): Promise<void> {
    console.log("\n=== 锁性能监控演示 ===");

    // 创建一些锁活动
    const session = this.sessionManager.createSession("monitor-user");

    const lock1 = await this.coarseLockManager.acquireAggregateLock(
      "aggregate-1",
      session,
      LockType.SHARED
    );

    const lock2 = await this.coarseLockManager.acquireBusinessProcessLock(
      "process-1",
      session,
      LockType.EXCLUSIVE
    );

    // 生成监控报告
    const report = this.implicitLockManager.generateLockReport();

    console.log("锁监控报告:");
    console.log(`- 活跃会话数: ${report.activeSessionCount}`);
    console.log(`- 总锁数量: ${report.totalLocks}`);
    console.log(
      `- 聚合级锁: ${report.locksByGranularity[LockGranularity.AGGREGATE]}`
    );
    console.log(
      `- 对象级锁: ${report.locksByGranularity[LockGranularity.OBJECT]}`
    );
    console.log(`- 排他锁: ${report.locksByType[LockType.EXCLUSIVE]}`);
    console.log(`- 共享锁: ${report.locksByType[LockType.SHARED]}`);

    // 清理
    await this.coarseLockManager.releaseLock(lock1);
    await this.coarseLockManager.releaseLock(lock2);
    this.sessionManager.closeSession(session);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 导出主要类和接口
export {
  LockType,
  LockGranularity,
  LockStatus,
  LockInfo,
  TransactionSession,
  CoarseGrainedLockManager,
  ImplicitLockManager,
  TransactionSessionManager,
  DeadlockDetector,
  LockConfiguration,
  ImplicitLockReport,
};
