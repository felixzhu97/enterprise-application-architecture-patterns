/**
 * Unit of Work（工作单元）模式
 *
 * 维护受业务事务影响的对象列表，并协调变更的写入和并发问题的解决。
 *
 * 主要功能：
 * - 跟踪事务期间对象的变化
 * - 维护对象的新增、修改、删除状态
 * - 协调事务提交和回滚
 * - 处理对象间的依赖关系
 * - 优化数据库访问
 *
 * 优点：
 * - 确保事务一致性
 * - 减少数据库访问次数
 * - 简化事务管理
 * - 处理复杂的对象关系
 *
 * 适用场景：
 * - 复杂的业务事务
 * - 需要操作多个对象的场景
 * - 对性能有要求的应用
 * - 需要回滚能力的操作
 */

import { DataSource, QueryRunner } from "typeorm";
import { DomainObject } from "./layer-supertype";

/**
 * 工作单元操作类型
 */
export enum UnitOfWorkOperation {
  INSERT = "INSERT",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

/**
 * 工作单元条目
 */
export interface UnitOfWorkItem {
  entity: DomainObject;
  operation: UnitOfWorkOperation;
  originalState?: any;
  timestamp: Date;
}

/**
 * 仓储接口
 */
export interface UnitOfWorkRepository<T extends DomainObject> {
  insert(entity: T, queryRunner?: QueryRunner): Promise<void>;
  update(entity: T, queryRunner?: QueryRunner): Promise<void>;
  delete(entity: T, queryRunner?: QueryRunner): Promise<void>;
  findById(id: string, queryRunner?: QueryRunner): Promise<T | null>;
}

/**
 * 工作单元异常
 */
export class UnitOfWorkException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "UnitOfWorkException";
  }
}

/**
 * 工作单元实现
 */
export class UnitOfWork {
  private items: Map<string, UnitOfWorkItem> = new Map();
  private repositories: Map<string, UnitOfWorkRepository<any>> = new Map();
  private queryRunner: QueryRunner | null = null;
  private isCommitting = false;
  private isRolledBack = false;

  constructor(private dataSource: DataSource) {}

  /**
   * 注册仓储
   */
  registerRepository<T extends DomainObject>(
    entityType: string,
    repository: UnitOfWorkRepository<T>
  ): void {
    this.repositories.set(entityType, repository);
  }

  /**
   * 注册新对象
   */
  registerNew<T extends DomainObject>(entity: T): void {
    this.checkNotCommittingOrRolledBack();

    const id = entity.getId();
    if (this.items.has(id)) {
      throw new UnitOfWorkException(`实体 ${id} 已经在工作单元中`);
    }

    this.items.set(id, {
      entity,
      operation: UnitOfWorkOperation.INSERT,
      timestamp: new Date(),
    });
  }

  /**
   * 注册修改对象
   */
  registerDirty<T extends DomainObject>(entity: T, originalState?: any): void {
    this.checkNotCommittingOrRolledBack();

    const id = entity.getId();
    const existing = this.items.get(id);

    if (existing) {
      // 如果已经是新增对象，保持新增状态
      if (existing.operation === UnitOfWorkOperation.INSERT) {
        return;
      }
      // 如果已经是删除对象，抛出错误
      if (existing.operation === UnitOfWorkOperation.DELETE) {
        throw new UnitOfWorkException(`无法修改已删除的实体 ${id}`);
      }
    }

    this.items.set(id, {
      entity,
      operation: UnitOfWorkOperation.UPDATE,
      originalState: originalState || this.cloneObject(entity),
      timestamp: new Date(),
    });
  }

  /**
   * 注册删除对象
   */
  registerRemoved<T extends DomainObject>(entity: T): void {
    this.checkNotCommittingOrRolledBack();

    const id = entity.getId();
    const existing = this.items.get(id);

    if (existing && existing.operation === UnitOfWorkOperation.INSERT) {
      // 如果是新增对象，直接移除
      this.items.delete(id);
    } else {
      this.items.set(id, {
        entity,
        operation: UnitOfWorkOperation.DELETE,
        timestamp: new Date(),
      });
    }
  }

  /**
   * 检查对象是否在工作单元中
   */
  isTracked(entityId: string): boolean {
    return this.items.has(entityId);
  }

  /**
   * 获取跟踪的对象
   */
  getTracked(entityId: string): UnitOfWorkItem | null {
    return this.items.get(entityId) || null;
  }

  /**
   * 获取所有跟踪的对象
   */
  getAllTracked(): UnitOfWorkItem[] {
    return Array.from(this.items.values());
  }

  /**
   * 获取按操作类型分组的对象
   */
  getItemsByOperation(operation: UnitOfWorkOperation): UnitOfWorkItem[] {
    return Array.from(this.items.values()).filter(
      (item) => item.operation === operation
    );
  }

  /**
   * 提交工作单元
   */
  async commit(): Promise<void> {
    if (this.isRolledBack) {
      throw new UnitOfWorkException("工作单元已回滚，无法提交");
    }

    if (this.isCommitting) {
      throw new UnitOfWorkException("工作单元正在提交中");
    }

    this.isCommitting = true;

    try {
      // 开始事务
      await this.beginTransaction();

      // 按顺序执行操作：INSERT -> UPDATE -> DELETE
      await this.executeInserts();
      await this.executeUpdates();
      await this.executeDeletes();

      // 提交事务
      await this.commitTransaction();

      // 清理工作单元
      this.clear();
    } catch (error) {
      await this.rollbackTransaction();
      throw new UnitOfWorkException(
        `工作单元提交失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      this.isCommitting = false;
    }
  }

  /**
   * 回滚工作单元
   */
  async rollback(): Promise<void> {
    this.isRolledBack = true;

    try {
      await this.rollbackTransaction();
    } catch (error) {
      console.error("回滚事务失败:", error);
    }

    this.clear();
  }

  /**
   * 清理工作单元
   */
  clear(): void {
    this.items.clear();
    this.isCommitting = false;
    this.isRolledBack = false;
  }

  /**
   * 开始事务
   */
  private async beginTransaction(): Promise<void> {
    if (!this.queryRunner) {
      this.queryRunner = this.dataSource.createQueryRunner();
      await this.queryRunner.connect();
    }

    if (!this.queryRunner.isTransactionActive) {
      await this.queryRunner.startTransaction();
    }
  }

  /**
   * 提交事务
   */
  private async commitTransaction(): Promise<void> {
    if (this.queryRunner && this.queryRunner.isTransactionActive) {
      await this.queryRunner.commitTransaction();
    }
  }

  /**
   * 回滚事务
   */
  private async rollbackTransaction(): Promise<void> {
    if (this.queryRunner && this.queryRunner.isTransactionActive) {
      await this.queryRunner.rollbackTransaction();
    }

    if (this.queryRunner) {
      await this.queryRunner.release();
      this.queryRunner = null;
    }
  }

  /**
   * 执行插入操作
   */
  private async executeInserts(): Promise<void> {
    const insertItems = this.getItemsByOperation(UnitOfWorkOperation.INSERT);

    for (const item of insertItems) {
      const repository = this.getRepository(item.entity);
      await repository.insert(item.entity, this.queryRunner!);
    }
  }

  /**
   * 执行更新操作
   */
  private async executeUpdates(): Promise<void> {
    const updateItems = this.getItemsByOperation(UnitOfWorkOperation.UPDATE);

    for (const item of updateItems) {
      const repository = this.getRepository(item.entity);
      await repository.update(item.entity, this.queryRunner!);
    }
  }

  /**
   * 执行删除操作
   */
  private async executeDeletes(): Promise<void> {
    const deleteItems = this.getItemsByOperation(UnitOfWorkOperation.DELETE);

    for (const item of deleteItems) {
      const repository = this.getRepository(item.entity);
      await repository.delete(item.entity, this.queryRunner!);
    }
  }

  /**
   * 获取实体对应的仓储
   */
  private getRepository<T extends DomainObject>(
    entity: T
  ): UnitOfWorkRepository<T> {
    const entityType = entity.constructor.name;
    const repository = this.repositories.get(entityType);

    if (!repository) {
      throw new UnitOfWorkException(`未找到实体 ${entityType} 的仓储`);
    }

    return repository;
  }

  /**
   * 检查工作单元状态
   */
  private checkNotCommittingOrRolledBack(): void {
    if (this.isCommitting) {
      throw new UnitOfWorkException("工作单元正在提交中，无法进行此操作");
    }

    if (this.isRolledBack) {
      throw new UnitOfWorkException("工作单元已回滚，无法进行此操作");
    }
  }

  /**
   * 克隆对象
   */
  private cloneObject(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * 获取工作单元统计信息
   */
  getStatistics(): {
    totalItems: number;
    inserts: number;
    updates: number;
    deletes: number;
  } {
    const items = Array.from(this.items.values());
    return {
      totalItems: items.length,
      inserts: items.filter(
        (item) => item.operation === UnitOfWorkOperation.INSERT
      ).length,
      updates: items.filter(
        (item) => item.operation === UnitOfWorkOperation.UPDATE
      ).length,
      deletes: items.filter(
        (item) => item.operation === UnitOfWorkOperation.DELETE
      ).length,
    };
  }
}

/**
 * 工作单元管理器
 * 提供线程安全的工作单元实例管理
 */
export class UnitOfWorkManager {
  private static instance: UnitOfWorkManager;
  private current: UnitOfWork | null = null;

  private constructor(private dataSource: DataSource) {}

  /**
   * 获取单例实例
   */
  static getInstance(dataSource: DataSource): UnitOfWorkManager {
    if (!UnitOfWorkManager.instance) {
      UnitOfWorkManager.instance = new UnitOfWorkManager(dataSource);
    }
    return UnitOfWorkManager.instance;
  }

  /**
   * 创建新的工作单元
   */
  createNew(): UnitOfWork {
    if (this.current) {
      throw new UnitOfWorkException("已存在活动的工作单元");
    }

    this.current = new UnitOfWork(this.dataSource);
    return this.current;
  }

  /**
   * 获取当前工作单元
   */
  getCurrent(): UnitOfWork | null {
    return this.current;
  }

  /**
   * 清理当前工作单元
   */
  clear(): void {
    this.current = null;
  }

  /**
   * 使用工作单元执行操作
   */
  async withUnitOfWork<T>(
    operation: (unitOfWork: UnitOfWork) => Promise<T>
  ): Promise<T> {
    const unitOfWork = this.createNew();

    try {
      const result = await operation(unitOfWork);
      await unitOfWork.commit();
      return result;
    } catch (error) {
      await unitOfWork.rollback();
      throw error;
    } finally {
      this.clear();
    }
  }
}

/**
 * 工作单元装饰器
 */
export function WithUnitOfWork(dataSource: DataSource) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const manager = UnitOfWorkManager.getInstance(dataSource);

    descriptor.value = async function (...args: any[]) {
      return manager.withUnitOfWork(async (unitOfWork: UnitOfWork) => {
        return method.apply(this, [unitOfWork, ...args]);
      });
    };

    return descriptor;
  };
}
