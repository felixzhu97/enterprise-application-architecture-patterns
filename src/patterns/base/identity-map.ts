/**
 * Identity Map（身份映射）模式
 *
 * 确保每个对象只被从数据库加载一次，通过在内存中维护一个映射表
 * 来跟踪已加载的对象，避免重复加载和身份问题。
 *
 * 主要功能：
 * - 维护对象身份一致性
 * - 避免重复数据库查询
 * - 解决对象同步问题
 * - 提高性能
 *
 * 优点：
 * - 确保对象唯一性
 * - 减少数据库访问
 * - 避免更新丢失
 * - 提高性能
 *
 * 缺点：
 * - 内存占用增加
 * - 需要管理缓存失效
 * - 复杂度增加
 *
 * 适用场景：
 * - 需要保证对象唯一性的应用
 * - 频繁访问相同对象的场景
 * - 对象更新频繁的系统
 * - 性能要求高的应用
 */

import { DomainObject } from "./layer-supertype";

/**
 * 身份映射接口
 */
export interface IdentityMap<T extends DomainObject> {
  /**
   * 根据ID获取对象
   */
  get(id: string): T | null;

  /**
   * 添加对象到映射中
   */
  put(id: string, obj: T): void;

  /**
   * 移除对象
   */
  remove(id: string): void;

  /**
   * 检查对象是否存在
   */
  has(id: string): boolean;

  /**
   * 清空映射
   */
  clear(): void;

  /**
   * 获取所有对象
   */
  getAll(): T[];

  /**
   * 获取映射大小
   */
  size(): number;
}

/**
 * 基础身份映射实现
 */
export class BasicIdentityMap<T extends DomainObject>
  implements IdentityMap<T>
{
  private objects: Map<string, T> = new Map();

  get(id: string): T | null {
    return this.objects.get(id) || null;
  }

  put(id: string, obj: T): void {
    this.objects.set(id, obj);
  }

  remove(id: string): void {
    this.objects.delete(id);
  }

  has(id: string): boolean {
    return this.objects.has(id);
  }

  clear(): void {
    this.objects.clear();
  }

  getAll(): T[] {
    return Array.from(this.objects.values());
  }

  size(): number {
    return this.objects.size;
  }
}

/**
 * 带过期时间的身份映射
 */
export class ExpiringIdentityMap<T extends DomainObject>
  implements IdentityMap<T>
{
  private objects: Map<string, { object: T; expiry: number }> = new Map();
  private defaultTtl: number;

  constructor(defaultTtlMs: number = 5 * 60 * 1000) {
    // 默认5分钟
    this.defaultTtl = defaultTtlMs;
  }

  get(id: string): T | null {
    const entry = this.objects.get(id);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.objects.delete(id);
      return null;
    }

    return entry.object;
  }

  put(id: string, obj: T, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTtl;
    const expiry = Date.now() + ttl;
    this.objects.set(id, { object: obj, expiry });
  }

  remove(id: string): void {
    this.objects.delete(id);
  }

  has(id: string): boolean {
    const entry = this.objects.get(id);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiry) {
      this.objects.delete(id);
      return false;
    }

    return true;
  }

  clear(): void {
    this.objects.clear();
  }

  getAll(): T[] {
    const now = Date.now();
    const validObjects: T[] = [];

    for (const [id, entry] of this.objects.entries()) {
      if (now > entry.expiry) {
        this.objects.delete(id);
      } else {
        validObjects.push(entry.object);
      }
    }

    return validObjects;
  }

  size(): number {
    // 清理过期对象
    this.getAll();
    return this.objects.size;
  }

  /**
   * 清理过期对象
   */
  cleanup(): void {
    const now = Date.now();
    for (const [id, entry] of this.objects.entries()) {
      if (now > entry.expiry) {
        this.objects.delete(id);
      }
    }
  }
}

/**
 * 带LRU淘汰策略的身份映射
 */
export class LRUIdentityMap<T extends DomainObject> implements IdentityMap<T> {
  private objects: Map<string, T> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(id: string): T | null {
    const obj = this.objects.get(id);
    if (obj) {
      // 重新插入以更新LRU顺序
      this.objects.delete(id);
      this.objects.set(id, obj);
    }
    return obj || null;
  }

  put(id: string, obj: T): void {
    if (this.objects.has(id)) {
      this.objects.delete(id);
    } else if (this.objects.size >= this.maxSize) {
      // 删除最老的对象
      const firstKey = this.objects.keys().next().value;
      if (firstKey !== undefined) {
        this.objects.delete(firstKey);
      }
    }

    this.objects.set(id, obj);
  }

  remove(id: string): void {
    this.objects.delete(id);
  }

  has(id: string): boolean {
    return this.objects.has(id);
  }

  clear(): void {
    this.objects.clear();
  }

  getAll(): T[] {
    return Array.from(this.objects.values());
  }

  size(): number {
    return this.objects.size;
  }
}

/**
 * 身份映射管理器
 * 管理不同类型的身份映射
 */
export class IdentityMapManager {
  private maps: Map<string, IdentityMap<any>> = new Map();

  /**
   * 注册身份映射
   */
  register<T extends DomainObject>(
    entityType: string,
    map: IdentityMap<T>
  ): void {
    this.maps.set(entityType, map);
  }

  /**
   * 获取身份映射
   */
  getMap<T extends DomainObject>(entityType: string): IdentityMap<T> | null {
    return this.maps.get(entityType) || null;
  }

  /**
   * 获取对象
   */
  get<T extends DomainObject>(entityType: string, id: string): T | null {
    const map = this.getMap<T>(entityType);
    return map ? map.get(id) : null;
  }

  /**
   * 存储对象
   */
  put<T extends DomainObject>(entityType: string, id: string, obj: T): void {
    const map = this.getMap<T>(entityType);
    if (map) {
      map.put(id, obj);
    }
  }

  /**
   * 移除对象
   */
  remove(entityType: string, id: string): void {
    const map = this.getMap(entityType);
    if (map) {
      map.remove(id);
    }
  }

  /**
   * 检查对象是否存在
   */
  has(entityType: string, id: string): boolean {
    const map = this.getMap(entityType);
    return map ? map.has(id) : false;
  }

  /**
   * 清空所有映射
   */
  clearAll(): void {
    for (const map of this.maps.values()) {
      map.clear();
    }
  }

  /**
   * 清空特定类型的映射
   */
  clear(entityType: string): void {
    const map = this.getMap(entityType);
    if (map) {
      map.clear();
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics(): { [entityType: string]: number } {
    const stats: { [entityType: string]: number } = {};
    for (const [entityType, map] of this.maps.entries()) {
      stats[entityType] = map.size();
    }
    return stats;
  }
}

/**
 * 全局身份映射管理器单例
 */
export class GlobalIdentityMapManager {
  private static instance: IdentityMapManager;

  static getInstance(): IdentityMapManager {
    if (!GlobalIdentityMapManager.instance) {
      GlobalIdentityMapManager.instance = new IdentityMapManager();
    }
    return GlobalIdentityMapManager.instance;
  }

  /**
   * 初始化默认映射
   */
  static initialize(): void {
    const manager = GlobalIdentityMapManager.getInstance();

    // 注册默认的身份映射
    manager.register("User", new LRUIdentityMap(500));
    manager.register("Product", new ExpiringIdentityMap(10 * 60 * 1000)); // 10分钟
    manager.register("Order", new BasicIdentityMap());
    manager.register("Category", new ExpiringIdentityMap(30 * 60 * 1000)); // 30分钟
  }
}

/**
 * 身份映射装饰器
 * 为Repository方法添加身份映射功能
 */
export function WithIdentityMap(entityType: string) {
  return function <T extends DomainObject>(
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const manager = GlobalIdentityMapManager.getInstance();

    descriptor.value = async function (...args: any[]) {
      // 对于findById方法，先检查身份映射
      if (propertyName === "findById" && args.length > 0) {
        const id = args[0];
        const cached = manager.get<T>(entityType, id);
        if (cached) {
          return cached;
        }

        const result = await method.apply(this, args);
        if (result) {
          manager.put(entityType, id, result);
        }
        return result;
      }

      // 对于save方法，更新身份映射
      if (propertyName === "save" && args.length > 0) {
        const entity = args[0];
        const result = await method.apply(this, args);
        if (result) {
          manager.put(entityType, result.getId(), result);
        }
        return result;
      }

      // 对于delete方法，从身份映射中移除
      if (propertyName === "delete" && args.length > 0) {
        const id = args[0];
        const result = await method.apply(this, args);
        manager.remove(entityType, id);
        return result;
      }

      return method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * 身份映射助手工具
 */
export class IdentityMapHelper {
  /**
   * 创建基础身份映射
   */
  static createBasic<T extends DomainObject>(): IdentityMap<T> {
    return new BasicIdentityMap<T>();
  }

  /**
   * 创建带过期时间的身份映射
   */
  static createExpiring<T extends DomainObject>(ttlMs: number): IdentityMap<T> {
    return new ExpiringIdentityMap<T>(ttlMs);
  }

  /**
   * 创建LRU身份映射
   */
  static createLRU<T extends DomainObject>(maxSize: number): IdentityMap<T> {
    return new LRUIdentityMap<T>(maxSize);
  }
}

/**
 * 身份映射使用示例
 */
export class IdentityMapExample {
  private userMap: IdentityMap<any>;
  private productMap: IdentityMap<any>;

  constructor() {
    this.userMap = IdentityMapHelper.createLRU(1000);
    this.productMap = IdentityMapHelper.createExpiring(10 * 60 * 1000);
  }

  /**
   * 演示身份映射的使用
   */
  async demonstrateIdentityMapping() {
    console.log("=== 身份映射模式演示 ===");

    // 模拟用户对象
    const user = {
      getId: () => "user-123",
      username: "john_doe",
      email: "john@example.com",
    };

    // 存储到身份映射
    this.userMap.put(user.getId(), user);
    console.log("✓ 用户对象已存储到身份映射");

    // 从身份映射获取
    const cachedUser = this.userMap.get("user-123");
    console.log("✓ 从身份映射获取用户:", cachedUser?.username);

    // 验证对象身份
    console.log("✓ 对象身份一致性:", user === cachedUser);

    // 演示过期映射
    const product = {
      getId: () => "product-456",
      name: "示例产品",
      price: 99.99,
    };

    this.productMap.put(product.getId(), product);
    console.log("✓ 产品对象已存储到过期映射");

    // 获取映射统计
    console.log("✓ 用户映射大小:", this.userMap.size());
    console.log("✓ 产品映射大小:", this.productMap.size());

    this.printIdentityMapGuidelines();
  }

  private printIdentityMapGuidelines(): void {
    console.log(`
身份映射模式使用指南：

1. 基础身份映射 (Basic Identity Map)
   - 适用于对象数量较少的场景
   - 不自动清理，需要手动管理
   - 内存占用可能较大

2. 过期身份映射 (Expiring Identity Map)
   - 适用于数据变更频繁的场景
   - 自动清理过期对象
   - 需要合理设置过期时间

3. LRU身份映射 (LRU Identity Map)
   - 适用于对象数量大的场景
   - 自动淘汰最近最少使用的对象
   - 内存占用可控

最佳实践：
- 根据应用特点选择合适的映射策略
- 监控内存使用情况
- 在事务边界清理映射
- 考虑多线程安全性
- 处理对象更新的一致性问题
    `);
  }
}
