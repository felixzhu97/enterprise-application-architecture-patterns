/**
 * Service Layer（服务层）模式
 *
 * 定义应用程序的边界，通过一套服务建立了一组可用的操作，
 * 并协调应用程序在每个操作中的响应。
 *
 * 主要特点：
 * - 为应用程序提供粗粒度的API
 * - 协调复杂的业务逻辑
 * - 处理事务边界
 * - 提供统一的错误处理
 * - 分离业务逻辑和表现逻辑
 *
 * 优点：
 * - 明确的应用程序边界
 * - 统一的业务操作接口
 * - 易于测试和维护
 * - 支持事务管理
 * - 可重用的业务逻辑
 *
 * 缺点：
 * - 可能增加系统复杂性
 * - 需要额外的抽象层
 * - 可能导致过度设计
 *
 * 适用场景：
 * - 复杂的业务逻辑
 * - 需要事务管理的场景
 * - 多个客户端的应用
 * - 需要统一API的系统
 */

import { DataSource } from "typeorm";
import { UnitOfWork } from "../base/unit-of-work";
import { DomainObject } from "../base/layer-supertype";

/**
 * 服务层异常
 */
export class ServiceLayerException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "ServiceLayerException";
  }
}

/**
 * 业务异常
 */
export class BusinessException extends ServiceLayerException {
  constructor(message: string, public readonly errorCode?: string) {
    super(message);
    this.name = "BusinessException";
    this.errorCode = errorCode;
  }
}

/**
 * 验证异常
 */
export class ValidationException extends ServiceLayerException {
  constructor(message: string, public readonly validationErrors: string[]) {
    super(message);
    this.name = "ValidationException";
    this.validationErrors = validationErrors;
  }
}

/**
 * 操作结果
 */
export class OperationResult<T = any> {
  constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly error?: string,
    public readonly errorCode?: string
  ) {}

  static success<T>(data?: T): OperationResult<T> {
    return new OperationResult(true, data);
  }

  static failure<T>(error: string, errorCode?: string): OperationResult<T> {
    return new OperationResult(false, undefined, error, errorCode);
  }

  static fromError<T>(error: Error): OperationResult<T> {
    if (error instanceof BusinessException) {
      return new OperationResult(
        false,
        undefined,
        error.message,
        error.errorCode
      );
    }
    return new OperationResult(false, undefined, error.message);
  }
}

/**
 * 抽象应用服务基类
 */
export abstract class ApplicationService {
  protected dataSource: DataSource;
  protected unitOfWork: UnitOfWork;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.unitOfWork = new UnitOfWork(dataSource);
  }

  /**
   * 执行事务操作
   */
  protected async executeInTransaction<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    return await this.unitOfWork.executeInTransaction(operation);
  }

  /**
   * 验证业务规则
   */
  protected abstract validateBusinessRules(data: any): string[];

  /**
   * 记录业务日志
   */
  protected logBusinessOperation(operation: string, data?: any): void {
    console.log(
      `[${new Date().toISOString()}] ${this.constructor.name}: ${operation}`,
      data
    );
  }

  /**
   * 处理异常
   */
  protected handleException(error: Error): never {
    this.logBusinessOperation("ERROR", error.message);
    throw error;
  }
}

/**
 * 用户服务
 */
export class UserService extends ApplicationService {
  /**
   * 注册用户
   */
  async registerUser(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<OperationResult<{ userId: number; username: string }>> {
    try {
      // 验证输入
      const errors = this.validateUserData(userData);
      if (errors.length > 0) {
        return OperationResult.failure(`验证失败: ${errors.join(", ")}`);
      }

      // 检查用户是否已存在
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        return OperationResult.failure("用户已存在", "USER_EXISTS");
      }

      // 在事务中创建用户
      const result = await this.executeInTransaction(async () => {
        const hashedPassword = await this.hashPassword(userData.password);
        const userId = await this.createUser({
          ...userData,
          password: hashedPassword,
        });

        // 创建用户配置文件
        await this.createUserProfile(userId);

        // 发送欢迎邮件
        await this.sendWelcomeEmail(userData.email);

        return { userId, username: userData.username };
      });

      this.logBusinessOperation("USER_REGISTERED", { userId: result.userId });
      return OperationResult.success(result);
    } catch (error) {
      return OperationResult.fromError(error as Error);
    }
  }

  /**
   * 用户登录
   */
  async loginUser(credentials: {
    email: string;
    password: string;
  }): Promise<
    OperationResult<{ userId: number; username: string; token: string }>
  > {
    try {
      // 查找用户
      const user = await this.findUserByEmail(credentials.email);
      if (!user) {
        return OperationResult.failure("用户不存在", "USER_NOT_FOUND");
      }

      // 验证密码
      const isPasswordValid = await this.verifyPassword(
        credentials.password,
        user.password
      );
      if (!isPasswordValid) {
        return OperationResult.failure("密码错误", "INVALID_PASSWORD");
      }

      // 生成访问令牌
      const token = await this.generateAccessToken(user.id);

      // 更新最后登录时间
      await this.updateLastLogin(user.id);

      const result = {
        userId: user.id,
        username: user.username,
        token,
      };

      this.logBusinessOperation("USER_LOGGED_IN", { userId: user.id });
      return OperationResult.success(result);
    } catch (error) {
      return OperationResult.fromError(error as Error);
    }
  }

  /**
   * 更新用户资料
   */
  async updateUserProfile(
    userId: number,
    profileData: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      address?: string;
    }
  ): Promise<OperationResult<void>> {
    try {
      // 验证用户存在
      const user = await this.findUserById(userId);
      if (!user) {
        return OperationResult.failure("用户不存在", "USER_NOT_FOUND");
      }

      // 在事务中更新用户资料
      await this.executeInTransaction(async () => {
        await this.updateUserProfileData(userId, profileData);
        await this.updateUserTimestamp(userId);
      });

      this.logBusinessOperation("USER_PROFILE_UPDATED", { userId });
      return OperationResult.success();
    } catch (error) {
      return OperationResult.fromError(error as Error);
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(userId: number): Promise<OperationResult<void>> {
    try {
      // 验证用户存在
      const user = await this.findUserById(userId);
      if (!user) {
        return OperationResult.failure("用户不存在", "USER_NOT_FOUND");
      }

      // 在事务中删除用户及相关数据
      await this.executeInTransaction(async () => {
        // 删除用户订单
        await this.deleteUserOrders(userId);

        // 删除用户配置文件
        await this.deleteUserProfile(userId);

        // 删除用户
        await this.deleteUserRecord(userId);

        // 发送账户删除通知
        await this.sendAccountDeletionNotification(user.email);
      });

      this.logBusinessOperation("USER_DELETED", { userId });
      return OperationResult.success();
    } catch (error) {
      return OperationResult.fromError(error as Error);
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(email: string): Promise<OperationResult<void>> {
    try {
      // 查找用户
      const user = await this.findUserByEmail(email);
      if (!user) {
        // 出于安全考虑，即使用户不存在也返回成功
        return OperationResult.success();
      }

      // 生成重置令牌
      const resetToken = await this.generateResetToken(user.id);

      // 发送重置邮件
      await this.sendPasswordResetEmail(email, resetToken);

      this.logBusinessOperation("PASSWORD_RESET_REQUESTED", {
        userId: user.id,
      });
      return OperationResult.success();
    } catch (error) {
      return OperationResult.fromError(error as Error);
    }
  }

  /**
   * 验证用户数据
   */
  protected validateBusinessRules(data: any): string[] {
    return this.validateUserData(data);
  }

  private validateUserData(userData: {
    username: string;
    email: string;
    password: string;
  }): string[] {
    const errors: string[] = [];

    if (!userData.username || userData.username.trim().length < 3) {
      errors.push("用户名至少需要3个字符");
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push("邮箱格式不正确");
    }

    if (!userData.password || userData.password.length < 8) {
      errors.push("密码至少需要8个字符");
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // 模拟数据库操作
  private async findUserByEmail(email: string): Promise<any> {
    // 模拟数据库查询
    return null;
  }

  private async findUserById(id: number): Promise<any> {
    // 模拟数据库查询
    return null;
  }

  private async createUser(userData: any): Promise<number> {
    // 模拟创建用户
    return Math.floor(Math.random() * 10000);
  }

  private async createUserProfile(userId: number): Promise<void> {
    // 模拟创建用户配置文件
  }

  private async updateUserProfileData(
    userId: number,
    profileData: any
  ): Promise<void> {
    // 模拟更新用户资料
  }

  private async updateUserTimestamp(userId: number): Promise<void> {
    // 模拟更新时间戳
  }

  private async updateLastLogin(userId: number): Promise<void> {
    // 模拟更新最后登录时间
  }

  private async deleteUserOrders(userId: number): Promise<void> {
    // 模拟删除用户订单
  }

  private async deleteUserProfile(userId: number): Promise<void> {
    // 模拟删除用户配置文件
  }

  private async deleteUserRecord(userId: number): Promise<void> {
    // 模拟删除用户记录
  }

  private async hashPassword(password: string): Promise<string> {
    // 模拟密码加密
    return `hashed_${password}`;
  }

  private async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    // 模拟密码验证
    return hashedPassword === `hashed_${password}`;
  }

  private async generateAccessToken(userId: number): Promise<string> {
    // 模拟生成访问令牌
    return `token_${userId}_${Date.now()}`;
  }

  private async generateResetToken(userId: number): Promise<string> {
    // 模拟生成重置令牌
    return `reset_${userId}_${Date.now()}`;
  }

  private async sendWelcomeEmail(email: string): Promise<void> {
    // 模拟发送欢迎邮件
    console.log(`发送欢迎邮件到: ${email}`);
  }

  private async sendPasswordResetEmail(
    email: string,
    token: string
  ): Promise<void> {
    // 模拟发送重置邮件
    console.log(`发送密码重置邮件到: ${email}, 令牌: ${token}`);
  }

  private async sendAccountDeletionNotification(email: string): Promise<void> {
    // 模拟发送账户删除通知
    console.log(`发送账户删除通知到: ${email}`);
  }
}

/**
 * 订单服务
 */
export class OrderService extends ApplicationService {
  /**
   * 创建订单
   */
  async createOrder(orderData: {
    userId: number;
    items: Array<{ productId: number; quantity: number }>;
    shippingAddress: string;
    paymentMethod: string;
  }): Promise<OperationResult<{ orderId: number; total: number }>> {
    try {
      // 验证输入
      const errors = this.validateOrderData(orderData);
      if (errors.length > 0) {
        return OperationResult.failure(`验证失败: ${errors.join(", ")}`);
      }

      // 在事务中创建订单
      const result = await this.executeInTransaction(async () => {
        // 验证产品库存
        await this.validateProductStock(orderData.items);

        // 计算订单总额
        const total = await this.calculateOrderTotal(orderData.items);

        // 创建订单
        const orderId = await this.createOrderRecord(orderData, total);

        // 创建订单项
        await this.createOrderItems(orderId, orderData.items);

        // 更新产品库存
        await this.updateProductStock(orderData.items);

        // 创建支付记录
        await this.createPaymentRecord(orderId, total, orderData.paymentMethod);

        // 发送订单确认邮件
        await this.sendOrderConfirmationEmail(orderData.userId, orderId);

        return { orderId, total };
      });

      this.logBusinessOperation("ORDER_CREATED", { orderId: result.orderId });
      return OperationResult.success(result);
    } catch (error) {
      return OperationResult.fromError(error as Error);
    }
  }

  /**
   * 取消订单
   */
  async cancelOrder(
    orderId: number,
    reason: string
  ): Promise<OperationResult<void>> {
    try {
      // 查找订单
      const order = await this.findOrderById(orderId);
      if (!order) {
        return OperationResult.failure("订单不存在", "ORDER_NOT_FOUND");
      }

      // 检查订单是否可以取消
      if (!this.canCancelOrder(order.status)) {
        return OperationResult.failure("订单不能取消", "ORDER_CANNOT_CANCEL");
      }

      // 在事务中取消订单
      await this.executeInTransaction(async () => {
        // 更新订单状态
        await this.updateOrderStatus(orderId, "cancelled");

        // 恢复产品库存
        await this.restoreProductStock(orderId);

        // 处理退款
        await this.processRefund(orderId, reason);

        // 发送取消通知
        await this.sendOrderCancellationEmail(order.userId, orderId);
      });

      this.logBusinessOperation("ORDER_CANCELLED", { orderId });
      return OperationResult.success();
    } catch (error) {
      return OperationResult.fromError(error as Error);
    }
  }

  /**
   * 更新订单状态
   */
  async updateOrderStatus(
    orderId: number,
    status: string
  ): Promise<OperationResult<void>> {
    try {
      // 查找订单
      const order = await this.findOrderById(orderId);
      if (!order) {
        return OperationResult.failure("订单不存在", "ORDER_NOT_FOUND");
      }

      // 验证状态转换
      if (!this.isValidStatusTransition(order.status, status)) {
        return OperationResult.failure(
          "无效的状态转换",
          "INVALID_STATUS_TRANSITION"
        );
      }

      // 更新订单状态
      await this.updateOrderStatusRecord(orderId, status);

      // 发送状态更新通知
      await this.sendOrderStatusUpdateEmail(order.userId, orderId, status);

      this.logBusinessOperation("ORDER_STATUS_UPDATED", { orderId, status });
      return OperationResult.success();
    } catch (error) {
      return OperationResult.fromError(error as Error);
    }
  }

  /**
   * 验证订单数据
   */
  protected validateBusinessRules(data: any): string[] {
    return this.validateOrderData(data);
  }

  private validateOrderData(orderData: {
    userId: number;
    items: Array<{ productId: number; quantity: number }>;
    shippingAddress: string;
    paymentMethod: string;
  }): string[] {
    const errors: string[] = [];

    if (!orderData.userId) {
      errors.push("用户ID不能为空");
    }

    if (!orderData.items || orderData.items.length === 0) {
      errors.push("订单项不能为空");
    }

    if (
      !orderData.shippingAddress ||
      orderData.shippingAddress.trim().length === 0
    ) {
      errors.push("配送地址不能为空");
    }

    if (!orderData.paymentMethod) {
      errors.push("支付方式不能为空");
    }

    return errors;
  }

  private canCancelOrder(status: string): boolean {
    const cancellableStatuses = ["pending", "confirmed", "processing"];
    return cancellableStatuses.includes(status);
  }

  private isValidStatusTransition(
    fromStatus: string,
    toStatus: string
  ): boolean {
    const validTransitions: { [key: string]: string[] } = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: [],
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }

  // 模拟数据库操作
  private async findOrderById(id: number): Promise<any> {
    // 模拟数据库查询
    return { id, userId: 1, status: "pending" };
  }

  private async validateProductStock(
    items: Array<{ productId: number; quantity: number }>
  ): Promise<void> {
    // 模拟库存验证
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new BusinessException("商品数量必须大于0");
      }
    }
  }

  private async calculateOrderTotal(
    items: Array<{ productId: number; quantity: number }>
  ): Promise<number> {
    // 模拟计算总额
    return items.reduce((total, item) => total + item.quantity * 100, 0);
  }

  private async createOrderRecord(
    orderData: any,
    total: number
  ): Promise<number> {
    // 模拟创建订单记录
    return Math.floor(Math.random() * 10000);
  }

  private async createOrderItems(
    orderId: number,
    items: Array<{ productId: number; quantity: number }>
  ): Promise<void> {
    // 模拟创建订单项
  }

  private async updateProductStock(
    items: Array<{ productId: number; quantity: number }>
  ): Promise<void> {
    // 模拟更新库存
  }

  private async createPaymentRecord(
    orderId: number,
    total: number,
    paymentMethod: string
  ): Promise<void> {
    // 模拟创建支付记录
  }

  private async restoreProductStock(orderId: number): Promise<void> {
    // 模拟恢复库存
  }

  private async processRefund(orderId: number, reason: string): Promise<void> {
    // 模拟处理退款
    console.log(`处理订单 ${orderId} 的退款，原因: ${reason}`);
  }

  private async updateOrderStatusRecord(
    orderId: number,
    status: string
  ): Promise<void> {
    // 模拟更新订单状态
  }

  private async sendOrderConfirmationEmail(
    userId: number,
    orderId: number
  ): Promise<void> {
    // 模拟发送订单确认邮件
    console.log(`发送订单确认邮件，用户: ${userId}, 订单: ${orderId}`);
  }

  private async sendOrderCancellationEmail(
    userId: number,
    orderId: number
  ): Promise<void> {
    // 模拟发送取消通知
    console.log(`发送订单取消通知，用户: ${userId}, 订单: ${orderId}`);
  }

  private async sendOrderStatusUpdateEmail(
    userId: number,
    orderId: number,
    status: string
  ): Promise<void> {
    // 模拟发送状态更新通知
    console.log(
      `发送订单状态更新通知，用户: ${userId}, 订单: ${orderId}, 状态: ${status}`
    );
  }
}

/**
 * 库存服务
 */
export class InventoryService extends ApplicationService {
  /**
   * 调整库存
   */
  async adjustInventory(
    productId: number,
    quantity: number,
    reason: string,
    adjustmentType: "increase" | "decrease"
  ): Promise<OperationResult<void>> {
    try {
      // 验证输入
      if (quantity <= 0) {
        return OperationResult.failure("调整数量必须大于0");
      }

      // 在事务中调整库存
      await this.executeInTransaction(async () => {
        // 获取当前库存
        const currentStock = await this.getCurrentStock(productId);

        // 计算新库存
        const newStock =
          adjustmentType === "increase"
            ? currentStock + quantity
            : currentStock - quantity;

        // 验证库存不能为负
        if (newStock < 0) {
          throw new BusinessException("库存不足");
        }

        // 更新库存
        await this.updateStock(productId, newStock);

        // 记录库存变动
        await this.recordInventoryAdjustment(
          productId,
          quantity,
          reason,
          adjustmentType
        );

        // 检查库存预警
        await this.checkStockAlert(productId, newStock);
      });

      this.logBusinessOperation("INVENTORY_ADJUSTED", {
        productId,
        quantity,
        adjustmentType,
      });
      return OperationResult.success();
    } catch (error) {
      return OperationResult.fromError(error as Error);
    }
  }

  /**
   * 库存盘点
   */
  async stockTaking(
    stockData: Array<{ productId: number; actualQuantity: number }>
  ): Promise<OperationResult<void>> {
    try {
      // 在事务中执行盘点
      await this.executeInTransaction(async () => {
        for (const item of stockData) {
          const currentStock = await this.getCurrentStock(item.productId);
          const difference = item.actualQuantity - currentStock;

          if (difference !== 0) {
            // 更新库存
            await this.updateStock(item.productId, item.actualQuantity);

            // 记录盘点差异
            await this.recordStockTakingDifference(item.productId, difference);
          }
        }
      });

      this.logBusinessOperation("STOCK_TAKING_COMPLETED", {
        itemCount: stockData.length,
      });
      return OperationResult.success();
    } catch (error) {
      return OperationResult.fromError(error as Error);
    }
  }

  protected validateBusinessRules(data: any): string[] {
    // 库存服务的验证逻辑
    return [];
  }

  private async getCurrentStock(productId: number): Promise<number> {
    // 模拟获取当前库存
    return Math.floor(Math.random() * 100);
  }

  private async updateStock(
    productId: number,
    newStock: number
  ): Promise<void> {
    // 模拟更新库存
  }

  private async recordInventoryAdjustment(
    productId: number,
    quantity: number,
    reason: string,
    adjustmentType: string
  ): Promise<void> {
    // 模拟记录库存变动
    console.log(
      `记录库存变动: 产品 ${productId}, 数量 ${quantity}, 原因: ${reason}, 类型: ${adjustmentType}`
    );
  }

  private async checkStockAlert(
    productId: number,
    currentStock: number
  ): Promise<void> {
    // 模拟检查库存预警
    const minStock = 10; // 最小库存
    if (currentStock < minStock) {
      console.log(
        `库存预警: 产品 ${productId} 库存不足，当前库存: ${currentStock}`
      );
    }
  }

  private async recordStockTakingDifference(
    productId: number,
    difference: number
  ): Promise<void> {
    // 模拟记录盘点差异
    console.log(`记录盘点差异: 产品 ${productId}, 差异: ${difference}`);
  }
}

/**
 * 服务层工厂
 */
export class ServiceFactory {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  createUserService(): UserService {
    return new UserService(this.dataSource);
  }

  createOrderService(): OrderService {
    return new OrderService(this.dataSource);
  }

  createInventoryService(): InventoryService {
    return new InventoryService(this.dataSource);
  }
}

/**
 * Service Layer演示类
 */
export class ServiceLayerExample {
  private serviceFactory: ServiceFactory;
  private userService: UserService;
  private orderService: OrderService;
  private inventoryService: InventoryService;

  constructor(dataSource: DataSource) {
    this.serviceFactory = new ServiceFactory(dataSource);
    this.userService = this.serviceFactory.createUserService();
    this.orderService = this.serviceFactory.createOrderService();
    this.inventoryService = this.serviceFactory.createInventoryService();
  }

  /**
   * 演示Service Layer的使用
   */
  async demonstrateServiceLayer(): Promise<void> {
    console.log("=== Service Layer 模式演示 ===");

    try {
      // 1. 用户注册
      console.log("\n1. 用户注册:");
      const registrationResult = await this.userService.registerUser({
        username: "john_doe",
        email: "john@example.com",
        password: "password123",
      });

      if (registrationResult.success) {
        console.log("✓ 用户注册成功:", registrationResult.data);
      } else {
        console.log("✗ 用户注册失败:", registrationResult.error);
      }

      // 2. 用户登录
      console.log("\n2. 用户登录:");
      const loginResult = await this.userService.loginUser({
        email: "john@example.com",
        password: "password123",
      });

      if (loginResult.success) {
        console.log("✓ 用户登录成功:", loginResult.data);
      } else {
        console.log("✗ 用户登录失败:", loginResult.error);
      }

      // 3. 创建订单
      console.log("\n3. 创建订单:");
      const orderResult = await this.orderService.createOrder({
        userId: 1,
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 },
        ],
        shippingAddress: "北京市朝阳区某某街道123号",
        paymentMethod: "credit_card",
      });

      if (orderResult.success) {
        console.log("✓ 订单创建成功:", orderResult.data);
      } else {
        console.log("✗ 订单创建失败:", orderResult.error);
      }

      // 4. 库存调整
      console.log("\n4. 库存调整:");
      const inventoryResult = await this.inventoryService.adjustInventory(
        1,
        10,
        "进货补充",
        "increase"
      );

      if (inventoryResult.success) {
        console.log("✓ 库存调整成功");
      } else {
        console.log("✗ 库存调整失败:", inventoryResult.error);
      }

      // 5. 订单状态更新
      console.log("\n5. 订单状态更新:");
      const statusResult = await this.orderService.updateOrderStatus(
        1,
        "confirmed"
      );

      if (statusResult.success) {
        console.log("✓ 订单状态更新成功");
      } else {
        console.log("✗ 订单状态更新失败:", statusResult.error);
      }

      // 6. 演示错误处理
      console.log("\n6. 错误处理演示:");
      const errorResult = await this.userService.registerUser({
        username: "a", // 用户名太短
        email: "invalid-email", // 邮箱格式错误
        password: "123", // 密码太短
      });

      if (!errorResult.success) {
        console.log("✓ 错误处理正常:", errorResult.error);
      }

      // 7. 复杂业务流程
      console.log("\n7. 复杂业务流程演示:");
      await this.demonstrateComplexBusinessFlow();

      this.printServiceLayerGuidelines();
    } catch (error) {
      console.error("Service Layer演示失败:", error);
    }
  }

  /**
   * 演示复杂业务流程
   */
  private async demonstrateComplexBusinessFlow(): Promise<void> {
    console.log("执行复杂业务流程：用户注册 -> 下单 -> 库存调整 -> 订单确认");

    try {
      // 1. 用户注册
      const user = await this.userService.registerUser({
        username: "flow_user",
        email: "flow@example.com",
        password: "flowpass123",
      });

      if (!user.success) {
        throw new Error("用户注册失败");
      }

      // 2. 创建订单
      const order = await this.orderService.createOrder({
        userId: user.data!.userId,
        items: [{ productId: 1, quantity: 5 }],
        shippingAddress: "测试地址",
        paymentMethod: "alipay",
      });

      if (!order.success) {
        throw new Error("订单创建失败");
      }

      // 3. 库存调整
      await this.inventoryService.adjustInventory(
        1,
        10,
        "补充库存",
        "increase"
      );

      // 4. 确认订单
      await this.orderService.updateOrderStatus(
        order.data!.orderId,
        "confirmed"
      );

      console.log("✓ 复杂业务流程执行成功");
    } catch (error) {
      console.log("✗ 复杂业务流程执行失败:", (error as Error).message);
    }
  }

  private printServiceLayerGuidelines(): void {
    console.log(`
Service Layer模式使用指南：

设计原则：
- 粗粒度的业务操作接口
- 统一的事务边界管理
- 清晰的错误处理和返回值
- 业务逻辑的协调和编排

核心特征：
- 定义应用程序的边界
- 协调复杂的业务流程
- 提供统一的API接口
- 处理横切关注点

适用场景：
- 复杂的业务逻辑
- 需要事务管理的场景
- 多个客户端的应用
- 需要统一API的系统

最佳实践：
- 保持服务方法的粗粒度
- 使用事务确保数据一致性
- 提供清晰的错误处理
- 实现适当的日志记录
- 避免贫血的服务层

与其他模式的关系：
- 与Domain Model配合使用
- 调用Repository进行数据访问
- 可以使用Unit of Work管理事务
- 为Facade提供细粒度操作

注意事项：
- 避免过度设计
- 保持业务逻辑的内聚性
- 合理划分服务边界
- 考虑性能和可伸缩性
    `);
  }
}
