/**
 * Table Module（表模块）模式
 *
 * 为单个数据库表或视图提供业务逻辑的模块。
 * 一个Table Module实例处理表中的所有行。
 *
 * 主要特点：
 * - 一个模块对应一个表
 * - 处理表中所有行的业务逻辑
 * - 通常与Table Data Gateway配合使用
 * - 适合基于表的数据库设计
 *
 * 优点：
 * - 清晰的表和逻辑对应关系
 * - 易于理解和维护
 * - 适合SQL密集型应用
 * - 支持存储过程
 *
 * 缺点：
 * - 紧耦合数据库结构
 * - 难以处理复杂对象关系
 * - 不支持继承多态
 *
 * 适用场景：
 * - 数据驱动的应用
 * - 报表和分析系统
 * - 简单的CRUD操作
 * - 基于表的业务逻辑
 */

import { DataSource, QueryRunner } from "typeorm";

/**
 * Table Module异常
 */
export class TableModuleException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "TableModuleException";
  }
}

/**
 * 数据集接口
 * 表示查询结果的数据集
 */
export interface DataSet {
  rows: any[];
  columns: string[];
  metadata?: {
    totalRows: number;
    affectedRows: number;
    insertId?: string;
  };
}

/**
 * 查询条件接口
 */
export interface QueryCondition {
  field: string;
  operator:
    | "="
    | "!="
    | ">"
    | "<"
    | ">="
    | "<="
    | "LIKE"
    | "IN"
    | "IS NULL"
    | "IS NOT NULL";
  value?: any;
}

/**
 * 排序条件接口
 */
export interface SortCondition {
  field: string;
  direction: "ASC" | "DESC";
}

/**
 * 抽象Table Module基类
 */
export abstract class TableModule {
  protected dataSource: DataSource;
  protected tableName: string;

  constructor(dataSource: DataSource, tableName: string) {
    this.dataSource = dataSource;
    this.tableName = tableName;
  }

  /**
   * 查找所有记录
   */
  async findAll(
    conditions?: QueryCondition[],
    sorts?: SortCondition[],
    limit?: number,
    offset?: number
  ): Promise<DataSet> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      let sql = `SELECT * FROM ${this.tableName}`;
      const parameters: any[] = [];

      // 添加WHERE条件
      if (conditions && conditions.length > 0) {
        const whereClause = this.buildWhereClause(conditions, parameters);
        sql += ` WHERE ${whereClause}`;
      }

      // 添加ORDER BY
      if (sorts && sorts.length > 0) {
        const orderClause = sorts
          .map((sort) => `${sort.field} ${sort.direction}`)
          .join(", ");
        sql += ` ORDER BY ${orderClause}`;
      }

      // 添加LIMIT和OFFSET
      if (limit) {
        sql += ` LIMIT ${limit}`;
      }
      if (offset) {
        sql += ` OFFSET ${offset}`;
      }

      const rows = await queryRunner.query(sql, parameters);
      const columns = Object.keys(rows[0] || {});

      return {
        rows,
        columns,
        metadata: {
          totalRows: rows.length,
          affectedRows: 0,
        },
      };
    } catch (error) {
      throw new TableModuleException(
        `查询失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 根据ID查找记录
   */
  async findById(id: any): Promise<any | null> {
    const result = await this.findAll([
      { field: "id", operator: "=", value: id },
    ]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 插入记录
   */
  async insert(data: any): Promise<string> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

      const sql = `INSERT INTO ${this.tableName} (${fields.join(
        ", "
      )}) VALUES (${placeholders}) RETURNING id`;
      const result = await queryRunner.query(sql, values);

      await queryRunner.commitTransaction();
      return result[0].id;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new TableModuleException(
        `插入失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 更新记录
   */
  async update(id: any, data: any): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const fields = Object.keys(data);
      const values = Object.values(data);

      const setClause = fields
        .map((field, index) => `${field} = $${index + 1}`)
        .join(", ");

      values.push(id);
      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${values.length}`;

      const result = await queryRunner.query(sql, values);
      await queryRunner.commitTransaction();

      return result.affectedRows || 0;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new TableModuleException(
        `更新失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 删除记录
   */
  async delete(id: any): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = $1`;
      const result = await queryRunner.query(sql, [id]);

      await queryRunner.commitTransaction();
      return result.affectedRows || 0;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new TableModuleException(
        `删除失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 统计记录数
   */
  async count(conditions?: QueryCondition[]): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const parameters: any[] = [];

      if (conditions && conditions.length > 0) {
        const whereClause = this.buildWhereClause(conditions, parameters);
        sql += ` WHERE ${whereClause}`;
      }

      const result = await queryRunner.query(sql, parameters);
      return parseInt(result[0].count);
    } catch (error) {
      throw new TableModuleException(
        `统计失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 执行自定义SQL
   */
  async executeQuery(sql: string, parameters: any[] = []): Promise<DataSet> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const result = await queryRunner.query(sql, parameters);
      const rows = Array.isArray(result) ? result : [result];
      const columns = Object.keys(rows[0] || {});

      return {
        rows,
        columns,
        metadata: {
          totalRows: rows.length,
          affectedRows: result.affectedRows || 0,
        },
      };
    } catch (error) {
      throw new TableModuleException(
        `查询执行失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 构建WHERE子句
   */
  private buildWhereClause(
    conditions: QueryCondition[],
    parameters: any[]
  ): string {
    return conditions
      .map((condition, index) => {
        const paramIndex = parameters.length + 1;

        switch (condition.operator) {
          case "IS NULL":
            return `${condition.field} IS NULL`;
          case "IS NOT NULL":
            return `${condition.field} IS NOT NULL`;
          case "IN":
            if (Array.isArray(condition.value)) {
              const placeholders = condition.value
                .map((_, i) => `$${paramIndex + i}`)
                .join(", ");
              parameters.push(...condition.value);
              return `${condition.field} IN (${placeholders})`;
            }
            break;
          default:
            parameters.push(condition.value);
            return `${condition.field} ${condition.operator} $${paramIndex}`;
        }

        return "";
      })
      .filter(Boolean)
      .join(" AND ");
  }
}

// ======================== 具体Table Module实现 ========================

/**
 * 用户表模块
 */
export class UserTableModule extends TableModule {
  constructor(dataSource: DataSource) {
    super(dataSource, "users");
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<any | null> {
    const result = await this.findAll([
      { field: "email", operator: "=", value: email },
    ]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 查找活跃用户
   */
  async findActiveUsers(): Promise<DataSet> {
    return this.findAll(
      [{ field: "is_active", operator: "=", value: true }],
      [{ field: "created_at", direction: "DESC" }]
    );
  }

  /**
   * 创建用户
   */
  async createUser(userData: {
    username: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }): Promise<string> {
    // 验证邮箱和用户名是否已存在
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new TableModuleException("邮箱已被注册");
    }

    const existingUsername = await this.findAll([
      { field: "username", operator: "=", value: userData.username },
    ]);
    if (existingUsername.rows.length > 0) {
      throw new TableModuleException("用户名已被使用");
    }

    // 创建用户
    const userRecord = {
      ...userData,
      is_active: true,
      email_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    return this.insert(userRecord);
  }

  /**
   * 验证用户登录
   */
  async validateLogin(
    usernameOrEmail: string,
    passwordHash: string
  ): Promise<any | null> {
    const result = await this.findAll([
      { field: "username", operator: "=", value: usernameOrEmail },
      { field: "password_hash", operator: "=", value: passwordHash },
      { field: "is_active", operator: "=", value: true },
    ]);

    if (result.rows.length === 0) {
      // 尝试邮箱登录
      const emailResult = await this.findAll([
        { field: "email", operator: "=", value: usernameOrEmail },
        { field: "password_hash", operator: "=", value: passwordHash },
        { field: "is_active", operator: "=", value: true },
      ]);
      return emailResult.rows.length > 0 ? emailResult.rows[0] : null;
    }

    return result.rows[0];
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.update(userId, {
      last_login_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * 获取用户统计信息
   */
  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    verifiedUsers: number;
  }> {
    const totalUsers = await this.count();
    const activeUsers = await this.count([
      { field: "is_active", operator: "=", value: true },
    ]);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const newUsersThisMonth = await this.count([
      { field: "created_at", operator: ">=", value: thisMonth },
    ]);

    const verifiedUsers = await this.count([
      { field: "email_verified", operator: "=", value: true },
    ]);

    return {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      verifiedUsers,
    };
  }
}

/**
 * 产品表模块
 */
export class ProductTableModule extends TableModule {
  constructor(dataSource: DataSource) {
    super(dataSource, "products");
  }

  /**
   * 查找某分类的产品
   */
  async findByCategory(categoryId: string): Promise<DataSet> {
    return this.findAll(
      [
        { field: "category_id", operator: "=", value: categoryId },
        { field: "is_active", operator: "=", value: true },
      ],
      [{ field: "name", direction: "ASC" }]
    );
  }

  /**
   * 查找有库存的产品
   */
  async findInStock(): Promise<DataSet> {
    return this.findAll([
      { field: "stock_quantity", operator: ">", value: 0 },
      { field: "is_active", operator: "=", value: true },
    ]);
  }

  /**
   * 搜索产品
   */
  async searchProducts(keyword: string): Promise<DataSet> {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE (name ILIKE $1 OR description ILIKE $1) 
        AND is_active = true 
      ORDER BY name ASC
    `;
    return this.executeQuery(sql, [`%${keyword}%`]);
  }

  /**
   * 更新库存
   */
  async updateStock(productId: string, quantity: number): Promise<void> {
    if (quantity < 0) {
      throw new TableModuleException("库存数量不能为负数");
    }

    await this.update(productId, {
      stock_quantity: quantity,
      updated_at: new Date(),
    });
  }

  /**
   * 减少库存
   */
  async reduceStock(productId: string, quantity: number): Promise<void> {
    const product = await this.findById(productId);
    if (!product) {
      throw new TableModuleException("产品不存在");
    }

    const newQuantity = product.stock_quantity - quantity;
    if (newQuantity < 0) {
      throw new TableModuleException("库存不足");
    }

    await this.updateStock(productId, newQuantity);
  }

  /**
   * 获取产品销售报表
   */
  async getProductSalesReport(
    startDate: Date,
    endDate: Date
  ): Promise<DataSet> {
    const sql = `
      SELECT 
        p.id,
        p.name,
        p.price_amount,
        p.stock_quantity,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.quantity * oi.price_amount), 0) as total_revenue
      FROM ${this.tableName} p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at BETWEEN $1 AND $2
        OR o.created_at IS NULL
      GROUP BY p.id, p.name, p.price_amount, p.stock_quantity
      ORDER BY total_revenue DESC
    `;

    return this.executeQuery(sql, [startDate, endDate]);
  }
}

/**
 * 订单表模块
 */
export class OrderTableModule extends TableModule {
  constructor(dataSource: DataSource) {
    super(dataSource, "orders");
  }

  /**
   * 查找用户订单
   */
  async findByUserId(userId: string): Promise<DataSet> {
    return this.findAll(
      [{ field: "user_id", operator: "=", value: userId }],
      [{ field: "created_at", direction: "DESC" }]
    );
  }

  /**
   * 查找特定状态的订单
   */
  async findByStatus(status: string): Promise<DataSet> {
    return this.findAll(
      [{ field: "status", operator: "=", value: status }],
      [{ field: "created_at", direction: "ASC" }]
    );
  }

  /**
   * 创建订单
   */
  async createOrder(orderData: {
    user_id: string;
    total_amount: number;
    currency: string;
    shipping_address: string;
    items: Array<{
      product_id: string;
      quantity: number;
      price_amount: number;
    }>;
  }): Promise<string> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 创建订单
      const orderRecord = {
        user_id: orderData.user_id,
        status: "pending",
        total_amount: orderData.total_amount,
        currency: orderData.currency,
        shipping_address: orderData.shipping_address,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const orderSql = `
        INSERT INTO orders (user_id, status, total_amount, currency, shipping_address, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      const orderResult = await queryRunner.query(
        orderSql,
        Object.values(orderRecord)
      );
      const orderId = orderResult[0].id;

      // 创建订单项
      for (const item of orderData.items) {
        const itemSql = `
          INSERT INTO order_items (order_id, product_id, quantity, price_amount, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await queryRunner.query(itemSql, [
          orderId,
          item.product_id,
          item.quantity,
          item.price_amount,
          new Date(),
        ]);
      }

      await queryRunner.commitTransaction();
      return orderId;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new TableModuleException(
        `创建订单失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 更新订单状态
   */
  async updateStatus(orderId: string, status: string): Promise<void> {
    const validStatuses = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      throw new TableModuleException("无效的订单状态");
    }

    await this.update(orderId, {
      status: status,
      updated_at: new Date(),
    });
  }

  /**
   * 获取订单统计报表
   */
  async getOrderStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: { [status: string]: number };
  }> {
    // 总订单数和总收入
    const totalSql = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(AVG(total_amount), 0) as average_order_value
      FROM ${this.tableName}
      WHERE created_at BETWEEN $1 AND $2
    `;
    const totalResult = await this.executeQuery(totalSql, [startDate, endDate]);
    const totals = totalResult.rows[0];

    // 按状态统计
    const statusSql = `
      SELECT status, COUNT(*) as count
      FROM ${this.tableName}
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY status
    `;
    const statusResult = await this.executeQuery(statusSql, [
      startDate,
      endDate,
    ]);

    const ordersByStatus: { [status: string]: number } = {};
    statusResult.rows.forEach((row) => {
      ordersByStatus[row.status] = parseInt(row.count);
    });

    return {
      totalOrders: parseInt(totals.total_orders),
      totalRevenue: parseFloat(totals.total_revenue),
      averageOrderValue: parseFloat(totals.average_order_value),
      ordersByStatus,
    };
  }
}

/**
 * Table Module工厂
 */
export class TableModuleFactory {
  constructor(private dataSource: DataSource) {}

  createUserModule(): UserTableModule {
    return new UserTableModule(this.dataSource);
  }

  createProductModule(): ProductTableModule {
    return new ProductTableModule(this.dataSource);
  }

  createOrderModule(): OrderTableModule {
    return new OrderTableModule(this.dataSource);
  }
}

/**
 * Table Module使用示例
 */
export class TableModuleExample {
  private userModule: UserTableModule;
  private productModule: ProductTableModule;
  private orderModule: OrderTableModule;

  constructor(dataSource: DataSource) {
    this.userModule = new UserTableModule(dataSource);
    this.productModule = new ProductTableModule(dataSource);
    this.orderModule = new OrderTableModule(dataSource);
  }

  /**
   * 演示Table Module的使用
   */
  async demonstrateTableModule() {
    console.log("=== Table Module模式演示 ===");

    try {
      // 1. 用户管理
      console.log("\n1. 用户管理:");
      const userId = await this.userModule.createUser({
        username: "tableuser",
        email: "table@example.com",
        password_hash: "hashed_password",
        first_name: "Table",
        last_name: "User",
        phone: "13800138000",
      });
      console.log("✓ 用户已创建，ID:", userId);

      // 验证登录
      const user = await this.userModule.validateLogin(
        "tableuser",
        "hashed_password"
      );
      console.log("✓ 用户登录验证:", user ? "成功" : "失败");

      // 获取用户统计
      const userStats = await this.userModule.getUserStatistics();
      console.log("✓ 用户统计:", userStats);

      // 2. 产品管理
      console.log("\n2. 产品管理:");
      const productId = await this.productModule.insert({
        name: "测试产品",
        description: "Table Module测试产品",
        price_amount: 99.99,
        price_currency: "CNY",
        category_id: "cat-1",
        stock_quantity: 100,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("✓ 产品已创建，ID:", productId);

      // 搜索产品
      const searchResult = await this.productModule.searchProducts("测试");
      console.log("✓ 产品搜索结果:", searchResult.rows.length, "个产品");

      // 3. 订单管理
      console.log("\n3. 订单管理:");
      const orderId = await this.orderModule.createOrder({
        user_id: userId,
        total_amount: 199.98,
        currency: "CNY",
        shipping_address: "北京市朝阳区",
        items: [
          {
            product_id: productId,
            quantity: 2,
            price_amount: 99.99,
          },
        ],
      });
      console.log("✓ 订单已创建，ID:", orderId);

      // 更新订单状态
      await this.orderModule.updateStatus(orderId, "confirmed");
      console.log("✓ 订单状态已更新");

      // 获取订单统计
      const orderStats = await this.orderModule.getOrderStatistics(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
        new Date()
      );
      console.log("✓ 订单统计:", orderStats);

      this.printTableModuleGuidelines();
    } catch (error) {
      console.error("Table Module演示失败:", error);
    }
  }

  private printTableModuleGuidelines(): void {
    console.log(`
Table Module模式使用指南：

设计原则：
- 一个模块对应一个表
- 处理表中所有行的业务逻辑
- 使用DataSet作为数据载体
- 结合Table Data Gateway使用

适用场景：
- 基于表的业务逻辑
- 报表和分析系统
- SQL密集型应用
- 简单的数据处理

优点：
- 清晰的表和逻辑对应关系
- 易于理解和维护
- 支持复杂的SQL查询
- 适合数据驱动的应用

缺点：
- 紧耦合数据库结构
- 难以处理复杂对象关系
- 不支持继承和多态
- 业务逻辑分散

最佳实践：
- 保持模块的单一职责
- 使用事务保证数据一致性
- 提供清晰的API接口
- 考虑性能优化
- 处理好异常情况
    `);
  }
}
