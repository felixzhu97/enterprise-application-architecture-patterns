/**
 * 悲观离线锁模式
 * 演示 Pessimistic Offline Lock 模式
 *
 * 用于处理长时间的业务事务，防止并发修改
 */

/**
 * 锁信息
 */
export interface LockInfo {
  lockId: string;
  entityId: string;
  entityType: string;
  ownerId: string;
  ownerName: string;
  acquiredAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

/**
 * 锁冲突异常
 */
export class LockConflictException extends Error {
  constructor(
    message: string,
    public readonly entityId: string,
    public readonly currentLock: LockInfo
  ) {
    super(message);
    this.name = "LockConflictException";
  }
}

/**
 * 锁已过期异常
 */
export class LockExpiredException extends Error {
  constructor(message: string, public readonly lockId: string) {
    super(message);
    this.name = "LockExpiredException";
  }
}

/**
 * 锁存储接口
 */
export interface LockStore {
  /**
   * 获取锁信息
   */
  getLock(entityType: string, entityId: string): Promise<LockInfo | null>;

  /**
   * 保存锁信息
   */
  saveLock(lockInfo: LockInfo): Promise<void>;

  /**
   * 删除锁
   */
  deleteLock(lockId: string): Promise<void>;

  /**
   * 清理过期锁
   */
  cleanupExpiredLocks(): Promise<number>;

  /**
   * 获取用户的所有锁
   */
  getUserLocks(ownerId: string): Promise<LockInfo[]>;
}

/**
 * 内存锁存储实现（用于演示）
 */
export class InMemoryLockStore implements LockStore {
  private locks = new Map<string, LockInfo>();

  async getLock(
    entityType: string,
    entityId: string
  ): Promise<LockInfo | null> {
    const key = `${entityType}:${entityId}`;
    const lock = this.locks.get(key);

    if (lock && lock.expiresAt > new Date()) {
      return lock;
    }

    if (lock) {
      // 清理过期锁
      this.locks.delete(key);
    }

    return null;
  }

  async saveLock(lockInfo: LockInfo): Promise<void> {
    const key = `${lockInfo.entityType}:${lockInfo.entityId}`;
    this.locks.set(key, lockInfo);
  }

  async deleteLock(lockId: string): Promise<void> {
    for (const [key, lock] of this.locks.entries()) {
      if (lock.lockId === lockId) {
        this.locks.delete(key);
        break;
      }
    }
  }

  async cleanupExpiredLocks(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt <= now) {
        this.locks.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  async getUserLocks(ownerId: string): Promise<LockInfo[]> {
    const userLocks: LockInfo[] = [];
    const now = new Date();

    for (const lock of this.locks.values()) {
      if (lock.ownerId === ownerId && lock.expiresAt > now) {
        userLocks.push(lock);
      }
    }

    return userLocks;
  }
}

/**
 * 悲观锁管理器
 */
export class PessimisticLockManager {
  constructor(
    private lockStore: LockStore,
    private defaultLockDurationMs: number = 30 * 60 * 1000 // 30分钟
  ) {}

  /**
   * 获取锁
   */
  async acquireLock(
    entityType: string,
    entityId: string,
    ownerId: string,
    ownerName: string,
    durationMs?: number
  ): Promise<LockInfo> {
    // 检查是否已有锁
    const existingLock = await this.lockStore.getLock(entityType, entityId);

    if (existingLock) {
      if (existingLock.ownerId === ownerId) {
        // 同一用户重新获取锁，延长过期时间
        return await this.renewLock(existingLock.lockId, durationMs);
      } else {
        throw new LockConflictException(
          `实体 ${entityType}:${entityId} 已被用户 ${existingLock.ownerName} 锁定`,
          entityId,
          existingLock
        );
      }
    }

    // 创建新锁
    const lockDuration = durationMs || this.defaultLockDurationMs;
    const now = new Date();
    const lockInfo: LockInfo = {
      lockId: this.generateLockId(),
      entityId,
      entityType,
      ownerId,
      ownerName,
      acquiredAt: now,
      expiresAt: new Date(now.getTime() + lockDuration),
      isActive: true,
    };

    await this.lockStore.saveLock(lockInfo);
    return lockInfo;
  }

  /**
   * 释放锁
   */
  async releaseLock(lockId: string, ownerId: string): Promise<void> {
    // 验证锁的所有权
    const lock = await this.findLockById(lockId);

    if (!lock) {
      throw new Error(`锁 ${lockId} 不存在`);
    }

    if (lock.ownerId !== ownerId) {
      throw new Error(`用户 ${ownerId} 没有权限释放锁 ${lockId}`);
    }

    await this.lockStore.deleteLock(lockId);
  }

  /**
   * 续期锁
   */
  async renewLock(lockId: string, durationMs?: number): Promise<LockInfo> {
    const lock = await this.findLockById(lockId);

    if (!lock) {
      throw new Error(`锁 ${lockId} 不存在`);
    }

    if (lock.expiresAt <= new Date()) {
      throw new LockExpiredException(`锁 ${lockId} 已过期`, lockId);
    }

    // 延长过期时间
    const lockDuration = durationMs || this.defaultLockDurationMs;
    const renewedLock: LockInfo = {
      ...lock,
      expiresAt: new Date(Date.now() + lockDuration),
    };

    await this.lockStore.saveLock(renewedLock);
    return renewedLock;
  }

  /**
   * 检查锁状态
   */
  async checkLock(
    entityType: string,
    entityId: string
  ): Promise<LockInfo | null> {
    return await this.lockStore.getLock(entityType, entityId);
  }

  /**
   * 强制释放锁（管理员操作）
   */
  async forceReleaseLock(lockId: string, adminId: string): Promise<void> {
    console.log(`管理员 ${adminId} 强制释放锁 ${lockId}`);
    await this.lockStore.deleteLock(lockId);
  }

  /**
   * 获取用户的所有锁
   */
  async getUserLocks(ownerId: string): Promise<LockInfo[]> {
    return await this.lockStore.getUserLocks(ownerId);
  }

  /**
   * 清理过期锁
   */
  async cleanupExpiredLocks(): Promise<number> {
    return await this.lockStore.cleanupExpiredLocks();
  }

  /**
   * 受保护的操作执行
   */
  async withLock<T>(
    entityType: string,
    entityId: string,
    ownerId: string,
    ownerName: string,
    operation: (lockInfo: LockInfo) => Promise<T>,
    durationMs?: number
  ): Promise<T> {
    let lockInfo: LockInfo | null = null;

    try {
      // 获取锁
      lockInfo = await this.acquireLock(
        entityType,
        entityId,
        ownerId,
        ownerName,
        durationMs
      );

      // 执行操作
      const result = await operation(lockInfo);

      return result;
    } finally {
      // 确保释放锁
      if (lockInfo) {
        try {
          await this.releaseLock(lockInfo.lockId, ownerId);
        } catch (error) {
          console.error(`释放锁失败: ${error}`);
        }
      }
    }
  }

  /**
   * 查找锁信息
   */
  private async findLockById(lockId: string): Promise<LockInfo | null> {
    // 简化实现：遍历查找
    // 实际应用中应该有更高效的查找方式
    const allEntities = ["User", "Product", "Order"]; // 假设的实体类型

    for (const entityType of allEntities) {
      // 这里需要更好的查找方式，这只是演示
      const locks = await this.lockStore.getUserLocks("");
      for (const lock of locks) {
        if (lock.lockId === lockId) {
          return lock;
        }
      }
    }

    return null;
  }

  /**
   * 生成锁ID
   */
  private generateLockId(): string {
    return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 悲观锁装饰器
 */
export function PessimisticLock(
  entityType: string,
  entityIdField: string = "id",
  ownerIdField: string = "ownerId",
  ownerNameField: string = "ownerName"
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const lockManager = new PessimisticLockManager(new InMemoryLockStore());

      // 从参数中提取实体ID和所有者信息
      const entityId = args[0]?.[entityIdField] || args[0];
      const ownerId = args[0]?.[ownerIdField] || "unknown";
      const ownerName = args[0]?.[ownerNameField] || "Unknown User";

      return lockManager.withLock(
        entityType,
        entityId,
        ownerId,
        ownerName,
        async (lockInfo) => {
          // 将锁信息传递给原方法
          return method.apply(this, [...args, lockInfo]);
        }
      );
    };

    return descriptor;
  };
}

/**
 * 使用示例：长时间运行的业务操作
 */
export class OrderProcessingService {
  constructor(private lockManager: PessimisticLockManager) {}

  /**
   * 处理订单（需要锁定）
   */
  @PessimisticLock("Order")
  async processOrder(
    orderId: string,
    ownerId: string,
    ownerName: string,
    lockInfo?: LockInfo
  ): Promise<void> {
    console.log(`开始处理订单 ${orderId}，锁ID: ${lockInfo?.lockId}`);

    // 模拟长时间运行的业务逻辑
    await this.simulateBusinessLogic();

    console.log(`订单 ${orderId} 处理完成`);
  }

  /**
   * 模拟业务逻辑
   */
  private async simulateBusinessLogic(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 2000); // 模拟2秒的处理时间
    });
  }
}
