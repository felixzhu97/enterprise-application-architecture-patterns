/**
 * 乐观离线锁模式
 * 演示 Optimistic Offline Lock 模式
 *
 * 用于处理并发更新冲突，假设冲突很少发生
 */

/**
 * 版本化实体接口
 */
export interface VersionedEntity {
  getId(): string;
  getVersion(): number;
  setVersion(version: number): void;
  getUpdatedAt(): Date;
  setUpdatedAt(date: Date): void;
}

/**
 * 并发更新异常
 */
export class ConcurrentUpdateException extends Error {
  constructor(
    message: string,
    public readonly entityId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(message);
    this.name = "ConcurrentUpdateException";
  }
}

/**
 * 乐观锁管理器
 */
export class OptimisticLockManager {
  /**
   * 检查版本冲突
   */
  checkVersion<T extends VersionedEntity>(
    entity: T,
    expectedVersion: number
  ): void {
    const currentVersion = entity.getVersion();

    if (currentVersion !== expectedVersion) {
      throw new ConcurrentUpdateException(
        `并发更新冲突: 实体 ${entity.getId()} 的期望版本为 ${expectedVersion}，但当前版本为 ${currentVersion}`,
        entity.getId(),
        expectedVersion,
        currentVersion
      );
    }
  }

  /**
   * 更新版本号
   */
  updateVersion<T extends VersionedEntity>(entity: T): void {
    const newVersion = entity.getVersion() + 1;
    entity.setVersion(newVersion);
    entity.setUpdatedAt(new Date());
  }

  /**
   * 安全更新实体
   */
  async safeUpdate<T extends VersionedEntity>(
    entity: T,
    expectedVersion: number,
    updateFn: (entity: T) => Promise<void>,
    saveFn: (entity: T) => Promise<T>
  ): Promise<T> {
    // 检查版本
    this.checkVersion(entity, expectedVersion);

    // 执行更新逻辑
    await updateFn(entity);

    // 更新版本号
    this.updateVersion(entity);

    try {
      // 保存实体
      return await saveFn(entity);
    } catch (error) {
      // 如果保存失败，可能是数据库层面的版本冲突
      if (this.isDatabaseVersionConflict(error)) {
        throw new ConcurrentUpdateException(
          "数据库版本冲突，请重新加载数据后再试",
          entity.getId(),
          expectedVersion,
          entity.getVersion()
        );
      }
      throw error;
    }
  }

  /**
   * 批量更新实体
   */
  async batchUpdate<T extends VersionedEntity>(
    entities: Array<{
      entity: T;
      expectedVersion: number;
      updateFn: (entity: T) => Promise<void>;
    }>,
    saveFn: (entities: T[]) => Promise<T[]>
  ): Promise<T[]> {
    // 验证所有实体的版本
    for (const { entity, expectedVersion } of entities) {
      this.checkVersion(entity, expectedVersion);
    }

    // 执行所有更新
    for (const { entity, updateFn } of entities) {
      await updateFn(entity);
      this.updateVersion(entity);
    }

    try {
      // 批量保存
      return await saveFn(entities.map((item) => item.entity));
    } catch (error) {
      if (this.isDatabaseVersionConflict(error)) {
        throw new ConcurrentUpdateException(
          "批量更新时发生版本冲突",
          "batch",
          -1,
          -1
        );
      }
      throw error;
    }
  }

  /**
   * 重试机制
   */
  async updateWithRetry<T extends VersionedEntity>(
    entityId: string,
    maxRetries: number,
    loadFn: (id: string) => Promise<T | null>,
    updateFn: (entity: T) => Promise<void>,
    saveFn: (entity: T) => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 重新加载实体
        const entity = await loadFn(entityId);
        if (!entity) {
          throw new Error(`实体 ${entityId} 不存在`);
        }

        const currentVersion = entity.getVersion();

        return await this.safeUpdate(entity, currentVersion, updateFn, saveFn);
      } catch (error) {
        lastError = error as Error;

        if (error instanceof ConcurrentUpdateException) {
          // 版本冲突，等待一段时间后重试
          if (attempt < maxRetries - 1) {
            await this.sleep(100 * Math.pow(2, attempt)); // 指数退避
            continue;
          }
        }

        // 非版本冲突错误，直接抛出
        throw error;
      }
    }

    throw new Error(
      `更新实体 ${entityId} 失败，已重试 ${maxRetries} 次。最后错误: ${lastError?.message}`
    );
  }

  /**
   * 判断是否为数据库版本冲突
   */
  private isDatabaseVersionConflict(error: any): boolean {
    // 这里应该根据具体的数据库错误类型判断
    const message = error.message?.toLowerCase() || "";
    return (
      message.includes("version") ||
      message.includes("optimistic") ||
      message.includes("concurrent")
    );
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 乐观锁装饰器
 * 为实体方法添加乐观锁保护
 */
export function OptimisticLock(
  expectedVersionField: string = "expectedVersion"
) {
  return function <T extends VersionedEntity>(
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const lockManager = new OptimisticLockManager();

    descriptor.value = async function (this: T, ...args: any[]) {
      // 获取期望版本号（通常作为方法参数传入）
      const expectedVersion =
        args.find(
          (arg) =>
            typeof arg === "object" && arg[expectedVersionField] !== undefined
        )?.[expectedVersionField] || this.getVersion();

      return lockManager.safeUpdate(
        this,
        expectedVersion,
        async (entity) => {
          // 调用原始方法
          await method.apply(entity, args);
        },
        async (entity) => {
          // 这里应该调用实际的保存方法
          // 简化实现，直接返回实体
          return entity;
        }
      );
    };

    return descriptor;
  };
}

/**
 * 使用示例：版本化用户实体
 */
export class VersionedUser implements VersionedEntity {
  private version: number = 0;
  private updatedAt: Date = new Date();

  constructor(
    private id: string,
    private username: string,
    private email: string
  ) {}

  getId(): string {
    return this.id;
  }

  getVersion(): number {
    return this.version;
  }

  setVersion(version: number): void {
    this.version = version;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  setUpdatedAt(date: Date): void {
    this.updatedAt = date;
  }

  /**
   * 更新邮箱（带乐观锁保护）
   */
  @OptimisticLock()
  async updateEmail(newEmail: string, expectedVersion: number): Promise<void> {
    // 验证邮箱格式
    if (!this.isValidEmail(newEmail)) {
      throw new Error("无效的邮箱格式");
    }

    this.email = newEmail;
  }

  /**
   * 更新用户名（带乐观锁保护）
   */
  @OptimisticLock()
  async updateUsername(
    newUsername: string,
    expectedVersion: number
  ): Promise<void> {
    // 验证用户名
    if (!newUsername || newUsername.trim().length < 3) {
      throw new Error("用户名至少需要3个字符");
    }

    this.username = newUsername;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
