/**
 * Registry（注册表）模式
 *
 * 提供一个全局的查找机制，让对象可以被其他对象找到和使用。
 * 这是一个众所周知的对象，其他对象可以通过它来查找公共对象和服务。
 *
 * 主要功能：
 * - 全局对象存储和查找
 * - 服务定位
 * - 单例对象管理
 * - 配置管理
 *
 * 优点：
 * - 提供全局访问点
 * - 解耦对象创建和使用
 * - 简化对象查找
 * - 支持延迟创建
 *
 * 缺点：
 * - 可能成为全局状态
 * - 难以测试
 * - 隐藏依赖关系
 * - 可能导致紧耦合
 *
 * 适用场景：
 * - 服务定位器
 * - 单例管理
 * - 配置管理
 * - 全局缓存
 * - 资源管理
 */

/**
 * 注册表异常
 */
export class RegistryException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "RegistryException";
  }
}

/**
 * 注册表条目
 */
export interface RegistryEntry<T> {
  value: T;
  metadata?: {
    createdAt: Date;
    lastAccessed: Date;
    accessCount: number;
    tags?: string[];
    description?: string;
    version?: string;
  };
}

/**
 * 对象工厂接口
 */
export interface ObjectFactory<T> {
  create(): T;
  destroy?(instance: T): void;
}

/**
 * 注册表接口
 */
export interface IRegistry {
  /**
   * 注册对象
   */
  register<T>(key: string, value: T): void;

  /**
   * 注册工厂
   */
  registerFactory<T>(key: string, factory: ObjectFactory<T>): void;

  /**
   * 获取对象
   */
  get<T>(key: string): T | null;

  /**
   * 检查是否存在
   */
  has(key: string): boolean;

  /**
   * 取消注册
   */
  unregister(key: string): void;

  /**
   * 清空注册表
   */
  clear(): void;

  /**
   * 获取所有键
   */
  getAllKeys(): string[];

  /**
   * 获取条目数量
   */
  size(): number;
}

/**
 * 基础注册表实现
 */
export class BasicRegistry implements IRegistry {
  private entries: Map<string, RegistryEntry<any>> = new Map();
  private factories: Map<string, ObjectFactory<any>> = new Map();

  register<T>(key: string, value: T): void {
    if (!key || key.trim() === "") {
      throw new RegistryException("注册键不能为空");
    }

    this.entries.set(key, {
      value,
      metadata: {
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 0,
        tags: [],
        description: `Registry entry for ${key}`,
      },
    });
  }

  registerFactory<T>(key: string, factory: ObjectFactory<T>): void {
    if (!key || key.trim() === "") {
      throw new RegistryException("注册键不能为空");
    }

    this.factories.set(key, factory);
  }

  get<T>(key: string): T | null {
    // 首先检查直接注册的对象
    const entry = this.entries.get(key);
    if (entry) {
      this.updateAccessMetadata(key);
      return entry.value as T;
    }

    // 然后检查工厂
    const factory = this.factories.get(key);
    if (factory) {
      try {
        const instance = factory.create();
        this.register(key, instance);
        return instance as T;
      } catch (error) {
        throw new RegistryException(
          `使用工厂创建对象失败: ${key}`,
          error as Error
        );
      }
    }

    return null;
  }

  has(key: string): boolean {
    return this.entries.has(key) || this.factories.has(key);
  }

  unregister(key: string): void {
    const entry = this.entries.get(key);
    if (entry) {
      this.entries.delete(key);
    }

    const factory = this.factories.get(key);
    if (factory) {
      this.factories.delete(key);
    }
  }

  clear(): void {
    this.entries.clear();
    this.factories.clear();
  }

  getAllKeys(): string[] {
    const keys = new Set<string>();
    this.entries.forEach((_, key) => keys.add(key));
    this.factories.forEach((_, key) => keys.add(key));
    return Array.from(keys);
  }

  size(): number {
    return this.getAllKeys().length;
  }

  /**
   * 更新访问元数据
   */
  private updateAccessMetadata(key: string): void {
    const entry = this.entries.get(key);
    if (entry && entry.metadata) {
      entry.metadata.lastAccessed = new Date();
      entry.metadata.accessCount++;
    }
  }

  /**
   * 获取注册表统计信息
   */
  getStatistics(): {
    totalEntries: number;
    directEntries: number;
    factories: number;
    mostAccessed: { key: string; count: number } | null;
  } {
    let mostAccessed: { key: string; count: number } | null = null;
    let maxCount = 0;

    this.entries.forEach((entry, key) => {
      if (entry.metadata && entry.metadata.accessCount > maxCount) {
        maxCount = entry.metadata.accessCount;
        mostAccessed = { key, count: maxCount };
      }
    });

    return {
      totalEntries: this.getAllKeys().length,
      directEntries: this.entries.size,
      factories: this.factories.size,
      mostAccessed,
    };
  }
}

/**
 * 分层注册表
 * 支持父子关系的注册表
 */
export class HierarchicalRegistry implements IRegistry {
  private parent: IRegistry | null = null;
  private local: IRegistry = new BasicRegistry();

  constructor(parent?: IRegistry) {
    this.parent = parent || null;
  }

  register<T>(key: string, value: T): void {
    this.local.register(key, value);
  }

  registerFactory<T>(key: string, factory: ObjectFactory<T>): void {
    this.local.registerFactory(key, factory);
  }

  get<T>(key: string): T | null {
    // 先查找本地
    const localResult = this.local.get<T>(key);
    if (localResult !== null) {
      return localResult;
    }

    // 再查找父级
    if (this.parent) {
      return this.parent.get<T>(key);
    }

    return null;
  }

  has(key: string): boolean {
    return this.local.has(key) || (this.parent ? this.parent.has(key) : false);
  }

  unregister(key: string): void {
    this.local.unregister(key);
  }

  clear(): void {
    this.local.clear();
  }

  getAllKeys(): string[] {
    const keys = new Set<string>();

    // 添加本地键
    this.local.getAllKeys().forEach((key) => keys.add(key));

    // 添加父级键
    if (this.parent) {
      this.parent.getAllKeys().forEach((key) => keys.add(key));
    }

    return Array.from(keys);
  }

  size(): number {
    return this.getAllKeys().length;
  }

  /**
   * 创建子注册表
   */
  createChild(): HierarchicalRegistry {
    return new HierarchicalRegistry(this);
  }
}

/**
 * 线程安全的注册表
 */
export class ThreadSafeRegistry implements IRegistry {
  private registry: IRegistry = new BasicRegistry();
  private locks: Map<string, boolean> = new Map();

  register<T>(key: string, value: T): void {
    this.withLock(key, () => {
      this.registry.register(key, value);
    });
  }

  registerFactory<T>(key: string, factory: ObjectFactory<T>): void {
    this.withLock(key, () => {
      this.registry.registerFactory(key, factory);
    });
  }

  get<T>(key: string): T | null {
    return this.withLock(key, () => {
      return this.registry.get<T>(key);
    });
  }

  has(key: string): boolean {
    return this.withLock(key, () => {
      return this.registry.has(key);
    });
  }

  unregister(key: string): void {
    this.withLock(key, () => {
      this.registry.unregister(key);
    });
  }

  clear(): void {
    this.locks.clear();
    this.registry.clear();
  }

  getAllKeys(): string[] {
    return this.registry.getAllKeys();
  }

  size(): number {
    return this.registry.size();
  }

  /**
   * 带锁执行操作
   */
  private withLock<T>(key: string, operation: () => T): T {
    // 简单的锁机制（在实际应用中可能需要更复杂的实现）
    while (this.locks.get(key)) {
      // 等待锁释放
    }

    this.locks.set(key, true);
    try {
      return operation();
    } finally {
      this.locks.delete(key);
    }
  }
}

/**
 * 全局注册表管理器
 */
export class GlobalRegistry {
  private static instance: IRegistry;
  private static registries: Map<string, IRegistry> = new Map();

  /**
   * 获取默认注册表
   */
  static getInstance(): IRegistry {
    if (!GlobalRegistry.instance) {
      GlobalRegistry.instance = new BasicRegistry();
    }
    return GlobalRegistry.instance;
  }

  /**
   * 设置默认注册表
   */
  static setInstance(registry: IRegistry): void {
    GlobalRegistry.instance = registry;
  }

  /**
   * 获取命名注册表
   */
  static getRegistry(name: string): IRegistry {
    if (!GlobalRegistry.registries.has(name)) {
      GlobalRegistry.registries.set(name, new BasicRegistry());
    }
    return GlobalRegistry.registries.get(name)!;
  }

  /**
   * 设置命名注册表
   */
  static setRegistry(name: string, registry: IRegistry): void {
    GlobalRegistry.registries.set(name, registry);
  }

  /**
   * 移除命名注册表
   */
  static removeRegistry(name: string): void {
    GlobalRegistry.registries.delete(name);
  }

  /**
   * 清空所有注册表
   */
  static clearAll(): void {
    if (GlobalRegistry.instance) {
      GlobalRegistry.instance.clear();
    }
    GlobalRegistry.registries.forEach((registry) => registry.clear());
    GlobalRegistry.registries.clear();
  }
}

/**
 * 服务注册表
 * 专门用于服务定位的注册表
 */
export class ServiceRegistry extends BasicRegistry {
  private singletons: Map<string, any> = new Map();

  /**
   * 注册单例服务
   */
  registerSingleton<T>(key: string, factory: ObjectFactory<T>): void {
    this.registerFactory(key, {
      create: () => {
        if (!this.singletons.has(key)) {
          this.singletons.set(key, factory.create());
        }
        return this.singletons.get(key);
      },
      destroy: factory.destroy,
    });
  }

  /**
   * 注册瞬态服务
   */
  registerTransient<T>(key: string, factory: ObjectFactory<T>): void {
    this.registerFactory(key, factory);
  }

  /**
   * 获取服务
   */
  getService<T>(key: string): T {
    const service = this.get<T>(key);
    if (!service) {
      throw new RegistryException(`服务未注册: ${key}`);
    }
    return service;
  }

  /**
   * 获取所有单例
   */
  getAllSingletons(): Map<string, any> {
    return new Map(this.singletons);
  }

  /**
   * 销毁单例
   */
  destroySingleton(key: string): void {
    const instance = this.singletons.get(key);
    if (instance) {
      const factory = (this as any).factories.get(key);
      if (factory && factory.destroy) {
        factory.destroy(instance);
      }
      this.singletons.delete(key);
    }
  }

  /**
   * 销毁所有单例
   */
  destroyAllSingletons(): void {
    this.singletons.forEach((instance, key) => {
      this.destroySingleton(key);
    });
  }
}

/**
 * 配置注册表
 * 专门用于配置管理的注册表
 */
export class ConfigurationRegistry extends BasicRegistry {
  private readonly defaultValues: Map<string, any> = new Map();

  /**
   * 设置默认值
   */
  setDefault(key: string, value: any): void {
    this.defaultValues.set(key, value);
  }

  /**
   * 获取配置值
   */
  getValue<T>(key: string): T {
    const value = this.get<T>(key);
    if (value !== null) {
      return value;
    }

    const defaultValue = this.defaultValues.get(key);
    if (defaultValue !== undefined) {
      return defaultValue as T;
    }

    throw new RegistryException(`配置项未找到: ${key}`);
  }

  /**
   * 获取可选配置值
   */
  getOptionalValue<T>(key: string): T | null {
    const value = this.get<T>(key);
    if (value !== null) {
      return value;
    }

    const defaultValue = this.defaultValues.get(key);
    return defaultValue !== undefined ? (defaultValue as T) : null;
  }

  /**
   * 加载配置
   */
  loadConfiguration(config: { [key: string]: any }): void {
    Object.entries(config).forEach(([key, value]) => {
      this.register(key, value);
    });
  }

  /**
   * 获取所有配置
   */
  getAllConfiguration(): { [key: string]: any } {
    const config: { [key: string]: any } = {};

    // 添加默认值
    this.defaultValues.forEach((value, key) => {
      config[key] = value;
    });

    // 覆盖已设置的值
    this.getAllKeys().forEach((key) => {
      const value = this.get(key);
      if (value !== null) {
        config[key] = value;
      }
    });

    return config;
  }
}

/**
 * 注册表装饰器
 */
export function RegisterService(key: string, registry?: IRegistry) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const targetRegistry = registry || GlobalRegistry.getInstance();

    targetRegistry.registerFactory(key, {
      create: () => new constructor(),
    });

    return constructor;
  };
}

/**
 * 注册表使用示例
 */
export class RegistryExample {
  private userRegistry: IRegistry;
  private serviceRegistry: ServiceRegistry;
  private configRegistry: ConfigurationRegistry;

  constructor() {
    this.userRegistry = new BasicRegistry();
    this.serviceRegistry = new ServiceRegistry();
    this.configRegistry = new ConfigurationRegistry();
  }

  /**
   * 演示注册表的使用
   */
  async demonstrateRegistry() {
    console.log("=== 注册表模式演示 ===");

    // 1. 基础注册表
    console.log("\n1. 基础注册表:");
    this.userRegistry.register("currentUser", { id: 1, name: "John Doe" });
    this.userRegistry.register("theme", "dark");

    const user = this.userRegistry.get("currentUser");
    const theme = this.userRegistry.get("theme");
    console.log("✓ 当前用户:", (user as any)?.name);
    console.log("✓ 主题:", theme);

    // 2. 工厂注册
    console.log("\n2. 工厂注册:");
    this.userRegistry.registerFactory("logger", {
      create: () => {
        console.log("创建Logger实例");
        return { log: (msg: string) => console.log(`[LOG] ${msg}`) };
      },
    });

    const logger = this.userRegistry.get("logger");
    (logger as any)?.log("这是一条测试日志");

    // 3. 服务注册表
    console.log("\n3. 服务注册表:");
    this.serviceRegistry.registerSingleton("database", {
      create: () => {
        console.log("创建数据库连接");
        return { query: (sql: string) => `执行SQL: ${sql}` };
      },
    });

    const db1 = this.serviceRegistry.getService("database");
    const db2 = this.serviceRegistry.getService("database");
    console.log("✓ 单例验证:", db1 === db2);

    // 4. 配置注册表
    console.log("\n4. 配置注册表:");
    this.configRegistry.setDefault("maxConnections", 100);
    this.configRegistry.setDefault("timeout", 30000);
    this.configRegistry.register("appName", "企业应用架构演示");

    console.log("✓ 应用名称:", this.configRegistry.getValue("appName"));
    console.log(
      "✓ 最大连接数:",
      this.configRegistry.getValue("maxConnections")
    );

    // 5. 分层注册表
    console.log("\n5. 分层注册表:");
    const parentRegistry = new BasicRegistry();
    parentRegistry.register("global", "全局配置");

    const childRegistry = new HierarchicalRegistry(parentRegistry);
    childRegistry.register("local", "本地配置");

    console.log("✓ 本地配置:", childRegistry.get("local"));
    console.log("✓ 全局配置:", childRegistry.get("global"));

    // 6. 全局注册表
    console.log("\n6. 全局注册表:");
    const globalRegistry = GlobalRegistry.getInstance();
    globalRegistry.register("version", "1.0.0");

    const appRegistry = GlobalRegistry.getRegistry("app");
    appRegistry.register("status", "running");

    console.log("✓ 版本:", globalRegistry.get("version"));
    console.log("✓ 状态:", appRegistry.get("status"));

    this.printRegistryGuidelines();
  }

  private printRegistryGuidelines(): void {
    console.log(`
注册表模式使用指南：

设计原则：
- 单一职责：每个注册表只管理特定类型的对象
- 延迟创建：使用工厂模式延迟对象创建
- 生命周期管理：合理管理对象的生命周期
- 线程安全：在多线程环境中保证安全性

实现类型：
- 基础注册表：简单的键值对存储
- 分层注册表：支持父子关系的注册表
- 服务注册表：专门用于服务定位
- 配置注册表：专门用于配置管理

使用场景：
- 服务定位器模式
- 依赖注入容器
- 配置管理系统
- 单例对象管理
- 全局缓存机制

注意事项：
- 避免过度使用全局状态
- 考虑依赖注入作为替代方案
- 提供清晰的错误处理
- 监控注册表的使用情况
- 考虑对象的生命周期管理
    `);
  }
}
