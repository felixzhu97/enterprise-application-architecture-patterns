/**
 * Lazy Load（延迟加载）模式
 *
 * 按需加载关联对象，避免在不需要时加载大量数据。
 * 这个模式通过推迟对象的加载来提高性能。
 *
 * 主要功能：
 * - 延迟加载关联对象
 * - 减少内存占用
 * - 提高初始加载性能
 * - 支持多种加载策略
 *
 * 优点：
 * - 提高性能
 * - 减少内存使用
 * - 按需加载
 * - 支持大对象图
 *
 * 缺点：
 * - 代码复杂度增加
 * - 可能导致N+1查询问题
 * - 需要管理加载状态
 *
 * 适用场景：
 * - 大型对象图
 * - 关联数据较多的实体
 * - 性能要求高的应用
 * - 移动端应用
 */

/**
 * 延迟加载策略枚举
 */
export enum LazyLoadStrategy {
  VIRTUAL_PROXY = "VIRTUAL_PROXY",
  VALUE_HOLDER = "VALUE_HOLDER",
  GHOST = "GHOST",
}

/**
 * 数据加载器接口
 */
export interface DataLoader<T> {
  load(id: string): Promise<T>;
  loadMany(ids: string[]): Promise<T[]>;
}

/**
 * 延迟加载异常
 */
export class LazyLoadException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "LazyLoadException";
  }
}

/**
 * 延迟加载状态
 */
export enum LazyLoadState {
  NOT_LOADED = "NOT_LOADED",
  LOADING = "LOADING",
  LOADED = "LOADED",
  ERROR = "ERROR",
}

// ======================== 1. Virtual Proxy（虚拟代理）========================

/**
 * 虚拟代理基类
 */
export abstract class VirtualProxy<T> {
  protected realObject: T | null = null;
  protected loadState: LazyLoadState = LazyLoadState.NOT_LOADED;
  protected loadPromise: Promise<T> | null = null;
  protected error: Error | null = null;

  constructor(protected objectId: string, protected loader: DataLoader<T>) {}

  /**
   * 确保对象已加载
   */
  protected async ensureLoaded(): Promise<T> {
    if (this.loadState === LazyLoadState.LOADED && this.realObject) {
      return this.realObject;
    }

    if (this.loadState === LazyLoadState.ERROR) {
      throw this.error || new LazyLoadException("对象加载失败");
    }

    if (this.loadState === LazyLoadState.LOADING && this.loadPromise) {
      return await this.loadPromise;
    }

    this.loadState = LazyLoadState.LOADING;
    this.loadPromise = this.loader.load(this.objectId);

    try {
      this.realObject = await this.loadPromise;
      this.loadState = LazyLoadState.LOADED;
      return this.realObject;
    } catch (error) {
      this.error = error as Error;
      this.loadState = LazyLoadState.ERROR;
      throw new LazyLoadException(
        `加载对象 ${this.objectId} 失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * 检查对象是否已加载
   */
  isLoaded(): boolean {
    return this.loadState === LazyLoadState.LOADED;
  }

  /**
   * 获取加载状态
   */
  getLoadState(): LazyLoadState {
    return this.loadState;
  }

  /**
   * 重置加载状态
   */
  reset(): void {
    this.realObject = null;
    this.loadState = LazyLoadState.NOT_LOADED;
    this.loadPromise = null;
    this.error = null;
  }
}

/**
 * 用户虚拟代理示例
 */
export class UserVirtualProxy extends VirtualProxy<any> {
  constructor(userId: string, loader: DataLoader<any>) {
    super(userId, loader);
  }

  async getUsername(): Promise<string> {
    const user = await this.ensureLoaded();
    return user.username;
  }

  async getEmail(): Promise<string> {
    const user = await this.ensureLoaded();
    return user.email;
  }

  async getProfile(): Promise<any> {
    const user = await this.ensureLoaded();
    return user.profile;
  }
}

// ======================== 2. Value Holder（值持有者）========================

/**
 * 值持有者
 */
export class ValueHolder<T> {
  private value: T | null = null;
  private loadState: LazyLoadState = LazyLoadState.NOT_LOADED;
  private loadPromise: Promise<T> | null = null;
  private error: Error | null = null;

  constructor(private loader: () => Promise<T>, private initialValue?: T) {
    if (initialValue !== undefined) {
      this.value = initialValue;
      this.loadState = LazyLoadState.LOADED;
    }
  }

  /**
   * 获取值
   */
  async getValue(): Promise<T> {
    if (this.loadState === LazyLoadState.LOADED && this.value !== null) {
      return this.value;
    }

    if (this.loadState === LazyLoadState.ERROR) {
      throw this.error || new LazyLoadException("值加载失败");
    }

    if (this.loadState === LazyLoadState.LOADING && this.loadPromise) {
      return await this.loadPromise;
    }

    this.loadState = LazyLoadState.LOADING;
    this.loadPromise = this.loader();

    try {
      this.value = await this.loadPromise;
      this.loadState = LazyLoadState.LOADED;
      return this.value;
    } catch (error) {
      this.error = error as Error;
      this.loadState = LazyLoadState.ERROR;
      throw new LazyLoadException(
        `加载值失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * 设置值
   */
  setValue(value: T): void {
    this.value = value;
    this.loadState = LazyLoadState.LOADED;
    this.error = null;
  }

  /**
   * 检查是否已加载
   */
  isLoaded(): boolean {
    return this.loadState === LazyLoadState.LOADED;
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.value = null;
    this.loadState = LazyLoadState.NOT_LOADED;
    this.loadPromise = null;
    this.error = null;
  }
}

// ======================== 3. Ghost（幽灵对象）========================

/**
 * 幽灵对象基类
 */
export abstract class Ghost<T> {
  protected isLoaded: boolean = false;
  protected loadPromise: Promise<void> | null = null;

  constructor(protected objectId: string, protected loader: DataLoader<T>) {}

  /**
   * 加载对象数据
   */
  protected async load(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }

    this.loadPromise = this.doLoad();
    await this.loadPromise;
    this.loadPromise = null;
  }

  /**
   * 执行实际加载
   */
  private async doLoad(): Promise<void> {
    try {
      const data = await this.loader.load(this.objectId);
      this.populateFromData(data);
      this.isLoaded = true;
    } catch (error) {
      throw new LazyLoadException(
        `加载Ghost对象 ${this.objectId} 失败: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * 从数据填充对象
   */
  protected abstract populateFromData(data: T): void;

  /**
   * 检查是否已加载
   */
  getIsLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.isLoaded = false;
    this.loadPromise = null;
  }
}

/**
 * 用户Ghost对象示例
 */
export class UserGhost extends Ghost<any> {
  private username: string = "";
  private email: string = "";
  private profile: any = null;

  constructor(userId: string, loader: DataLoader<any>) {
    super(userId, loader);
  }

  async getUsername(): Promise<string> {
    await this.load();
    return this.username;
  }

  async getEmail(): Promise<string> {
    await this.load();
    return this.email;
  }

  async getProfile(): Promise<any> {
    await this.load();
    return this.profile;
  }

  protected populateFromData(data: any): void {
    this.username = data.username;
    this.email = data.email;
    this.profile = data.profile;
  }
}

// ======================== 延迟加载集合 ========================

/**
 * 延迟加载集合
 */
export class LazyList<T> {
  private items: T[] | null = null;
  private loadState: LazyLoadState = LazyLoadState.NOT_LOADED;
  private loadPromise: Promise<T[]> | null = null;

  constructor(private loader: () => Promise<T[]>, private initialItems?: T[]) {
    if (initialItems) {
      this.items = initialItems;
      this.loadState = LazyLoadState.LOADED;
    }
  }

  /**
   * 获取所有项目
   */
  async getAll(): Promise<T[]> {
    if (this.loadState === LazyLoadState.LOADED && this.items) {
      return this.items;
    }

    if (this.loadState === LazyLoadState.LOADING && this.loadPromise) {
      return await this.loadPromise;
    }

    this.loadState = LazyLoadState.LOADING;
    this.loadPromise = this.loader();

    try {
      this.items = await this.loadPromise;
      this.loadState = LazyLoadState.LOADED;
      return this.items;
    } catch (error) {
      this.loadState = LazyLoadState.ERROR;
      throw new LazyLoadException(
        `加载列表失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * 获取项目数量
   */
  async getCount(): Promise<number> {
    const items = await this.getAll();
    return items.length;
  }

  /**
   * 检查是否为空
   */
  async isEmpty(): Promise<boolean> {
    return (await this.getCount()) === 0;
  }

  /**
   * 添加项目
   */
  async add(item: T): Promise<void> {
    const items = await this.getAll();
    items.push(item);
  }

  /**
   * 移除项目
   */
  async remove(item: T): Promise<boolean> {
    const items = await this.getAll();
    const index = items.indexOf(item);
    if (index > -1) {
      items.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 检查是否已加载
   */
  isLoaded(): boolean {
    return this.loadState === LazyLoadState.LOADED;
  }
}

// ======================== 延迟加载工厂 ========================

/**
 * 延迟加载工厂
 */
export class LazyLoadFactory {
  /**
   * 创建虚拟代理
   */
  static createVirtualProxy<T>(
    objectId: string,
    loader: DataLoader<T>,
    proxyClass: new (id: string, loader: DataLoader<T>) => VirtualProxy<T>
  ): VirtualProxy<T> {
    return new proxyClass(objectId, loader);
  }

  /**
   * 创建值持有者
   */
  static createValueHolder<T>(
    loader: () => Promise<T>,
    initialValue?: T
  ): ValueHolder<T> {
    return new ValueHolder(loader, initialValue);
  }

  /**
   * 创建Ghost对象
   */
  static createGhost<T>(
    objectId: string,
    loader: DataLoader<T>,
    ghostClass: new (id: string, loader: DataLoader<T>) => Ghost<T>
  ): Ghost<T> {
    return new ghostClass(objectId, loader);
  }

  /**
   * 创建延迟加载列表
   */
  static createLazyList<T>(
    loader: () => Promise<T[]>,
    initialItems?: T[]
  ): LazyList<T> {
    return new LazyList(loader, initialItems);
  }
}

// ======================== 延迟加载管理器 ========================

/**
 * 延迟加载管理器
 */
export class LazyLoadManager {
  private static instance: LazyLoadManager;
  private loaders: Map<string, DataLoader<any>> = new Map();
  private cache: Map<string, any> = new Map();

  static getInstance(): LazyLoadManager {
    if (!LazyLoadManager.instance) {
      LazyLoadManager.instance = new LazyLoadManager();
    }
    return LazyLoadManager.instance;
  }

  /**
   * 注册数据加载器
   */
  registerLoader<T>(entityType: string, loader: DataLoader<T>): void {
    this.loaders.set(entityType, loader);
  }

  /**
   * 获取数据加载器
   */
  getLoader<T>(entityType: string): DataLoader<T> | null {
    return this.loaders.get(entityType) || null;
  }

  /**
   * 创建延迟加载代理
   */
  createLazyProxy<T>(
    entityType: string,
    objectId: string,
    strategy: LazyLoadStrategy = LazyLoadStrategy.VIRTUAL_PROXY
  ): any {
    const loader = this.getLoader<T>(entityType);
    if (!loader) {
      throw new LazyLoadException(`未找到实体类型 ${entityType} 的加载器`);
    }

    const cacheKey = `${entityType}:${objectId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let proxy: any;
    switch (strategy) {
      case LazyLoadStrategy.VIRTUAL_PROXY:
        proxy = new UserVirtualProxy(objectId, loader);
        break;
      case LazyLoadStrategy.VALUE_HOLDER:
        proxy = new ValueHolder(() => loader.load(objectId));
        break;
      case LazyLoadStrategy.GHOST:
        proxy = new UserGhost(objectId, loader);
        break;
      default:
        throw new LazyLoadException(`不支持的延迟加载策略: ${strategy}`);
    }

    this.cache.set(cacheKey, proxy);
    return proxy;
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// ======================== 延迟加载装饰器 ========================

/**
 * 延迟加载装饰器
 */
export function LazyLoad(
  strategy: LazyLoadStrategy = LazyLoadStrategy.VIRTUAL_PROXY
) {
  return function (target: any, propertyKey: string) {
    const privateKey = `_${propertyKey}`;
    const loadedKey = `_${propertyKey}_loaded`;

    Object.defineProperty(target, propertyKey, {
      get: async function () {
        if (!this[loadedKey] && this[privateKey]) {
          if (strategy === LazyLoadStrategy.VIRTUAL_PROXY) {
            this[privateKey] = await this[privateKey].ensureLoaded();
          } else if (strategy === LazyLoadStrategy.VALUE_HOLDER) {
            this[privateKey] = await this[privateKey].getValue();
          } else if (strategy === LazyLoadStrategy.GHOST) {
            await this[privateKey].load();
          }
          this[loadedKey] = true;
        }
        return this[privateKey];
      },
      set: function (value: any) {
        this[privateKey] = value;
        this[loadedKey] = true;
      },
      configurable: true,
      enumerable: true,
    });
  };
}

// ======================== 使用示例 ========================

/**
 * 延迟加载使用示例
 */
export class LazyLoadExample {
  private userLoader: DataLoader<any>;
  private orderLoader: DataLoader<any>;

  constructor() {
    this.userLoader = {
      load: async (id: string) => {
        // 模拟数据库查询
        console.log(`Loading user ${id}...`);
        return { id, username: `user_${id}`, email: `user_${id}@example.com` };
      },
      loadMany: async (ids: string[]) => {
        console.log(`Loading users ${ids.join(", ")}...`);
        return ids.map((id) => ({
          id,
          username: `user_${id}`,
          email: `user_${id}@example.com`,
        }));
      },
    };

    this.orderLoader = {
      load: async (id: string) => {
        console.log(`Loading order ${id}...`);
        return { id, total: 100, items: [`item_${id}_1`, `item_${id}_2`] };
      },
      loadMany: async (ids: string[]) => {
        console.log(`Loading orders ${ids.join(", ")}...`);
        return ids.map((id) => ({
          id,
          total: 100,
          items: [`item_${id}_1`, `item_${id}_2`],
        }));
      },
    };
  }

  /**
   * 演示延迟加载模式
   */
  async demonstrateLazyLoading() {
    console.log("=== 延迟加载模式演示 ===");

    // 1. 虚拟代理示例
    console.log("\n1. 虚拟代理示例:");
    const userProxy = new UserVirtualProxy("user123", this.userLoader);
    console.log("✓ 用户代理已创建，但尚未加载数据");

    const username = await userProxy.getUsername();
    console.log(`✓ 用户名: ${username}`);

    const email = await userProxy.getEmail();
    console.log(`✓ 邮箱: ${email} (从缓存获取)`);

    // 2. 值持有者示例
    console.log("\n2. 值持有者示例:");
    const orderHolder = new ValueHolder(() =>
      this.orderLoader.load("order456")
    );
    console.log("✓ 订单值持有者已创建");

    const order = await orderHolder.getValue();
    console.log(`✓ 订单总额: ${order.total}`);

    // 3. 延迟加载列表示例
    console.log("\n3. 延迟加载列表示例:");
    const lazyOrders = new LazyList(() =>
      this.orderLoader.loadMany(["order1", "order2", "order3"])
    );
    console.log("✓ 延迟加载列表已创建");

    const orders = await lazyOrders.getAll();
    console.log(`✓ 加载了 ${orders.length} 个订单`);

    this.printLazyLoadGuidelines();
  }

  private printLazyLoadGuidelines(): void {
    console.log(`
延迟加载模式使用指南：

1. 虚拟代理 (Virtual Proxy)
   - 适用于复杂对象的延迟加载
   - 提供与真实对象相同的接口
   - 支持透明的延迟加载

2. 值持有者 (Value Holder)
   - 适用于简单值的延迟加载
   - 轻量级实现
   - 支持预设初始值

3. 幽灵对象 (Ghost)
   - 适用于部分数据已知的场景
   - 对象先存在，后加载完整数据
   - 适合ORM框架使用

4. 延迟加载列表
   - 适用于集合数据的延迟加载
   - 支持常见的列表操作
   - 避免加载大量数据

最佳实践：
- 根据使用场景选择合适的策略
- 注意N+1查询问题
- 考虑使用批量加载
- 处理加载失败的情况
- 监控加载性能
    `);
  }
}
