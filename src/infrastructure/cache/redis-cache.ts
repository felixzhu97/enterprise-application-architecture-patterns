/**
 * Redis 缓存实现
 * 演示缓存模式和配置
 */

/**
 * 缓存接口
 */
export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getMultiple<T>(keys: string[]): Promise<(T | null)[]>;
  setMultiple<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<void>;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  database?: number;
  defaultTTL: number;
  keyPrefix: string;
}

/**
 * Redis 缓存实现
 */
export class RedisCacheService implements CacheService {
  private client: any; // Redis client
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.initializeClient();
  }

  /**
   * 初始化Redis客户端
   */
  private initializeClient(): void {
    // 这里应该初始化实际的Redis客户端
    // 简化实现，使用内存Map模拟
    this.client = new Map<string, { value: any; expiresAt: number }>();
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const cached = this.client.get(fullKey);

      if (!cached) {
        return null;
      }

      // 检查是否过期
      if (Date.now() > cached.expiresAt) {
        this.client.delete(fullKey);
        return null;
      }

      return cached.value as T;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const ttl = ttlSeconds || this.config.defaultTTL;
      const expiresAt = Date.now() + ttl * 1000;

      this.client.set(fullKey, {
        value,
        expiresAt,
      });
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      this.client.delete(fullKey);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      const cached = this.client.get(fullKey);

      if (!cached) {
        return false;
      }

      // 检查是否过期
      if (Date.now() > cached.expiresAt) {
        this.client.delete(fullKey);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Cache exists error:", error);
      return false;
    }
  }

  /**
   * 清空缓存
   */
  async clear(): Promise<void> {
    try {
      this.client.clear();
    } catch (error) {
      console.error("Cache clear error:", error);
    }
  }

  /**
   * 批量获取
   */
  async getMultiple<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];

    for (const key of keys) {
      results.push(await this.get<T>(key));
    }

    return results;
  }

  /**
   * 批量设置
   */
  async setMultiple<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.ttl);
    }
  }

  /**
   * 获取完整的缓存键
   */
  private getFullKey(key: string): string {
    return `${this.config.keyPrefix}:${key}`;
  }
}

/**
 * 缓存装饰器
 */
export function Cacheable(keyPrefix: string, ttlSeconds?: number) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 生成缓存键
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;

      // 获取缓存服务实例（这里应该从DI容器获取）
      const cacheService: CacheService = getCacheService();

      // 尝试从缓存获取
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // 执行原方法
      const result = await method.apply(this, args);

      // 缓存结果
      if (result !== null && result !== undefined) {
        await cacheService.set(cacheKey, result, ttlSeconds);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存失效装饰器
 */
export function CacheEvict(keyPattern: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 执行原方法
      const result = await method.apply(this, args);

      // 清除相关缓存
      const cacheService: CacheService = getCacheService();
      const cacheKey = keyPattern.replace(/\{(\d+)\}/g, (match, index) => {
        return args[parseInt(index)] || match;
      });

      await cacheService.delete(cacheKey);

      return result;
    };

    return descriptor;
  };
}

/**
 * 获取缓存服务实例（简化实现）
 */
function getCacheService(): CacheService {
  // 这里应该从依赖注入容器获取实例
  // 简化实现
  return new RedisCacheService({
    host: "localhost",
    port: 6379,
    defaultTTL: 3600,
    keyPrefix: "ecommerce",
  });
}

/**
 * 用户缓存服务
 */
export class UserCacheService {
  constructor(private cacheService: CacheService) {}

  /**
   * 缓存用户信息
   */
  async cacheUser(userId: string, userData: any): Promise<void> {
    const key = `user:${userId}`;
    await this.cacheService.set(key, userData, 1800); // 30分钟
  }

  /**
   * 获取缓存的用户信息
   */
  async getCachedUser(userId: string): Promise<any | null> {
    const key = `user:${userId}`;
    return await this.cacheService.get(key);
  }

  /**
   * 缓存用户权限
   */
  async cacheUserPermissions(
    userId: string,
    permissions: string[]
  ): Promise<void> {
    const key = `user:permissions:${userId}`;
    await this.cacheService.set(key, permissions, 3600); // 1小时
  }

  /**
   * 获取缓存的用户权限
   */
  async getCachedUserPermissions(userId: string): Promise<string[] | null> {
    const key = `user:permissions:${userId}`;
    return await this.cacheService.get(key);
  }

  /**
   * 清除用户相关缓存
   */
  async clearUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.cacheService.delete(`user:${userId}`),
      this.cacheService.delete(`user:permissions:${userId}`),
      this.cacheService.delete(`user:profile:${userId}`),
    ]);
  }
}

/**
 * 产品缓存服务
 */
export class ProductCacheService {
  constructor(private cacheService: CacheService) {}

  /**
   * 缓存产品信息
   */
  @Cacheable("product", 7200) // 2小时
  async getProduct(productId: string): Promise<any> {
    // 这里应该从数据库加载产品
    // 简化实现
    return { id: productId, name: "Sample Product" };
  }

  /**
   * 缓存产品列表
   */
  @Cacheable("products:list", 1800) // 30分钟
  async getProductList(page: number, pageSize: number): Promise<any[]> {
    // 这里应该从数据库加载产品列表
    return [];
  }

  /**
   * 更新产品（清除相关缓存）
   */
  @CacheEvict("product:{0}")
  async updateProduct(productId: string, updateData: any): Promise<void> {
    // 更新产品逻辑
    console.log(`Updating product ${productId}`);
  }
}
