/**
 * Table Data Gateway（表数据网关）模式
 *
 * 为数据库表提供简单访问接口的对象。
 * 一个Table Data Gateway实例处理表中的所有行。
 *
 * 主要特点：
 * - 封装数据库表的访问逻辑
 * - 提供简单的CRUD操作
 * - 不包含业务逻辑
 * - 返回基本数据类型
 *
 * 优点：
 * - 简单易懂
 * - 封装SQL细节
 * - 易于测试
 * - 分离数据访问关注点
 *
 * 缺点：
 * - 可能产生很多小类
 * - 复杂查询支持有限
 * - 紧耦合数据库结构
 *
 * 适用场景：
 * - 简单的数据访问需求
 * - 需要封装SQL的场景
 * - 测试驱动开发
 * - 小型到中型应用
 */

import { DataSource, QueryRunner } from "typeorm";

/**
 * Table Data Gateway异常
 */
export class TableDataGatewayException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "TableDataGatewayException";
  }
}

/**
 * 数据记录接口
 */
export interface DataRecord {
  [key: string]: any;
}

/**
 * 查询选项接口
 */
export interface QueryOptions {
  where?: { [key: string]: any };
  orderBy?: { [key: string]: "ASC" | "DESC" };
  limit?: number;
  offset?: number;
  select?: string[];
}

/**
 * 抽象Table Data Gateway基类
 */
export abstract class TableDataGateway {
  protected dataSource: DataSource;
  protected tableName: string;

  constructor(dataSource: DataSource, tableName: string) {
    this.dataSource = dataSource;
    this.tableName = tableName;
  }

  /**
   * 查找所有记录
   */
  async findAll(options?: QueryOptions): Promise<DataRecord[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      let sql = this.buildSelectClause(options?.select);
      sql += ` FROM ${this.tableName}`;

      const parameters: any[] = [];

      // 构建WHERE子句
      if (options?.where) {
        const whereClause = this.buildWhereClause(options.where, parameters);
        if (whereClause) {
          sql += ` WHERE ${whereClause}`;
        }
      }

      // 构建ORDER BY子句
      if (options?.orderBy) {
        const orderClause = Object.entries(options.orderBy)
          .map(([field, direction]) => `${field} ${direction}`)
          .join(", ");
        sql += ` ORDER BY ${orderClause}`;
      }

      // 添加LIMIT和OFFSET
      if (options?.limit) {
        sql += ` LIMIT ${options.limit}`;
      }
      if (options?.offset) {
        sql += ` OFFSET ${options.offset}`;
      }

      return await queryRunner.query(sql, parameters);
    } catch (error) {
      throw new TableDataGatewayException(
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
  async findById(id: any): Promise<DataRecord | null> {
    const records = await this.findAll({
      where: { id },
      limit: 1,
    });
    return records.length > 0 ? records[0] : null;
  }

  /**
   * 根据条件查找单条记录
   */
  async findOne(where: { [key: string]: any }): Promise<DataRecord | null> {
    const records = await this.findAll({
      where,
      limit: 1,
    });
    return records.length > 0 ? records[0] : null;
  }

  /**
   * 插入记录
   */
  async insert(data: DataRecord): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");

      const sql = `INSERT INTO ${this.tableName} (${fields.join(
        ", "
      )}) VALUES (${placeholders}) RETURNING *`;
      const result = await queryRunner.query(sql, values);

      return result[0];
    } catch (error) {
      throw new TableDataGatewayException(
        `插入失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 批量插入记录
   */
  async insertBatch(dataList: DataRecord[]): Promise<DataRecord[]> {
    if (dataList.length === 0) {
      return [];
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const results: DataRecord[] = [];

      for (const data of dataList) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values
          .map((_, index) => `$${index + 1}`)
          .join(", ");

        const sql = `INSERT INTO ${this.tableName} (${fields.join(
          ", "
        )}) VALUES (${placeholders}) RETURNING *`;
        const result = await queryRunner.query(sql, values);
        results.push(result[0]);
      }

      await queryRunner.commitTransaction();
      return results;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new TableDataGatewayException(
        `批量插入失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 更新记录
   */
  async update(id: any, data: DataRecord): Promise<DataRecord | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const fields = Object.keys(data);
      const values = Object.values(data);

      const setClause = fields
        .map((field, index) => `${field} = $${index + 1}`)
        .join(", ");

      values.push(id);
      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${values.length} RETURNING *`;

      const result = await queryRunner.query(sql, values);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      throw new TableDataGatewayException(
        `更新失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 根据条件更新记录
   */
  async updateWhere(
    where: { [key: string]: any },
    data: DataRecord
  ): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const setFields = Object.keys(data);
      const setValues = Object.values(data);
      const parameters: any[] = [...setValues];

      const setClause = setFields
        .map((field, index) => `${field} = $${index + 1}`)
        .join(", ");

      const whereClause = this.buildWhereClause(
        where,
        parameters,
        setValues.length
      );

      const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`;

      const result = await queryRunner.query(sql, parameters);
      return result.affectedRows || 0;
    } catch (error) {
      throw new TableDataGatewayException(
        `条件更新失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 删除记录
   */
  async delete(id: any): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const sql = `DELETE FROM ${this.tableName} WHERE id = $1`;
      const result = await queryRunner.query(sql, [id]);

      return (result.affectedRows || 0) > 0;
    } catch (error) {
      throw new TableDataGatewayException(
        `删除失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 根据条件删除记录
   */
  async deleteWhere(where: { [key: string]: any }): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const parameters: any[] = [];
      const whereClause = this.buildWhereClause(where, parameters);

      const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
      const result = await queryRunner.query(sql, parameters);

      return result.affectedRows || 0;
    } catch (error) {
      throw new TableDataGatewayException(
        `条件删除失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 统计记录数
   */
  async count(where?: { [key: string]: any }): Promise<number> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const parameters: any[] = [];

      if (where) {
        const whereClause = this.buildWhereClause(where, parameters);
        if (whereClause) {
          sql += ` WHERE ${whereClause}`;
        }
      }

      const result = await queryRunner.query(sql, parameters);
      return parseInt(result[0].count);
    } catch (error) {
      throw new TableDataGatewayException(
        `统计失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 检查记录是否存在
   */
  async exists(where: { [key: string]: any }): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * 构建SELECT子句
   */
  private buildSelectClause(select?: string[]): string {
    if (select && select.length > 0) {
      return `SELECT ${select.join(", ")}`;
    }
    return `SELECT *`;
  }

  /**
   * 构建WHERE子句
   */
  private buildWhereClause(
    where: { [key: string]: any },
    parameters: any[],
    startIndex: number = 0
  ): string {
    const conditions: string[] = [];

    Object.entries(where).forEach(([field, value]) => {
      const paramIndex = parameters.length + 1 + startIndex;

      if (value === null) {
        conditions.push(`${field} IS NULL`);
      } else if (value === undefined) {
        // 跳过undefined值
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          const placeholders = value
            .map((_, i) => `$${paramIndex + i}`)
            .join(", ");
          parameters.push(...value);
          conditions.push(`${field} IN (${placeholders})`);
        }
      } else {
        parameters.push(value);
        conditions.push(`${field} = $${paramIndex}`);
      }
    });

    return conditions.join(" AND ");
  }
}

// ======================== 具体Table Data Gateway实现 ========================

/**
 * 用户表数据网关
 */
export class UserTableDataGateway extends TableDataGateway {
  constructor(dataSource: DataSource) {
    super(dataSource, "users");
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<DataRecord | null> {
    return this.findOne({ email });
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username: string): Promise<DataRecord | null> {
    return this.findOne({ username });
  }

  /**
   * 查找活跃用户
   */
  async findActiveUsers(): Promise<DataRecord[]> {
    return this.findAll({
      where: { is_active: true },
      orderBy: { created_at: "DESC" },
    });
  }

  /**
   * 查找最近注册的用户
   */
  async findRecentUsers(limit: number = 10): Promise<DataRecord[]> {
    return this.findAll({
      orderBy: { created_at: "DESC" },
      limit,
    });
  }

  /**
   * 根据邮箱验证状态查找用户
   */
  async findByEmailVerificationStatus(
    verified: boolean
  ): Promise<DataRecord[]> {
    return this.findAll({
      where: { email_verified: verified },
    });
  }
}

/**
 * 产品表数据网关
 */
export class ProductTableDataGateway extends TableDataGateway {
  constructor(dataSource: DataSource) {
    super(dataSource, "products");
  }

  /**
   * 根据分类查找产品
   */
  async findByCategory(categoryId: string): Promise<DataRecord[]> {
    return this.findAll({
      where: { category_id: categoryId, is_active: true },
      orderBy: { name: "ASC" },
    });
  }

  /**
   * 查找有库存的产品
   */
  async findInStock(): Promise<DataRecord[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const sql = `SELECT * FROM ${this.tableName} WHERE stock_quantity > 0 AND is_active = true ORDER BY name ASC`;
      return await queryRunner.query(sql);
    } catch (error) {
      throw new TableDataGatewayException(
        `查询有库存产品失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 根据价格范围查找产品
   */
  async findByPriceRange(
    minPrice: number,
    maxPrice: number
  ): Promise<DataRecord[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE price_amount BETWEEN $1 AND $2 
          AND is_active = true 
        ORDER BY price_amount ASC
      `;
      return await queryRunner.query(sql, [minPrice, maxPrice]);
    } catch (error) {
      throw new TableDataGatewayException(
        `价格范围查询失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 搜索产品
   */
  async searchByName(keyword: string): Promise<DataRecord[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE (name ILIKE $1 OR description ILIKE $1) 
          AND is_active = true 
        ORDER BY name ASC
      `;
      return await queryRunner.query(sql, [`%${keyword}%`]);
    } catch (error) {
      throw new TableDataGatewayException(
        `产品搜索失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }
}

/**
 * 订单表数据网关
 */
export class OrderTableDataGateway extends TableDataGateway {
  constructor(dataSource: DataSource) {
    super(dataSource, "orders");
  }

  /**
   * 根据用户ID查找订单
   */
  async findByUserId(userId: string): Promise<DataRecord[]> {
    return this.findAll({
      where: { user_id: userId },
      orderBy: { created_at: "DESC" },
    });
  }

  /**
   * 根据状态查找订单
   */
  async findByStatus(status: string): Promise<DataRecord[]> {
    return this.findAll({
      where: { status },
      orderBy: { created_at: "ASC" },
    });
  }

  /**
   * 查找日期范围内的订单
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<DataRecord[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE created_at BETWEEN $1 AND $2 
        ORDER BY created_at DESC
      `;
      return await queryRunner.query(sql, [startDate, endDate]);
    } catch (error) {
      throw new TableDataGatewayException(
        `日期范围查询失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 查找高价值订单
   */
  async findHighValueOrders(minAmount: number): Promise<DataRecord[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const sql = `
        SELECT * FROM ${this.tableName} 
        WHERE total_amount >= $1 
        ORDER BY total_amount DESC
      `;
      return await queryRunner.query(sql, [minAmount]);
    } catch (error) {
      throw new TableDataGatewayException(
        `高价值订单查询失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }
}

/**
 * 订单项表数据网关
 */
export class OrderItemTableDataGateway extends TableDataGateway {
  constructor(dataSource: DataSource) {
    super(dataSource, "order_items");
  }

  /**
   * 根据订单ID查找订单项
   */
  async findByOrderId(orderId: string): Promise<DataRecord[]> {
    return this.findAll({
      where: { order_id: orderId },
      orderBy: { created_at: "ASC" },
    });
  }

  /**
   * 根据产品ID查找订单项
   */
  async findByProductId(productId: string): Promise<DataRecord[]> {
    return this.findAll({
      where: { product_id: productId },
      orderBy: { created_at: "DESC" },
    });
  }

  /**
   * 获取产品销量统计
   */
  async getProductSalesStats(productId: string): Promise<{
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const sql = `
        SELECT 
          COALESCE(SUM(quantity), 0) as total_quantity,
          COALESCE(SUM(quantity * price_amount), 0) as total_revenue,
          COUNT(DISTINCT order_id) as order_count
        FROM ${this.tableName} 
        WHERE product_id = $1
      `;
      const result = await queryRunner.query(sql, [productId]);
      const stats = result[0];

      return {
        totalQuantity: parseInt(stats.total_quantity),
        totalRevenue: parseFloat(stats.total_revenue),
        orderCount: parseInt(stats.order_count),
      };
    } catch (error) {
      throw new TableDataGatewayException(
        `产品销量统计失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }
}

/**
 * Table Data Gateway工厂
 */
export class TableDataGatewayFactory {
  constructor(private dataSource: DataSource) {}

  createUserGateway(): UserTableDataGateway {
    return new UserTableDataGateway(this.dataSource);
  }

  createProductGateway(): ProductTableDataGateway {
    return new ProductTableDataGateway(this.dataSource);
  }

  createOrderGateway(): OrderTableDataGateway {
    return new OrderTableDataGateway(this.dataSource);
  }

  createOrderItemGateway(): OrderItemTableDataGateway {
    return new OrderItemTableDataGateway(this.dataSource);
  }
}

/**
 * Table Data Gateway使用示例
 */
export class TableDataGatewayExample {
  private userGateway: UserTableDataGateway;
  private productGateway: ProductTableDataGateway;
  private orderGateway: OrderTableDataGateway;
  private orderItemGateway: OrderItemTableDataGateway;

  constructor(dataSource: DataSource) {
    const factory = new TableDataGatewayFactory(dataSource);
    this.userGateway = factory.createUserGateway();
    this.productGateway = factory.createProductGateway();
    this.orderGateway = factory.createOrderGateway();
    this.orderItemGateway = factory.createOrderItemGateway();
  }

  /**
   * 演示Table Data Gateway的使用
   */
  async demonstrateTableDataGateway() {
    console.log("=== Table Data Gateway模式演示 ===");

    try {
      // 1. 用户数据访问
      console.log("\n1. 用户数据访问:");
      const newUser = await this.userGateway.insert({
        username: "gateway_user",
        email: "gateway@example.com",
        password_hash: "hashed_password",
        first_name: "Gateway",
        last_name: "User",
        is_active: true,
        email_verified: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("✓ 用户已创建:", newUser.id);

      // 根据邮箱查找用户
      const foundUser = await this.userGateway.findByEmail(
        "gateway@example.com"
      );
      console.log("✓ 根据邮箱找到用户:", foundUser?.username);

      // 2. 产品数据访问
      console.log("\n2. 产品数据访问:");
      const newProduct = await this.productGateway.insert({
        name: "Gateway产品",
        description: "Table Data Gateway演示产品",
        price_amount: 199.99,
        price_currency: "CNY",
        category_id: "category-1",
        stock_quantity: 50,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("✓ 产品已创建:", newProduct.id);

      // 搜索产品
      const products = await this.productGateway.searchByName("Gateway");
      console.log("✓ 搜索到产品:", products.length, "个");

      // 3. 订单数据访问
      console.log("\n3. 订单数据访问:");
      const newOrder = await this.orderGateway.insert({
        user_id: newUser.id,
        status: "pending",
        total_amount: 199.99,
        currency: "CNY",
        shipping_address: "上海市浦东新区",
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log("✓ 订单已创建:", newOrder.id);

      // 创建订单项
      const newOrderItem = await this.orderItemGateway.insert({
        order_id: newOrder.id,
        product_id: newProduct.id,
        quantity: 1,
        price_amount: 199.99,
        created_at: new Date(),
      });
      console.log("✓ 订单项已创建:", newOrderItem.id);

      // 4. 统计和分析
      console.log("\n4. 数据统计:");
      const userCount = await this.userGateway.count();
      const productCount = await this.productGateway.count({ is_active: true });
      const orderCount = await this.orderGateway.count();

      console.log(`✓ 用户总数: ${userCount}`);
      console.log(`✓ 活跃产品数: ${productCount}`);
      console.log(`✓ 订单总数: ${orderCount}`);

      // 产品销量统计
      const salesStats = await this.orderItemGateway.getProductSalesStats(
        newProduct.id
      );
      console.log("✓ 产品销量统计:", salesStats);

      // 5. 批量操作
      console.log("\n5. 批量操作:");
      const batchProducts = [
        {
          name: "批量产品1",
          description: "批量创建的产品",
          price_amount: 99.99,
          price_currency: "CNY",
          category_id: "category-1",
          stock_quantity: 30,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          name: "批量产品2",
          description: "批量创建的产品",
          price_amount: 149.99,
          price_currency: "CNY",
          category_id: "category-1",
          stock_quantity: 20,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const insertedProducts = await this.productGateway.insertBatch(
        batchProducts
      );
      console.log("✓ 批量创建产品:", insertedProducts.length, "个");

      this.printTableDataGatewayGuidelines();
    } catch (error) {
      console.error("Table Data Gateway演示失败:", error);
    }
  }

  private printTableDataGatewayGuidelines(): void {
    console.log(`
Table Data Gateway模式使用指南：

设计原则：
- 一个网关对应一个表
- 只包含数据访问逻辑
- 不包含业务逻辑
- 返回基本数据类型

主要功能：
- 基本CRUD操作
- 简单查询和过滤
- 批量操作支持
- 统计和聚合查询

优点：
- 简单直观
- 易于测试
- 封装SQL细节
- 分离数据访问关注点

缺点：
- 可能产生很多小类
- 复杂查询支持有限
- 紧耦合数据库结构

使用场景：
- 简单的数据访问需求
- 需要封装SQL的场景
- 测试驱动开发
- 与Table Module配合使用

最佳实践：
- 保持方法简单
- 使用事务保证一致性
- 提供批量操作支持
- 合理处理异常
- 考虑性能优化
    `);
  }
}
