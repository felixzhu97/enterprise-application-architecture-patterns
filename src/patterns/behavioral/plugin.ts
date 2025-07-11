/**
 * Plugin（插件）模式
 *
 * 允许在运行时动态添加功能的架构模式。
 * 通过插件接口定义扩展点，让第三方能够扩展应用功能。
 *
 * 主要特点：
 * - 运行时动态加载
 * - 松耦合架构
 * - 可扩展性
 * - 模块化设计
 *
 * 优点：
 * - 高度可扩展
 * - 模块化开发
 * - 支持第三方扩展
 * - 核心功能与扩展功能分离
 *
 * 缺点：
 * - 增加系统复杂性
 * - 调试困难
 * - 性能开销
 * - 版本兼容性问题
 *
 * 适用场景：
 * - 需要第三方扩展的应用
 * - 模块化系统
 * - 可配置的业务流程
 * - 微服务架构
 */

/**
 * 插件接口
 */
export interface IPlugin {
  /**
   * 插件名称
   */
  getName(): string;

  /**
   * 插件版本
   */
  getVersion(): string;

  /**
   * 插件描述
   */
  getDescription(): string;

  /**
   * 插件作者
   */
  getAuthor(): string;

  /**
   * 插件依赖
   */
  getDependencies(): string[];

  /**
   * 插件初始化
   */
  initialize(context: PluginContext): Promise<void>;

  /**
   * 插件清理
   */
  cleanup(): Promise<void>;

  /**
   * 插件是否已启用
   */
  isEnabled(): boolean;

  /**
   * 启用插件
   */
  enable(): void;

  /**
   * 禁用插件
   */
  disable(): void;
}

/**
 * 插件上下文
 */
export interface PluginContext {
  /**
   * 应用实例
   */
  app: any;

  /**
   * 配置信息
   */
  config: { [key: string]: any };

  /**
   * 日志记录器
   */
  logger: ILogger;

  /**
   * 事件总线
   */
  eventBus: EventBus;

  /**
   * 服务注册表
   */
  serviceRegistry: ServiceRegistry;
}

/**
 * 日志接口
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * 事件接口
 */
export interface Event {
  type: string;
  data: any;
  timestamp: Date;
  source: string;
}

/**
 * 事件处理器
 */
export type EventHandler = (event: Event) => void | Promise<void>;

/**
 * 事件总线
 */
export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * 订阅事件
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    this.logger.debug(`订阅事件: ${eventType}`);
  }

  /**
   * 取消订阅事件
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.logger.debug(`取消订阅事件: ${eventType}`);
      }
    }
  }

  /**
   * 发布事件
   */
  async emit(
    eventType: string,
    data: any,
    source: string = "unknown"
  ): Promise<void> {
    const handlers = this.handlers.get(eventType);
    if (handlers && handlers.length > 0) {
      const event: Event = {
        type: eventType,
        data,
        timestamp: new Date(),
        source,
      };

      this.logger.debug(`发布事件: ${eventType}`, { data, source });

      // 并行处理所有事件处理器
      await Promise.all(
        handlers.map(async (handler) => {
          try {
            await handler(event);
          } catch (error) {
            this.logger.error(`事件处理器错误: ${eventType}`, error);
          }
        })
      );
    }
  }
}

/**
 * 服务注册表
 */
export class ServiceRegistry {
  private services: Map<string, any> = new Map();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * 注册服务
   */
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
    this.logger.debug(`注册服务: ${name}`);
  }

  /**
   * 获取服务
   */
  get<T>(name: string): T | undefined {
    return this.services.get(name) as T;
  }

  /**
   * 检查服务是否存在
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * 注销服务
   */
  unregister(name: string): void {
    this.services.delete(name);
    this.logger.debug(`注销服务: ${name}`);
  }

  /**
   * 获取所有服务名称
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }
}

/**
 * 简单日志实现
 */
export class SimpleLogger implements ILogger {
  debug(message: string, ...args: any[]): void {
    console.log(`[DEBUG] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}

/**
 * 抽象插件基类
 */
export abstract class BasePlugin implements IPlugin {
  protected enabled: boolean = false;
  protected context?: PluginContext;

  abstract getName(): string;
  abstract getVersion(): string;
  abstract getDescription(): string;
  abstract getAuthor(): string;

  getDependencies(): string[] {
    return [];
  }

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    context.logger.info(`初始化插件: ${this.getName()}`);
  }

  async cleanup(): Promise<void> {
    if (this.context) {
      this.context.logger.info(`清理插件: ${this.getName()}`);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  enable(): void {
    this.enabled = true;
    if (this.context) {
      this.context.logger.info(`启用插件: ${this.getName()}`);
    }
  }

  disable(): void {
    this.enabled = false;
    if (this.context) {
      this.context.logger.info(`禁用插件: ${this.getName()}`);
    }
  }

  protected getContext(): PluginContext {
    if (!this.context) {
      throw new Error("插件未初始化");
    }
    return this.context;
  }
}

/**
 * 插件管理器
 */
export class PluginManager {
  private plugins: Map<string, IPlugin> = new Map();
  private logger: ILogger;
  private eventBus: EventBus;
  private serviceRegistry: ServiceRegistry;

  constructor(logger: ILogger = new SimpleLogger()) {
    this.logger = logger;
    this.eventBus = new EventBus(logger);
    this.serviceRegistry = new ServiceRegistry(logger);
  }

  /**
   * 注册插件
   */
  async registerPlugin(plugin: IPlugin): Promise<void> {
    const name = plugin.getName();

    if (this.plugins.has(name)) {
      throw new Error(`插件 ${name} 已存在`);
    }

    // 检查依赖
    const dependencies = plugin.getDependencies();
    for (const dep of dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(`插件 ${name} 依赖 ${dep} 未找到`);
      }
    }

    this.plugins.set(name, plugin);
    this.logger.info(`注册插件: ${name}`);

    // 初始化插件
    const context: PluginContext = {
      app: this,
      config: {},
      logger: this.logger,
      eventBus: this.eventBus,
      serviceRegistry: this.serviceRegistry,
    };

    await plugin.initialize(context);

    // 发布插件注册事件
    await this.eventBus.emit(
      "plugin.registered",
      { name, plugin },
      "PluginManager"
    );
  }

  /**
   * 卸载插件
   */
  async unregisterPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`插件 ${name} 未找到`);
    }

    // 检查是否有其他插件依赖于此插件
    for (const [_, p] of this.plugins) {
      if (p.getDependencies().includes(name)) {
        throw new Error(`插件 ${name} 被其他插件依赖，无法卸载`);
      }
    }

    await plugin.cleanup();
    this.plugins.delete(name);
    this.logger.info(`卸载插件: ${name}`);

    // 发布插件卸载事件
    await this.eventBus.emit("plugin.unregistered", { name }, "PluginManager");
  }

  /**
   * 获取插件
   */
  getPlugin(name: string): IPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): IPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取已启用的插件
   */
  getEnabledPlugins(): IPlugin[] {
    return this.getAllPlugins().filter((plugin) => plugin.isEnabled());
  }

  /**
   * 启用插件
   */
  async enablePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`插件 ${name} 未找到`);
    }

    plugin.enable();
    await this.eventBus.emit("plugin.enabled", { name }, "PluginManager");
  }

  /**
   * 禁用插件
   */
  async disablePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`插件 ${name} 未找到`);
    }

    plugin.disable();
    await this.eventBus.emit("plugin.disabled", { name }, "PluginManager");
  }

  /**
   * 获取事件总线
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * 获取服务注册表
   */
  getServiceRegistry(): ServiceRegistry {
    return this.serviceRegistry;
  }

  /**
   * 获取日志记录器
   */
  getLogger(): ILogger {
    return this.logger;
  }
}

// ======================== 具体插件实现 ========================

/**
 * 用户认证插件
 */
export class AuthPlugin extends BasePlugin {
  getName(): string {
    return "auth";
  }

  getVersion(): string {
    return "1.0.0";
  }

  getDescription(): string {
    return "用户认证插件";
  }

  getAuthor(): string {
    return "System";
  }

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);

    // 注册认证服务
    const authService = new AuthService(context.logger);
    context.serviceRegistry.register("auth", authService);

    // 监听用户登录事件
    context.eventBus.on("user.login", this.handleUserLogin.bind(this));
    context.eventBus.on("user.logout", this.handleUserLogout.bind(this));

    this.enable();
  }

  private async handleUserLogin(event: Event): Promise<void> {
    const { userId, timestamp } = event.data;
    this.getContext().logger.info(`用户 ${userId} 于 ${timestamp} 登录`);
  }

  private async handleUserLogout(event: Event): Promise<void> {
    const { userId, timestamp } = event.data;
    this.getContext().logger.info(`用户 ${userId} 于 ${timestamp} 退出`);
  }
}

/**
 * 认证服务
 */
class AuthService {
  private sessions: Map<string, any> = new Map();

  constructor(private logger: ILogger) {}

  login(userId: string, credentials: any): string {
    const sessionId = this.generateSessionId();
    this.sessions.set(sessionId, {
      userId,
      createdAt: new Date(),
      lastAccessAt: new Date(),
    });
    this.logger.info(`用户 ${userId} 登录成功，会话ID: ${sessionId}`);
    return sessionId;
  }

  logout(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.logger.info(`用户 ${session.userId} 退出登录`);
    }
  }

  isAuthenticated(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  private generateSessionId(): string {
    return "session_" + Math.random().toString(36).substr(2, 9);
  }
}

/**
 * 缓存插件
 */
export class CachePlugin extends BasePlugin {
  private cache: Map<string, any> = new Map();
  private ttl: Map<string, number> = new Map();

  getName(): string {
    return "cache";
  }

  getVersion(): string {
    return "1.0.0";
  }

  getDescription(): string {
    return "内存缓存插件";
  }

  getAuthor(): string {
    return "System";
  }

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);

    // 注册缓存服务
    context.serviceRegistry.register("cache", this);

    // 监听数据变更事件，清理相关缓存
    context.eventBus.on("data.changed", this.handleDataChanged.bind(this));

    // 启动TTL清理任务
    this.startTtlCleanup();

    this.enable();
  }

  /**
   * 设置缓存
   */
  set(key: string, value: any, ttlSeconds: number = 3600): void {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlSeconds * 1000);
    this.getContext().logger.debug(`设置缓存: ${key}`);
  }

  /**
   * 获取缓存
   */
  get(key: string): any | undefined {
    if (this.isExpired(key)) {
      this.delete(key);
      return undefined;
    }
    return this.cache.get(key);
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.ttl.delete(key);
    this.getContext().logger.debug(`删除缓存: ${key}`);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.ttl.clear();
    this.getContext().logger.info("清空所有缓存");
  }

  /**
   * 检查缓存是否过期
   */
  private isExpired(key: string): boolean {
    const expireTime = this.ttl.get(key);
    return expireTime ? Date.now() > expireTime : false;
  }

  /**
   * 处理数据变更事件
   */
  private async handleDataChanged(event: Event): Promise<void> {
    const { type, id } = event.data;
    // 清理相关缓存
    const keysToDelete = Array.from(this.cache.keys()).filter(
      (key) => key.includes(type) || key.includes(id)
    );

    keysToDelete.forEach((key) => this.delete(key));
    this.getContext().logger.info(
      `数据变更，清理 ${keysToDelete.length} 个缓存项`
    );
  }

  /**
   * 启动TTL清理任务
   */
  private startTtlCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys = Array.from(this.ttl.entries())
        .filter(([_, expireTime]) => now > expireTime)
        .map(([key]) => key);

      expiredKeys.forEach((key) => this.delete(key));

      if (expiredKeys.length > 0) {
        this.getContext().logger.debug(
          `TTL清理: ${expiredKeys.length} 个过期缓存`
        );
      }
    }, 60000); // 每分钟清理一次
  }
}

/**
 * 审计日志插件
 */
export class AuditPlugin extends BasePlugin {
  private auditLogs: any[] = [];

  getName(): string {
    return "audit";
  }

  getVersion(): string {
    return "1.0.0";
  }

  getDescription(): string {
    return "审计日志插件";
  }

  getAuthor(): string {
    return "System";
  }

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);

    // 注册审计服务
    context.serviceRegistry.register("audit", this);

    // 监听各种业务事件
    context.eventBus.on("user.login", this.auditUserLogin.bind(this));
    context.eventBus.on("user.logout", this.auditUserLogout.bind(this));
    context.eventBus.on("data.created", this.auditDataCreated.bind(this));
    context.eventBus.on("data.updated", this.auditDataUpdated.bind(this));
    context.eventBus.on("data.deleted", this.auditDataDeleted.bind(this));

    this.enable();
  }

  /**
   * 记录审计日志
   */
  log(action: string, userId: string, resource: string, details: any): void {
    const auditLog = {
      id: this.generateId(),
      action,
      userId,
      resource,
      details,
      timestamp: new Date(),
      ip: "unknown", // 在实际应用中应该从请求中获取
    };

    this.auditLogs.push(auditLog);
    this.getContext().logger.info(`审计日志: ${action}`, auditLog);
  }

  /**
   * 获取审计日志
   */
  getAuditLogs(userId?: string, startDate?: Date, endDate?: Date): any[] {
    let logs = this.auditLogs;

    if (userId) {
      logs = logs.filter((log) => log.userId === userId);
    }

    if (startDate) {
      logs = logs.filter((log) => log.timestamp >= startDate);
    }

    if (endDate) {
      logs = logs.filter((log) => log.timestamp <= endDate);
    }

    return logs;
  }

  private async auditUserLogin(event: Event): Promise<void> {
    const { userId } = event.data;
    this.log("USER_LOGIN", userId, "user", { timestamp: event.timestamp });
  }

  private async auditUserLogout(event: Event): Promise<void> {
    const { userId } = event.data;
    this.log("USER_LOGOUT", userId, "user", { timestamp: event.timestamp });
  }

  private async auditDataCreated(event: Event): Promise<void> {
    const { type, id, userId } = event.data;
    this.log("DATA_CREATED", userId, type, { id, type });
  }

  private async auditDataUpdated(event: Event): Promise<void> {
    const { type, id, userId, changes } = event.data;
    this.log("DATA_UPDATED", userId, type, { id, type, changes });
  }

  private async auditDataDeleted(event: Event): Promise<void> {
    const { type, id, userId } = event.data;
    this.log("DATA_DELETED", userId, type, { id, type });
  }

  private generateId(): string {
    return (
      "audit_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }
}

/**
 * 通知插件
 */
export class NotificationPlugin extends BasePlugin {
  getDependencies(): string[] {
    return ["auth"]; // 依赖认证插件
  }

  getName(): string {
    return "notification";
  }

  getVersion(): string {
    return "1.0.0";
  }

  getDescription(): string {
    return "通知插件";
  }

  getAuthor(): string {
    return "System";
  }

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);

    // 注册通知服务
    const notificationService = new NotificationService(context.logger);
    context.serviceRegistry.register("notification", notificationService);

    // 监听需要通知的事件
    context.eventBus.on("user.login", this.handleUserLogin.bind(this));
    context.eventBus.on("order.created", this.handleOrderCreated.bind(this));
    context.eventBus.on("order.shipped", this.handleOrderShipped.bind(this));

    this.enable();
  }

  private async handleUserLogin(event: Event): Promise<void> {
    const { userId } = event.data;
    const notificationService =
      this.getContext().serviceRegistry.get<NotificationService>(
        "notification"
      );

    if (notificationService) {
      await notificationService.sendNotification(
        userId,
        "welcome",
        "欢迎登录系统！"
      );
    }
  }

  private async handleOrderCreated(event: Event): Promise<void> {
    const { orderId, userId } = event.data;
    const notificationService =
      this.getContext().serviceRegistry.get<NotificationService>(
        "notification"
      );

    if (notificationService) {
      await notificationService.sendNotification(
        userId,
        "order",
        `您的订单 ${orderId} 已创建`
      );
    }
  }

  private async handleOrderShipped(event: Event): Promise<void> {
    const { orderId, userId } = event.data;
    const notificationService =
      this.getContext().serviceRegistry.get<NotificationService>(
        "notification"
      );

    if (notificationService) {
      await notificationService.sendNotification(
        userId,
        "order",
        `您的订单 ${orderId} 已发货`
      );
    }
  }
}

/**
 * 通知服务
 */
class NotificationService {
  private notifications: Map<string, any[]> = new Map();

  constructor(private logger: ILogger) {}

  async sendNotification(
    userId: string,
    type: string,
    message: string
  ): Promise<void> {
    const notification = {
      id: this.generateId(),
      type,
      message,
      timestamp: new Date(),
      read: false,
    };

    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }

    this.notifications.get(userId)!.push(notification);
    this.logger.info(`发送通知给用户 ${userId}: ${message}`);
  }

  getNotifications(userId: string): any[] {
    return this.notifications.get(userId) || [];
  }

  markAsRead(userId: string, notificationId: string): void {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      const notification = userNotifications.find(
        (n) => n.id === notificationId
      );
      if (notification) {
        notification.read = true;
        this.logger.debug(`标记通知为已读: ${notificationId}`);
      }
    }
  }

  private generateId(): string {
    return (
      "notification_" +
      Date.now() +
      "_" +
      Math.random().toString(36).substr(2, 9)
    );
  }
}

/**
 * Plugin使用示例
 */
export class PluginExample {
  private pluginManager: PluginManager;

  constructor() {
    this.pluginManager = new PluginManager();
  }

  /**
   * 演示Plugin模式的使用
   */
  async demonstratePlugin() {
    console.log("=== Plugin模式演示 ===");

    try {
      // 1. 注册基础插件
      console.log("\n1. 注册插件:");

      const authPlugin = new AuthPlugin();
      await this.pluginManager.registerPlugin(authPlugin);
      console.log("✓ 认证插件已注册");

      const cachePlugin = new CachePlugin();
      await this.pluginManager.registerPlugin(cachePlugin);
      console.log("✓ 缓存插件已注册");

      const auditPlugin = new AuditPlugin();
      await this.pluginManager.registerPlugin(auditPlugin);
      console.log("✓ 审计插件已注册");

      // 2. 注册有依赖的插件
      const notificationPlugin = new NotificationPlugin();
      await this.pluginManager.registerPlugin(notificationPlugin);
      console.log("✓ 通知插件已注册（依赖认证插件）");

      // 3. 查看插件状态
      console.log("\n2. 插件状态:");
      const allPlugins = this.pluginManager.getAllPlugins();
      allPlugins.forEach((plugin) => {
        console.log(
          `✓ ${plugin.getName()} v${plugin.getVersion()} - ${plugin.getDescription()}`
        );
        console.log(
          `  作者: ${plugin.getAuthor()}, 启用: ${plugin.isEnabled()}`
        );
        const deps = plugin.getDependencies();
        if (deps.length > 0) {
          console.log(`  依赖: ${deps.join(", ")}`);
        }
      });

      // 4. 使用插件功能
      console.log("\n3. 使用插件功能:");

      // 使用认证服务
      const authService = this.pluginManager
        .getServiceRegistry()
        .get<AuthService>("auth");
      if (authService) {
        const sessionId = authService.login("user123", {
          username: "test",
          password: "password",
        });
        console.log(`✓ 用户登录，会话ID: ${sessionId}`);

        // 触发登录事件
        await this.pluginManager
          .getEventBus()
          .emit("user.login", { userId: "user123", timestamp: new Date() });
      }

      // 使用缓存服务
      const cacheService = this.pluginManager
        .getServiceRegistry()
        .get<CachePlugin>("cache");
      if (cacheService) {
        cacheService.set("user:123", {
          name: "Test User",
          email: "test@example.com",
        });
        const cachedUser = cacheService.get("user:123");
        console.log("✓ 缓存用户数据:", cachedUser);
      }

      // 5. 模拟业务事件
      console.log("\n4. 模拟业务事件:");

      // 订单创建事件
      await this.pluginManager.getEventBus().emit("order.created", {
        orderId: "order123",
        userId: "user123",
      });

      // 数据变更事件
      await this.pluginManager.getEventBus().emit("data.changed", {
        type: "user",
        id: "user123",
      });

      // 6. 查看审计日志
      console.log("\n5. 审计日志:");
      const auditService = this.pluginManager
        .getServiceRegistry()
        .get<AuditPlugin>("audit");
      if (auditService) {
        const logs = auditService.getAuditLogs("user123");
        logs.forEach((log) => {
          console.log(
            `✓ ${log.action} - ${log.resource} - ${log.timestamp.toISOString()}`
          );
        });
      }

      // 7. 查看通知
      console.log("\n6. 用户通知:");
      const notificationService = this.pluginManager
        .getServiceRegistry()
        .get<NotificationService>("notification");
      if (notificationService) {
        const notifications = notificationService.getNotifications("user123");
        notifications.forEach((notification) => {
          console.log(`✓ ${notification.type}: ${notification.message}`);
        });
      }

      // 8. 插件管理
      console.log("\n7. 插件管理:");

      // 禁用插件
      await this.pluginManager.disablePlugin("cache");
      console.log("✓ 缓存插件已禁用");

      // 启用插件
      await this.pluginManager.enablePlugin("cache");
      console.log("✓ 缓存插件已启用");

      // 9. 显示最终状态
      console.log("\n8. 最终状态:");
      const enabledPlugins = this.pluginManager.getEnabledPlugins();
      console.log(
        `✓ 总共 ${allPlugins.length} 个插件，${enabledPlugins.length} 个已启用`
      );

      this.printPluginGuidelines();
    } catch (error) {
      console.error("Plugin演示失败:", error);
    }
  }

  private printPluginGuidelines(): void {
    console.log(`
Plugin模式使用指南：

设计原则：
- 定义清晰的插件接口
- 提供完善的上下文信息
- 支持插件间的依赖关系
- 实现插件的生命周期管理

核心组件：
- IPlugin: 插件接口
- PluginContext: 插件上下文
- PluginManager: 插件管理器
- EventBus: 事件总线
- ServiceRegistry: 服务注册表

优点：
- 高度可扩展
- 模块化架构
- 支持第三方扩展
- 松耦合设计

使用场景：
- 需要第三方扩展的系统
- 模块化应用架构
- 可配置的业务流程
- 微服务架构

实现技巧：
- 使用事件总线进行松耦合通信
- 通过服务注册表共享服务
- 实现依赖检查和管理
- 提供完善的错误处理

注意事项：
- 版本兼容性管理
- 插件安全性检查
- 性能影响评估
- 调试和监控支持

最佳实践：
- 设计稳定的插件API
- 提供详细的文档
- 实现完善的测试
- 考虑向后兼容性
- 建立插件生态系统
    `);
  }
}
