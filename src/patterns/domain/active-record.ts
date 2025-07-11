/**
 * Active Record（活动记录）模式
 *
 * 对象既包含数据也包含数据库访问逻辑。
 * 每个Active Record对象都知道如何保存、更新和删除自己。
 *
 * 主要特点：
 * - 数据和行为的结合
 * - 简单的CRUD操作
 * - 直观的API设计
 * - 适合简单的域模型
 *
 * 优点：
 * - 简单易懂
 * - 快速开发
 * - 直观的API
 * - 适合小型项目
 *
 * 缺点：
 * - 违反单一职责原则
 * - 难以测试
 * - 紧耦合
 * - 不适合复杂业务逻辑
 *
 * 适用场景：
 * - 简单的CRUD应用
 * - 原型开发
 * - 小型项目
 * - 数据驱动的应用
 */

import { DataSource, QueryRunner } from "typeorm";

/**
 * Active Record异常
 */
export class ActiveRecordException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "ActiveRecordException";
  }
}

/**
 * Active Record基类
 */
export abstract class ActiveRecord {
  protected static dataSource: DataSource;
  protected static tableName: string;

  // 通用字段
  protected id?: string;
  protected createdAt?: Date;
  protected updatedAt?: Date;
  protected version?: number;

  // 状态标识
  private _isNew: boolean = true;
  private _isDeleted: boolean = false;
  private _isDirty: boolean = false;
  private _originalValues: { [key: string]: any } = {};

  /**
   * 设置数据源
   */
  static setDataSource(dataSource: DataSource): void {
    ActiveRecord.dataSource = dataSource;
  }

  /**
   * 获取数据源
   */
  static getDataSource(): DataSource {
    if (!ActiveRecord.dataSource) {
      throw new ActiveRecordException("数据源未设置");
    }
    return ActiveRecord.dataSource;
  }

  /**
   * 设置表名
   */
  static setTableName(tableName: string): void {
    ActiveRecord.tableName = tableName;
  }

  /**
   * 获取表名
   */
  static getTableName(): string {
    return ActiveRecord.tableName;
  }

  /**
   * 构造函数
   */
  constructor(data?: any) {
    if (data) {
      this.populate(data);
      this._isNew = false;
      this._originalValues = { ...data };
    }
  }

  /**
   * 从数据填充对象
   */
  protected populate(data: any): void {
    Object.assign(this, data);
  }

  /**
   * 获取ID
   */
  getId(): string | undefined {
    return this.id;
  }

  /**
   * 设置ID
   */
  setId(id: string): void {
    this.id = id;
  }

  /**
   * 检查是否为新记录
   */
  isNew(): boolean {
    return this._isNew;
  }

  /**
   * 检查是否已删除
   */
  isDeleted(): boolean {
    return this._isDeleted;
  }

  /**
   * 检查是否已修改
   */
  isDirty(): boolean {
    return this._isDirty;
  }

  /**
   * 标记为已修改
   */
  markDirty(): void {
    this._isDirty = true;
  }

  /**
   * 保存记录
   */
  async save(): Promise<void> {
    if (this._isDeleted) {
      throw new ActiveRecordException("无法保存已删除的记录");
    }

    const queryRunner = ActiveRecord.getDataSource().createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (this._isNew) {
        await this.insert(queryRunner);
        this._isNew = false;
      } else if (this._isDirty) {
        await this.update(queryRunner);
      }

      this._isDirty = false;
      this._originalValues = this.toObject();

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new ActiveRecordException(
        `保存记录失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 删除记录
   */
  async delete(): Promise<void> {
    if (this._isNew) {
      throw new ActiveRecordException("无法删除新记录");
    }

    if (this._isDeleted) {
      return;
    }

    const queryRunner = ActiveRecord.getDataSource().createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.performDelete(queryRunner);
      this._isDeleted = true;

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new ActiveRecordException(
        `删除记录失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 刷新记录
   */
  async refresh(): Promise<void> {
    if (this._isNew) {
      throw new ActiveRecordException("无法刷新新记录");
    }

    const tableName = (this.constructor as typeof ActiveRecord).getTableName();
    const queryRunner = ActiveRecord.getDataSource().createQueryRunner();
    await queryRunner.connect();

    try {
      const result = await queryRunner.query(
        `SELECT * FROM ${tableName} WHERE id = $1`,
        [this.id]
      );

      if (result.length === 0) {
        throw new ActiveRecordException(`记录 ${this.id} 不存在`);
      }

      this.populate(result[0]);
      this._isDirty = false;
      this._originalValues = this.toObject();
    } catch (error) {
      throw new ActiveRecordException(
        `刷新记录失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 执行插入操作
   */
  protected async insert(queryRunner: QueryRunner): Promise<void> {
    const tableName = (this.constructor as typeof ActiveRecord).getTableName();
    const data = this.toObject();

    // 生成ID和时间戳
    if (!data.id) {
      data.id = this.generateId();
      this.id = data.id;
    }

    data.createdAt = new Date();
    data.updatedAt = new Date();
    data.version = 1;

    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.version = data.version;

    const columns = Object.keys(data).join(", ");
    const placeholders = Object.keys(data)
      .map((_, index) => `$${index + 1}`)
      .join(", ");
    const values = Object.values(data);

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;

    await queryRunner.query(query, values);
  }

  /**
   * 执行更新操作
   */
  protected async update(queryRunner: QueryRunner): Promise<void> {
    const tableName = (this.constructor as typeof ActiveRecord).getTableName();
    const data = this.toObject();

    // 更新时间戳和版本
    data.updatedAt = new Date();
    data.version = (this.version || 0) + 1;

    this.updatedAt = data.updatedAt;
    this.version = data.version;

    const setClause = Object.keys(data)
      .filter((key) => key !== "id")
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");

    const values = Object.keys(data)
      .filter((key) => key !== "id")
      .map((key) => data[key]);

    values.push(this.id);

    const query = `UPDATE ${tableName} SET ${setClause} WHERE id = $${values.length}`;

    const result = await queryRunner.query(query, values);

    if (result.affectedRows === 0) {
      throw new ActiveRecordException(`记录 ${this.id} 不存在或已被修改`);
    }
  }

  /**
   * 执行删除操作
   */
  protected async performDelete(queryRunner: QueryRunner): Promise<void> {
    const tableName = (this.constructor as typeof ActiveRecord).getTableName();
    const query = `DELETE FROM ${tableName} WHERE id = $1`;

    const result = await queryRunner.query(query, [this.id]);

    if (result.affectedRows === 0) {
      throw new ActiveRecordException(`记录 ${this.id} 不存在`);
    }
  }

  /**
   * 转换为对象
   */
  protected toObject(): any {
    const obj: any = {};
    const keys = Object.keys(this);

    for (const key of keys) {
      if (!key.startsWith("_") && key !== "constructor") {
        obj[key] = (this as any)[key];
      }
    }

    return obj;
  }

  /**
   * 生成ID
   */
  protected generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ======================== 静态方法 ========================

  /**
   * 根据ID查找记录
   */
  static async find<T extends ActiveRecord>(
    this: new () => T,
    id: string
  ): Promise<T | null> {
    const queryRunner = ActiveRecord.getDataSource().createQueryRunner();
    await queryRunner.connect();

    try {
      const tableName = (this as any).getTableName();
      const result = await queryRunner.query(
        `SELECT * FROM ${tableName} WHERE id = $1`,
        [id]
      );

      if (result.length === 0) {
        return null;
      }

      return new this(result[0]);
    } catch (error) {
      throw new ActiveRecordException(
        `查找记录失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 查找所有记录
   */
  static async findAll<T extends ActiveRecord>(
    this: new () => T,
    options?: { limit?: number; offset?: number; orderBy?: string }
  ): Promise<T[]> {
    const queryRunner = ActiveRecord.getDataSource().createQueryRunner();
    await queryRunner.connect();

    try {
      const tableName = (this as any).getTableName();
      let query = `SELECT * FROM ${tableName}`;

      if (options?.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      }

      if (options?.limit) {
        query += ` LIMIT ${options.limit}`;
      }

      if (options?.offset) {
        query += ` OFFSET ${options.offset}`;
      }

      const results = await queryRunner.query(query);
      return results.map((row: any) => new this(row));
    } catch (error) {
      throw new ActiveRecordException(
        `查找所有记录失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 根据条件查找记录
   */
  static async findBy<T extends ActiveRecord>(
    this: new () => T,
    conditions: { [key: string]: any },
    options?: { limit?: number; offset?: number; orderBy?: string }
  ): Promise<T[]> {
    const queryRunner = ActiveRecord.getDataSource().createQueryRunner();
    await queryRunner.connect();

    try {
      const tableName = (this as any).getTableName();
      const whereClause = Object.keys(conditions)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(" AND ");

      let query = `SELECT * FROM ${tableName} WHERE ${whereClause}`;

      if (options?.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      }

      if (options?.limit) {
        query += ` LIMIT ${options.limit}`;
      }

      if (options?.offset) {
        query += ` OFFSET ${options.offset}`;
      }

      const values = Object.values(conditions);
      const results = await queryRunner.query(query, values);

      return results.map((row: any) => new this(row));
    } catch (error) {
      throw new ActiveRecordException(
        `按条件查找记录失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 统计记录数
   */
  static async count<T extends ActiveRecord>(
    this: new () => T,
    conditions?: { [key: string]: any }
  ): Promise<number> {
    const queryRunner = ActiveRecord.getDataSource().createQueryRunner();
    await queryRunner.connect();

    try {
      const tableName = (this as any).getTableName();
      let query = `SELECT COUNT(*) as count FROM ${tableName}`;
      let values: any[] = [];

      if (conditions) {
        const whereClause = Object.keys(conditions)
          .map((key, index) => `${key} = $${index + 1}`)
          .join(" AND ");
        query += ` WHERE ${whereClause}`;
        values = Object.values(conditions);
      }

      const result = await queryRunner.query(query, values);
      return parseInt(result[0].count);
    } catch (error) {
      throw new ActiveRecordException(
        `统计记录失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 删除所有记录
   */
  static async deleteAll<T extends ActiveRecord>(
    this: new () => T,
    conditions?: { [key: string]: any }
  ): Promise<number> {
    const queryRunner = ActiveRecord.getDataSource().createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tableName = (this as any).getTableName();
      let query = `DELETE FROM ${tableName}`;
      let values: any[] = [];

      if (conditions) {
        const whereClause = Object.keys(conditions)
          .map((key, index) => `${key} = $${index + 1}`)
          .join(" AND ");
        query += ` WHERE ${whereClause}`;
        values = Object.values(conditions);
      }

      const result = await queryRunner.query(query, values);
      await queryRunner.commitTransaction();

      return result.affectedRows || 0;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new ActiveRecordException(
        `删除记录失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }
}

// ======================== 具体实现示例 ========================

/**
 * 用户Active Record
 */
export class UserRecord extends ActiveRecord {
  static tableName = "users";

  username?: string;
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;

  constructor(data?: any) {
    super(data);
  }

  /**
   * 设置密码
   */
  setPassword(password: string): void {
    // 这里应该使用实际的密码哈希算法
    this.passwordHash = `hashed_${password}`;
    this.markDirty();
  }

  /**
   * 验证密码
   */
  verifyPassword(password: string): boolean {
    return this.passwordHash === `hashed_${password}`;
  }

  /**
   * 激活用户
   */
  activate(): void {
    this.isActive = true;
    this.markDirty();
  }

  /**
   * 停用用户
   */
  deactivate(): void {
    this.isActive = false;
    this.markDirty();
  }

  /**
   * 获取全名
   */
  getFullName(): string {
    return `${this.firstName || ""} ${this.lastName || ""}`.trim();
  }

  /**
   * 根据邮箱查找用户
   */
  static async findByEmail(email: string): Promise<UserRecord | null> {
    const users = await this.findBy({ email });
    return users.length > 0 ? users[0] : null;
  }

  /**
   * 根据用户名查找用户
   */
  static async findByUsername(username: string): Promise<UserRecord | null> {
    const users = await this.findBy({ username });
    return users.length > 0 ? users[0] : null;
  }

  /**
   * 查找活跃用户
   */
  static async findActiveUsers(): Promise<UserRecord[]> {
    return await this.findBy({ isActive: true });
  }
}

/**
 * 产品Active Record
 */
export class ProductRecord extends ActiveRecord {
  static tableName = "products";

  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  categoryId?: string;
  stockQuantity?: number;
  isActive?: boolean;

  constructor(data?: any) {
    super(data);
  }

  /**
   * 更新库存
   */
  updateStock(quantity: number): void {
    this.stockQuantity = quantity;
    this.markDirty();
  }

  /**
   * 检查是否有库存
   */
  inStock(): boolean {
    return (this.stockQuantity || 0) > 0;
  }

  /**
   * 设置价格
   */
  setPrice(price: number, currency: string = "CNY"): void {
    this.price = price;
    this.currency = currency;
    this.markDirty();
  }

  /**
   * 获取格式化价格
   */
  getFormattedPrice(): string {
    return `${this.price || 0} ${this.currency || "CNY"}`;
  }

  /**
   * 查找某分类的产品
   */
  static async findByCategory(categoryId: string): Promise<ProductRecord[]> {
    return await this.findBy({ categoryId, isActive: true });
  }

  /**
   * 查找有库存的产品
   */
  static async findInStock(): Promise<ProductRecord[]> {
    const queryRunner = ActiveRecord.getDataSource().createQueryRunner();
    await queryRunner.connect();

    try {
      const results = await queryRunner.query(
        `SELECT * FROM ${this.tableName} WHERE stock_quantity > 0 AND is_active = true`
      );
      return results.map((row: any) => new this(row));
    } catch (error) {
      throw new ActiveRecordException(
        `查找有库存产品失败: ${(error as Error).message}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }
}

// ======================== 使用示例 ========================

/**
 * Active Record使用示例
 */
export class ActiveRecordExample {
  async demonstrateActiveRecord() {
    console.log("=== Active Record模式演示 ===");

    try {
      // 1. 创建新用户
      console.log("\n1. 创建新用户:");
      const user = new UserRecord();
      user.username = "john_doe";
      user.email = "john@example.com";
      user.firstName = "John";
      user.lastName = "Doe";
      user.setPassword("secure123");
      user.activate();

      await user.save();
      console.log("✓ 用户已创建:", user.getFullName());

      // 2. 查找用户
      console.log("\n2. 查找用户:");
      const foundUser = await UserRecord.findByEmail("john@example.com");
      console.log("✓ 找到用户:", foundUser?.getFullName());

      // 3. 更新用户
      console.log("\n3. 更新用户:");
      if (foundUser) {
        foundUser.firstName = "Johnny";
        await foundUser.save();
        console.log("✓ 用户已更新:", foundUser.getFullName());
      }

      // 4. 创建产品
      console.log("\n4. 创建产品:");
      const product = new ProductRecord();
      product.name = "笔记本电脑";
      product.description = "高性能笔记本电脑";
      product.setPrice(5999, "CNY");
      product.updateStock(10);
      product.isActive = true;

      await product.save();
      console.log("✓ 产品已创建:", product.name);

      // 5. 查找产品
      console.log("\n5. 查找有库存的产品:");
      const inStockProducts = await ProductRecord.findInStock();
      console.log(`✓ 找到 ${inStockProducts.length} 个有库存的产品`);

      // 6. 统计记录
      console.log("\n6. 统计记录:");
      const userCount = await UserRecord.count();
      const productCount = await ProductRecord.count();
      console.log(`✓ 用户数: ${userCount}, 产品数: ${productCount}`);

      this.printActiveRecordGuidelines();
    } catch (error) {
      console.error("Active Record演示失败:", error);
    }
  }

  private printActiveRecordGuidelines(): void {
    console.log(`
Active Record模式使用指南：

优点：
- 简单直观的API
- 快速开发
- 对象与数据库记录一对一映射
- 适合简单的CRUD操作

缺点：
- 违反单一职责原则
- 紧耦合数据库
- 难以进行单元测试
- 不适合复杂的业务逻辑

适用场景：
- 简单的数据驱动应用
- 快速原型开发
- 小型项目
- 学习和教学用途

最佳实践：
- 保持业务逻辑简单
- 使用事务保证数据一致性
- 考虑使用验证和回调
- 为复杂查询提供静态方法
- 在大型项目中考虑迁移到Domain Model
    `);
  }
}
