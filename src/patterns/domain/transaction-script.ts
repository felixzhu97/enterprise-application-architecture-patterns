/**
 * Transaction Script（事务脚本）模式
 *
 * 将业务逻辑组织为单个过程，每个过程直接处理来自表现层的一个请求。
 * 这是最简单的领域逻辑模式，将业务逻辑组织为一个个过程。
 *
 * 主要特点：
 * - 面向过程的设计
 * - 每个方法对应一个业务事务
 * - 直接使用数据访问对象
 * - 简单直接的控制流
 *
 * 优点：
 * - 简单易懂
 * - 快速开发
 * - 直接的事务控制
 * - 易于调试
 *
 * 缺点：
 * - 代码重复
 * - 难以应对复杂业务
 * - 缺乏对象模型
 * - 维护困难
 *
 * 适用场景：
 * - 简单的业务逻辑
 * - 快速原型开发
 * - 数据处理脚本
 * - 小型应用
 */

import { DataSource, QueryRunner } from "typeorm";

/**
 * Transaction Script异常
 */
export class TransactionScriptException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "TransactionScriptException";
  }
}

/**
 * 基础事务脚本类
 */
export abstract class TransactionScript {
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * 执行事务脚本
   */
  protected async executeInTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 记录日志
   */
  protected log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data) : "");
  }

  /**
   * 验证输入参数
   */
  protected validateRequired(params: { [key: string]: any }): void {
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === "") {
        throw new TransactionScriptException(`参数 ${key} 不能为空`);
      }
    }
  }
}

/**
 * 用户注册事务脚本
 */
export class UserRegistrationScript extends TransactionScript {
  /**
   * 用户注册流程
   */
  async registerUser(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<{ userId: string; success: boolean; message: string }> {
    this.log("开始用户注册流程", {
      username: userData.username,
      email: userData.email,
    });

    try {
      // 验证输入
      this.validateRequired({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });

      // 验证邮箱格式
      if (!this.isValidEmail(userData.email)) {
        throw new TransactionScriptException("邮箱格式不正确");
      }

      // 验证密码强度
      if (!this.isStrongPassword(userData.password)) {
        throw new TransactionScriptException(
          "密码强度不够，至少需要8位包含数字和字母"
        );
      }

      return await this.executeInTransaction(async (queryRunner) => {
        // 1. 检查用户名是否已存在
        const existingUsername = await queryRunner.query(
          "SELECT id FROM users WHERE username = $1",
          [userData.username]
        );
        if (existingUsername.length > 0) {
          throw new TransactionScriptException("用户名已被使用");
        }

        // 2. 检查邮箱是否已存在
        const existingEmail = await queryRunner.query(
          "SELECT id FROM users WHERE email = $1",
          [userData.email]
        );
        if (existingEmail.length > 0) {
          throw new TransactionScriptException("邮箱已被注册");
        }

        // 3. 创建用户记录
        const passwordHash = this.hashPassword(userData.password);
        const userResult = await queryRunner.query(
          `
          INSERT INTO users (username, email, password_hash, first_name, last_name, phone, 
                           is_active, email_verified, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, true, false, NOW(), NOW())
          RETURNING id
        `,
          [
            userData.username,
            userData.email,
            passwordHash,
            userData.firstName,
            userData.lastName,
            userData.phone || null,
          ]
        );

        const userId = userResult[0].id;

        // 4. 创建用户配置记录
        await queryRunner.query(
          `
          INSERT INTO user_preferences (user_id, language, theme, timezone, created_at)
          VALUES ($1, 'zh-CN', 'light', 'Asia/Shanghai', NOW())
        `,
          [userId]
        );

        // 5. 发送欢迎邮件（模拟）
        await this.sendWelcomeEmail(userData.email, userData.firstName);

        // 6. 记录用户注册事件
        await queryRunner.query(
          `
          INSERT INTO user_events (user_id, event_type, event_data, created_at)
          VALUES ($1, 'user_registered', $2, NOW())
        `,
          [
            userId,
            JSON.stringify({
              registrationDate: new Date(),
              source: "web",
            }),
          ]
        );

        this.log("用户注册成功", { userId, username: userData.username });

        return {
          userId,
          success: true,
          message: "注册成功，请查收邮箱验证邮件",
        };
      });
    } catch (error) {
      this.log("用户注册失败", { error: (error as Error).message });

      if (error instanceof TransactionScriptException) {
        return {
          userId: "",
          success: false,
          message: error.message,
        };
      }

      throw new TransactionScriptException(
        `注册失败: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * 验证邮箱格式
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证密码强度
   */
  private isStrongPassword(password: string): boolean {
    return (
      password.length >= 8 && /\d/.test(password) && /[a-zA-Z]/.test(password)
    );
  }

  /**
   * 密码哈希
   */
  private hashPassword(password: string): string {
    // 这里应该使用真实的密码哈希算法，如bcrypt
    return `hashed_${password}`;
  }

  /**
   * 发送欢迎邮件
   */
  private async sendWelcomeEmail(
    email: string,
    firstName: string
  ): Promise<void> {
    // 模拟发送邮件
    this.log("发送欢迎邮件", { email, firstName });
  }
}

/**
 * 订单处理事务脚本
 */
export class OrderProcessingScript extends TransactionScript {
  /**
   * 创建订单流程
   */
  async createOrder(orderData: {
    userId: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
    shippingAddress: {
      street: string;
      city: string;
      province: string;
      postalCode: string;
    };
    paymentMethod: string;
  }): Promise<{
    orderId: string;
    totalAmount: number;
    success: boolean;
    message: string;
  }> {
    this.log("开始订单创建流程", { userId: orderData.userId });

    try {
      // 验证输入
      this.validateRequired({
        userId: orderData.userId,
        paymentMethod: orderData.paymentMethod,
      });

      if (!orderData.items || orderData.items.length === 0) {
        throw new TransactionScriptException("订单项不能为空");
      }

      return await this.executeInTransaction(async (queryRunner) => {
        // 1. 验证用户
        const user = await queryRunner.query(
          "SELECT id, is_active FROM users WHERE id = $1",
          [orderData.userId]
        );
        if (user.length === 0) {
          throw new TransactionScriptException("用户不存在");
        }
        if (!user[0].is_active) {
          throw new TransactionScriptException("用户账户已被禁用");
        }

        // 2. 验证商品和库存
        let totalAmount = 0;
        const validatedItems = [];

        for (const item of orderData.items) {
          const product = await queryRunner.query(
            `
            SELECT id, name, price_amount, stock_quantity, is_active 
            FROM products 
            WHERE id = $1 AND is_active = true
          `,
            [item.productId]
          );

          if (product.length === 0) {
            throw new TransactionScriptException(
              `商品 ${item.productId} 不存在或已下架`
            );
          }

          const productData = product[0];
          if (productData.stock_quantity < item.quantity) {
            throw new TransactionScriptException(
              `商品 ${productData.name} 库存不足，当前库存：${productData.stock_quantity}`
            );
          }

          const itemTotal = productData.price_amount * item.quantity;
          totalAmount += itemTotal;

          validatedItems.push({
            productId: item.productId,
            productName: productData.name,
            quantity: item.quantity,
            unitPrice: productData.price_amount,
            totalPrice: itemTotal,
          });
        }

        // 3. 创建订单
        const orderResult = await queryRunner.query(
          `
          INSERT INTO orders (user_id, status, total_amount, currency, 
                            shipping_address, payment_method, created_at, updated_at)
          VALUES ($1, 'pending', $2, 'CNY', $3, $4, NOW(), NOW())
          RETURNING id
        `,
          [
            orderData.userId,
            totalAmount,
            JSON.stringify(orderData.shippingAddress),
            orderData.paymentMethod,
          ]
        );

        const orderId = orderResult[0].id;

        // 4. 创建订单项并减库存
        for (const item of validatedItems) {
          // 创建订单项
          await queryRunner.query(
            `
            INSERT INTO order_items (order_id, product_id, quantity, price_amount, created_at)
            VALUES ($1, $2, $3, $4, NOW())
          `,
            [orderId, item.productId, item.quantity, item.unitPrice]
          );

          // 减库存
          await queryRunner.query(
            `
            UPDATE products 
            SET stock_quantity = stock_quantity - $1, updated_at = NOW() 
            WHERE id = $2
          `,
            [item.quantity, item.productId]
          );
        }

        // 5. 创建库存保留记录
        for (const item of validatedItems) {
          await queryRunner.query(
            `
            INSERT INTO stock_reservations (order_id, product_id, quantity, 
                                          reserved_at, expires_at)
            VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '30 minutes')
          `,
            [orderId, item.productId, item.quantity]
          );
        }

        // 6. 记录订单事件
        await queryRunner.query(
          `
          INSERT INTO order_events (order_id, event_type, event_data, created_at)
          VALUES ($1, 'order_created', $2, NOW())
        `,
          [
            orderId,
            JSON.stringify({
              items: validatedItems,
              totalAmount,
              shippingAddress: orderData.shippingAddress,
            }),
          ]
        );

        this.log("订单创建成功", { orderId, totalAmount });

        return {
          orderId,
          totalAmount,
          success: true,
          message: "订单创建成功",
        };
      });
    } catch (error) {
      this.log("订单创建失败", { error: (error as Error).message });

      if (error instanceof TransactionScriptException) {
        return {
          orderId: "",
          totalAmount: 0,
          success: false,
          message: error.message,
        };
      }

      throw new TransactionScriptException(
        `订单创建失败: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * 取消订单流程
   */
  async cancelOrder(
    orderId: string,
    userId: string,
    reason: string
  ): Promise<{
    success: boolean;
    message: string;
    refundAmount?: number;
  }> {
    this.log("开始订单取消流程", { orderId, userId });

    try {
      this.validateRequired({ orderId, userId, reason });

      return await this.executeInTransaction(async (queryRunner) => {
        // 1. 验证订单
        const order = await queryRunner.query(
          `
          SELECT id, user_id, status, total_amount, created_at
          FROM orders 
          WHERE id = $1 AND user_id = $2
        `,
          [orderId, userId]
        );

        if (order.length === 0) {
          throw new TransactionScriptException("订单不存在或无权限访问");
        }

        const orderData = order[0];
        if (orderData.status === "cancelled") {
          throw new TransactionScriptException("订单已经取消");
        }

        if (orderData.status === "delivered") {
          throw new TransactionScriptException("已配送的订单无法取消");
        }

        // 2. 恢复库存
        const orderItems = await queryRunner.query(
          "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
          [orderId]
        );

        for (const item of orderItems) {
          await queryRunner.query(
            `
            UPDATE products 
            SET stock_quantity = stock_quantity + $1, updated_at = NOW() 
            WHERE id = $2
          `,
            [item.quantity, item.product_id]
          );
        }

        // 3. 更新订单状态
        await queryRunner.query(
          `
          UPDATE orders 
          SET status = 'cancelled', updated_at = NOW(), cancelled_at = NOW(),
              cancellation_reason = $1
          WHERE id = $2
        `,
          [reason, orderId]
        );

        // 4. 删除库存保留
        await queryRunner.query(
          "DELETE FROM stock_reservations WHERE order_id = $1",
          [orderId]
        );

        // 5. 处理退款（如果已支付）
        let refundAmount = 0;
        const payments = await queryRunner.query(
          "SELECT amount FROM payments WHERE order_id = $1 AND status = 'completed'",
          [orderId]
        );

        if (payments.length > 0) {
          refundAmount = payments.reduce(
            (sum: number, payment: any) => sum + payment.amount,
            0
          );

          // 创建退款记录
          await queryRunner.query(
            `
            INSERT INTO refunds (order_id, amount, reason, status, created_at)
            VALUES ($1, $2, $3, 'pending', NOW())
          `,
            [orderId, refundAmount, reason]
          );
        }

        // 6. 记录取消事件
        await queryRunner.query(
          `
          INSERT INTO order_events (order_id, event_type, event_data, created_at)
          VALUES ($1, 'order_cancelled', $2, NOW())
        `,
          [
            orderId,
            JSON.stringify({
              reason,
              refundAmount,
              cancelledBy: userId,
            }),
          ]
        );

        this.log("订单取消成功", { orderId, refundAmount });

        return {
          success: true,
          message: "订单取消成功",
          refundAmount: refundAmount > 0 ? refundAmount : undefined,
        };
      });
    } catch (error) {
      this.log("订单取消失败", { error: (error as Error).message });

      if (error instanceof TransactionScriptException) {
        return {
          success: false,
          message: error.message,
        };
      }

      throw new TransactionScriptException(
        `订单取消失败: ${(error as Error).message}`,
        error as Error
      );
    }
  }
}

/**
 * 库存管理事务脚本
 */
export class InventoryManagementScript extends TransactionScript {
  /**
   * 补充库存流程
   */
  async replenishStock(data: {
    productId: string;
    quantity: number;
    supplierId?: string;
    cost?: number;
    batchNumber?: string;
  }): Promise<{ success: boolean; message: string; newStockLevel?: number }> {
    this.log("开始库存补充流程", {
      productId: data.productId,
      quantity: data.quantity,
    });

    try {
      this.validateRequired({
        productId: data.productId,
        quantity: data.quantity,
      });

      if (data.quantity <= 0) {
        throw new TransactionScriptException("补充数量必须大于0");
      }

      return await this.executeInTransaction(async (queryRunner) => {
        // 1. 验证产品
        const product = await queryRunner.query(
          "SELECT id, name, stock_quantity FROM products WHERE id = $1",
          [data.productId]
        );

        if (product.length === 0) {
          throw new TransactionScriptException("产品不存在");
        }

        const productData = product[0];
        const newStockLevel = productData.stock_quantity + data.quantity;

        // 2. 更新库存
        await queryRunner.query(
          `
          UPDATE products 
          SET stock_quantity = $1, updated_at = NOW() 
          WHERE id = $2
        `,
          [newStockLevel, data.productId]
        );

        // 3. 记录库存变动
        await queryRunner.query(
          `
          INSERT INTO inventory_transactions (product_id, transaction_type, quantity, 
                                            previous_stock, new_stock, supplier_id, 
                                            cost, batch_number, created_at)
          VALUES ($1, 'replenish', $2, $3, $4, $5, $6, $7, NOW())
        `,
          [
            data.productId,
            data.quantity,
            productData.stock_quantity,
            newStockLevel,
            data.supplierId || null,
            data.cost || null,
            data.batchNumber || null,
          ]
        );

        // 4. 检查是否需要更新产品状态
        if (productData.stock_quantity === 0) {
          await queryRunner.query(
            "UPDATE products SET is_active = true WHERE id = $1",
            [data.productId]
          );
        }

        this.log("库存补充成功", {
          productId: data.productId,
          previousStock: productData.stock_quantity,
          newStockLevel,
        });

        return {
          success: true,
          message: `成功补充库存 ${data.quantity} 件`,
          newStockLevel,
        };
      });
    } catch (error) {
      this.log("库存补充失败", { error: (error as Error).message });

      if (error instanceof TransactionScriptException) {
        return {
          success: false,
          message: error.message,
        };
      }

      throw new TransactionScriptException(
        `库存补充失败: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * 库存盘点流程
   */
  async stockTaking(data: {
    productId: string;
    actualQuantity: number;
    operator: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; adjustment?: number }> {
    this.log("开始库存盘点流程", { productId: data.productId });

    try {
      this.validateRequired({
        productId: data.productId,
        actualQuantity: data.actualQuantity,
        operator: data.operator,
      });

      if (data.actualQuantity < 0) {
        throw new TransactionScriptException("实际库存不能为负数");
      }

      return await this.executeInTransaction(async (queryRunner) => {
        // 1. 获取当前库存
        const product = await queryRunner.query(
          "SELECT id, name, stock_quantity FROM products WHERE id = $1",
          [data.productId]
        );

        if (product.length === 0) {
          throw new TransactionScriptException("产品不存在");
        }

        const productData = product[0];
        const adjustment = data.actualQuantity - productData.stock_quantity;

        if (adjustment === 0) {
          this.log("库存盘点完成，无需调整", { productId: data.productId });
          return {
            success: true,
            message: "库存盘点完成，库存准确无误",
            adjustment: 0,
          };
        }

        // 2. 更新库存
        await queryRunner.query(
          `
          UPDATE products 
          SET stock_quantity = $1, updated_at = NOW() 
          WHERE id = $2
        `,
          [data.actualQuantity, data.productId]
        );

        // 3. 记录盘点结果
        await queryRunner.query(
          `
          INSERT INTO stock_taking_records (product_id, expected_quantity, 
                                          actual_quantity, adjustment, operator, 
                                          notes, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
          [
            data.productId,
            productData.stock_quantity,
            data.actualQuantity,
            adjustment,
            data.operator,
            data.notes || null,
          ]
        );

        // 4. 记录库存变动
        const transactionType =
          adjustment > 0 ? "adjustment_increase" : "adjustment_decrease";
        await queryRunner.query(
          `
          INSERT INTO inventory_transactions (product_id, transaction_type, quantity, 
                                            previous_stock, new_stock, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `,
          [
            data.productId,
            transactionType,
            Math.abs(adjustment),
            productData.stock_quantity,
            data.actualQuantity,
          ]
        );

        this.log("库存盘点完成", {
          productId: data.productId,
          adjustment,
          operator: data.operator,
        });

        const message =
          adjustment > 0
            ? `库存盘点完成，增加 ${adjustment} 件`
            : `库存盘点完成，减少 ${Math.abs(adjustment)} 件`;

        return {
          success: true,
          message,
          adjustment,
        };
      });
    } catch (error) {
      this.log("库存盘点失败", { error: (error as Error).message });

      if (error instanceof TransactionScriptException) {
        return {
          success: false,
          message: error.message,
        };
      }

      throw new TransactionScriptException(
        `库存盘点失败: ${(error as Error).message}`,
        error as Error
      );
    }
  }
}

/**
 * Transaction Script使用示例
 */
export class TransactionScriptExample {
  private userRegistrationScript: UserRegistrationScript;
  private orderProcessingScript: OrderProcessingScript;
  private inventoryManagementScript: InventoryManagementScript;

  constructor(dataSource: DataSource) {
    this.userRegistrationScript = new UserRegistrationScript(dataSource);
    this.orderProcessingScript = new OrderProcessingScript(dataSource);
    this.inventoryManagementScript = new InventoryManagementScript(dataSource);
  }

  /**
   * 演示Transaction Script的使用
   */
  async demonstrateTransactionScript() {
    console.log("=== Transaction Script模式演示 ===");

    try {
      // 1. 用户注册
      console.log("\n1. 用户注册事务脚本:");
      const registrationResult = await this.userRegistrationScript.registerUser(
        {
          username: "scriptuser",
          email: "script@example.com",
          password: "SecurePass123",
          firstName: "Script",
          lastName: "User",
          phone: "13900139000",
        }
      );
      console.log("✓ 注册结果:", registrationResult);

      // 2. 库存补充
      console.log("\n2. 库存管理事务脚本:");
      const stockResult = await this.inventoryManagementScript.replenishStock({
        productId: "product-script-1",
        quantity: 100,
        supplierId: "supplier-1",
        cost: 50.0,
        batchNumber: "BATCH-2024-001",
      });
      console.log("✓ 库存补充结果:", stockResult);

      // 3. 订单创建
      console.log("\n3. 订单处理事务脚本:");
      const orderResult = await this.orderProcessingScript.createOrder({
        userId: registrationResult.userId,
        items: [
          {
            productId: "product-script-1",
            quantity: 2,
          },
        ],
        shippingAddress: {
          street: "脚本大街123号",
          city: "上海市",
          province: "上海市",
          postalCode: "200000",
        },
        paymentMethod: "credit_card",
      });
      console.log("✓ 订单创建结果:", orderResult);

      // 4. 订单取消
      if (orderResult.success) {
        console.log("\n4. 订单取消事务脚本:");
        const cancelResult = await this.orderProcessingScript.cancelOrder(
          orderResult.orderId,
          registrationResult.userId,
          "用户主动取消"
        );
        console.log("✓ 订单取消结果:", cancelResult);
      }

      // 5. 库存盘点
      console.log("\n5. 库存盘点事务脚本:");
      const takingResult = await this.inventoryManagementScript.stockTaking({
        productId: "product-script-1",
        actualQuantity: 98,
        operator: "inventory_manager",
        notes: "定期盘点",
      });
      console.log("✓ 盘点结果:", takingResult);

      this.printTransactionScriptGuidelines();
    } catch (error) {
      console.error("Transaction Script演示失败:", error);
    }
  }

  private printTransactionScriptGuidelines(): void {
    console.log(`
Transaction Script模式使用指南：

设计原则：
- 面向过程的设计
- 每个方法对应一个业务事务
- 直接使用数据访问对象
- 简单直接的控制流

优点：
- 简单易懂
- 快速开发
- 直接的事务控制
- 易于调试和维护

缺点：
- 代码重复
- 难以应对复杂业务
- 缺乏对象模型
- 业务逻辑分散

适用场景：
- 简单的业务逻辑
- 快速原型开发
- 数据处理脚本
- 小型应用

最佳实践：
- 保持脚本简单
- 使用事务保证一致性
- 充分的错误处理
- 记录详细日志
- 适当的输入验证

何时考虑其他模式：
- 业务逻辑变复杂时考虑Domain Model
- 需要对象模型时考虑Active Record
- 需要更好的测试性时考虑Service Layer
    `);
  }
}
