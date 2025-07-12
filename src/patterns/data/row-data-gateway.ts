/**
 * Row Data Gateway（行数据网关）模式
 *
 * 为数据库表中的单行记录提供访问接口的对象。
 * 一个Row Data Gateway实例对应表中的一行记录。
 *
 * 主要特点：
 * - 一个实例对应一行记录
 * - 包含获取和设置字段值的方法
 * - 提供插入、更新、删除操作
 * - 不包含业务逻辑
 *
 * 优点：
 * - 简单直观的一对一映射
 * - 封装数据库访问细节
 * - 易于理解和使用
 * - 支持对象关系映射
 *
 * 缺点：
 * - 可能产生大量小对象
 * - 内存使用量较大
 * - 数据库连接较多
 *
 * 适用场景：
 * - 需要对象形式操作数据的场景
 * - 简单的CRUD操作
 * - 面向对象的数据访问
 * - 活动记录模式的轻量级替代
 */

import { DataSource, QueryRunner } from "typeorm";

/**
 * Row Data Gateway异常
 */
export class RowDataGatewayException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "RowDataGatewayException";
  }
}

/**
 * 抽象Row Data Gateway基类
 */
export abstract class RowDataGateway {
  protected dataSource: DataSource;
  protected tableName: string;
  protected primaryKeyField: string;
  protected isLoaded: boolean = false;
  protected isNew: boolean = true;
  protected isDirty: boolean = false;
  protected data: Map<string, any> = new Map();

  constructor(
    dataSource: DataSource,
    tableName: string,
    primaryKeyField: string
  ) {
    this.dataSource = dataSource;
    this.tableName = tableName;
    this.primaryKeyField = primaryKeyField;
  }

  /**
   * 获取主键值
   */
  public getId(): any {
    return this.data.get(this.primaryKeyField);
  }

  /**
   * 设置主键值
   */
  public setId(id: any): void {
    this.data.set(this.primaryKeyField, id);
  }

  /**
   * 获取字段值
   */
  protected getValue(fieldName: string): any {
    return this.data.get(fieldName);
  }

  /**
   * 设置字段值
   */
  protected setValue(fieldName: string, value: any): void {
    if (this.data.get(fieldName) !== value) {
      this.data.set(fieldName, value);
      this.isDirty = true;
    }
  }

  /**
   * 加载数据
   */
  public async load(id: any): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const result = await queryRunner.query(
        `SELECT * FROM ${this.tableName} WHERE ${this.primaryKeyField} = ?`,
        [id]
      );

      if (result.length === 0) {
        throw new RowDataGatewayException(
          `Record with id ${id} not found in ${this.tableName}`
        );
      }

      const record = result[0];
      for (const [key, value] of Object.entries(record)) {
        this.data.set(key, value);
      }

      this.isLoaded = true;
      this.isNew = false;
      this.isDirty = false;
    } catch (error) {
      throw new RowDataGatewayException(
        `Failed to load record from ${this.tableName}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 插入记录
   */
  public async insert(): Promise<void> {
    if (!this.isNew) {
      throw new RowDataGatewayException("Cannot insert existing record");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const fields = Array.from(this.data.keys());
      const values = Array.from(this.data.values());
      const placeholders = fields.map(() => "?").join(", ");

      const query = `INSERT INTO ${this.tableName} (${fields.join(
        ", "
      )}) VALUES (${placeholders})`;
      const result = await queryRunner.query(query, values);

      // 如果主键是自增的，更新主键值
      if (result.insertId && !this.getId()) {
        this.setId(result.insertId);
      }

      this.isNew = false;
      this.isDirty = false;
    } catch (error) {
      throw new RowDataGatewayException(
        `Failed to insert record into ${this.tableName}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 更新记录
   */
  public async update(): Promise<void> {
    if (this.isNew) {
      throw new RowDataGatewayException("Cannot update new record");
    }

    if (!this.isDirty) {
      return; // 没有变化，不需要更新
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const fields = Array.from(this.data.keys()).filter(
        (key) => key !== this.primaryKeyField
      );
      const values = fields.map((field) => this.data.get(field));
      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKeyField} = ?`;
      values.push(this.getId());

      await queryRunner.query(query, values);
      this.isDirty = false;
    } catch (error) {
      throw new RowDataGatewayException(
        `Failed to update record in ${this.tableName}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 删除记录
   */
  public async delete(): Promise<void> {
    if (this.isNew) {
      throw new RowDataGatewayException("Cannot delete new record");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKeyField} = ?`;
      await queryRunner.query(query, [this.getId()]);
    } catch (error) {
      throw new RowDataGatewayException(
        `Failed to delete record from ${this.tableName}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 保存记录（插入或更新）
   */
  public async save(): Promise<void> {
    if (this.isNew) {
      await this.insert();
    } else if (this.isDirty) {
      await this.update();
    }
  }

  /**
   * 检查记录是否存在
   */
  public async exists(id: any): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const result = await queryRunner.query(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${this.primaryKeyField} = ?`,
        [id]
      );
      return result[0].count > 0;
    } catch (error) {
      throw new RowDataGatewayException(
        `Failed to check existence in ${this.tableName}`,
        error as Error
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 获取所有字段数据
   */
  public getAllData(): { [key: string]: any } {
    const result: { [key: string]: any } = {};
    for (const [key, value] of this.data) {
      result[key] = value;
    }
    return result;
  }

  /**
   * 刷新数据
   */
  public async refresh(): Promise<void> {
    if (!this.isNew && this.getId()) {
      this.isLoaded = false;
      this.data.clear();
      await this.load(this.getId());
    }
  }

  /**
   * 克隆对象
   */
  public clone(): RowDataGateway {
    const cloned = Object.create(Object.getPrototypeOf(this));
    cloned.dataSource = this.dataSource;
    cloned.tableName = this.tableName;
    cloned.primaryKeyField = this.primaryKeyField;
    cloned.isLoaded = this.isLoaded;
    cloned.isNew = true; // 克隆的对象是新的
    cloned.isDirty = false;
    cloned.data = new Map(this.data);
    cloned.data.delete(this.primaryKeyField); // 清除主键，作为新记录
    return cloned;
  }
}

/**
 * 用户行数据网关
 */
export class UserRowDataGateway extends RowDataGateway {
  constructor(dataSource: DataSource) {
    super(dataSource, "users", "id");
  }

  // 获取用户名
  public getUsername(): string {
    return this.getValue("username");
  }

  // 设置用户名
  public setUsername(username: string): void {
    this.setValue("username", username);
  }

  // 获取邮箱
  public getEmail(): string {
    return this.getValue("email");
  }

  // 设置邮箱
  public setEmail(email: string): void {
    this.setValue("email", email);
  }

  // 获取创建时间
  public getCreatedAt(): Date {
    return this.getValue("created_at");
  }

  // 设置创建时间
  public setCreatedAt(createdAt: Date): void {
    this.setValue("created_at", createdAt);
  }

  // 获取更新时间
  public getUpdatedAt(): Date {
    return this.getValue("updated_at");
  }

  // 设置更新时间
  public setUpdatedAt(updatedAt: Date): void {
    this.setValue("updated_at", updatedAt);
  }

  // 创建新用户
  public static createNew(
    dataSource: DataSource,
    username: string,
    email: string
  ): UserRowDataGateway {
    const user = new UserRowDataGateway(dataSource);
    user.setUsername(username);
    user.setEmail(email);
    user.setCreatedAt(new Date());
    user.setUpdatedAt(new Date());
    return user;
  }

  // 根据ID查找用户
  public static async findById(
    dataSource: DataSource,
    id: number
  ): Promise<UserRowDataGateway | null> {
    const user = new UserRowDataGateway(dataSource);
    try {
      await user.load(id);
      return user;
    } catch (error) {
      if (error instanceof RowDataGatewayException) {
        return null;
      }
      throw error;
    }
  }

  // 根据用户名查找用户
  public static async findByUsername(
    dataSource: DataSource,
    username: string
  ): Promise<UserRowDataGateway | null> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const result = await queryRunner.query(
        "SELECT * FROM users WHERE username = ?",
        [username]
      );

      if (result.length === 0) {
        return null;
      }

      const user = new UserRowDataGateway(dataSource);
      const record = result[0];
      for (const [key, value] of Object.entries(record)) {
        user.data.set(key, value);
      }
      user.isLoaded = true;
      user.isNew = false;
      user.isDirty = false;

      return user;
    } finally {
      await queryRunner.release();
    }
  }
}

/**
 * 产品行数据网关
 */
export class ProductRowDataGateway extends RowDataGateway {
  constructor(dataSource: DataSource) {
    super(dataSource, "products", "id");
  }

  // 获取产品名称
  public getName(): string {
    return this.getValue("name");
  }

  // 设置产品名称
  public setName(name: string): void {
    this.setValue("name", name);
  }

  // 获取产品价格
  public getPrice(): number {
    return this.getValue("price");
  }

  // 设置产品价格
  public setPrice(price: number): void {
    this.setValue("price", price);
  }

  // 获取产品描述
  public getDescription(): string {
    return this.getValue("description");
  }

  // 设置产品描述
  public setDescription(description: string): void {
    this.setValue("description", description);
  }

  // 获取库存数量
  public getStock(): number {
    return this.getValue("stock");
  }

  // 设置库存数量
  public setStock(stock: number): void {
    this.setValue("stock", stock);
  }

  // 创建新产品
  public static createNew(
    dataSource: DataSource,
    name: string,
    price: number,
    description: string,
    stock: number
  ): ProductRowDataGateway {
    const product = new ProductRowDataGateway(dataSource);
    product.setName(name);
    product.setPrice(price);
    product.setDescription(description);
    product.setStock(stock);
    product.setValue("created_at", new Date());
    product.setValue("updated_at", new Date());
    return product;
  }

  // 根据ID查找产品
  public static async findById(
    dataSource: DataSource,
    id: number
  ): Promise<ProductRowDataGateway | null> {
    const product = new ProductRowDataGateway(dataSource);
    try {
      await product.load(id);
      return product;
    } catch (error) {
      if (error instanceof RowDataGatewayException) {
        return null;
      }
      throw error;
    }
  }

  // 获取低库存产品
  public static async findLowStock(
    dataSource: DataSource,
    threshold: number
  ): Promise<ProductRowDataGateway[]> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const results = await queryRunner.query(
        "SELECT * FROM products WHERE stock < ?",
        [threshold]
      );

      const products: ProductRowDataGateway[] = [];
      for (const result of results) {
        const product = new ProductRowDataGateway(dataSource);
        for (const [key, value] of Object.entries(result)) {
          product.data.set(key, value);
        }
        product.isLoaded = true;
        product.isNew = false;
        product.isDirty = false;
        products.push(product);
      }

      return products;
    } finally {
      await queryRunner.release();
    }
  }
}

/**
 * 订单行数据网关
 */
export class OrderRowDataGateway extends RowDataGateway {
  constructor(dataSource: DataSource) {
    super(dataSource, "orders", "id");
  }

  // 获取用户ID
  public getUserId(): number {
    return this.getValue("user_id");
  }

  // 设置用户ID
  public setUserId(userId: number): void {
    this.setValue("user_id", userId);
  }

  // 获取订单总额
  public getTotal(): number {
    return this.getValue("total");
  }

  // 设置订单总额
  public setTotal(total: number): void {
    this.setValue("total", total);
  }

  // 获取订单状态
  public getStatus(): string {
    return this.getValue("status");
  }

  // 设置订单状态
  public setStatus(status: string): void {
    this.setValue("status", status);
  }

  // 获取订单日期
  public getOrderDate(): Date {
    return this.getValue("order_date");
  }

  // 设置订单日期
  public setOrderDate(orderDate: Date): void {
    this.setValue("order_date", orderDate);
  }

  // 创建新订单
  public static createNew(
    dataSource: DataSource,
    userId: number,
    total: number,
    status: string = "pending"
  ): OrderRowDataGateway {
    const order = new OrderRowDataGateway(dataSource);
    order.setUserId(userId);
    order.setTotal(total);
    order.setStatus(status);
    order.setOrderDate(new Date());
    order.setValue("created_at", new Date());
    order.setValue("updated_at", new Date());
    return order;
  }

  // 根据ID查找订单
  public static async findById(
    dataSource: DataSource,
    id: number
  ): Promise<OrderRowDataGateway | null> {
    const order = new OrderRowDataGateway(dataSource);
    try {
      await order.load(id);
      return order;
    } catch (error) {
      if (error instanceof RowDataGatewayException) {
        return null;
      }
      throw error;
    }
  }

  // 根据用户ID查找订单
  public static async findByUserId(
    dataSource: DataSource,
    userId: number
  ): Promise<OrderRowDataGateway[]> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const results = await queryRunner.query(
        "SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC",
        [userId]
      );

      const orders: OrderRowDataGateway[] = [];
      for (const result of results) {
        const order = new OrderRowDataGateway(dataSource);
        for (const [key, value] of Object.entries(result)) {
          order.data.set(key, value);
        }
        order.isLoaded = true;
        order.isNew = false;
        order.isDirty = false;
        orders.push(order);
      }

      return orders;
    } finally {
      await queryRunner.release();
    }
  }

  // 获取用户对象
  public async getUser(): Promise<UserRowDataGateway | null> {
    if (!this.getUserId()) {
      return null;
    }
    return await UserRowDataGateway.findById(this.dataSource, this.getUserId());
  }
}

/**
 * Row Data Gateway工厂
 */
export class RowDataGatewayFactory {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  // 创建用户网关
  public createUserGateway(): UserRowDataGateway {
    return new UserRowDataGateway(this.dataSource);
  }

  // 创建产品网关
  public createProductGateway(): ProductRowDataGateway {
    return new ProductRowDataGateway(this.dataSource);
  }

  // 创建订单网关
  public createOrderGateway(): OrderRowDataGateway {
    return new OrderRowDataGateway(this.dataSource);
  }

  // 根据ID查找用户
  public async findUserById(id: number): Promise<UserRowDataGateway | null> {
    return await UserRowDataGateway.findById(this.dataSource, id);
  }

  // 根据ID查找产品
  public async findProductById(
    id: number
  ): Promise<ProductRowDataGateway | null> {
    return await ProductRowDataGateway.findById(this.dataSource, id);
  }

  // 根据ID查找订单
  public async findOrderById(id: number): Promise<OrderRowDataGateway | null> {
    return await OrderRowDataGateway.findById(this.dataSource, id);
  }
}

/**
 * Row Data Gateway演示类
 */
export class RowDataGatewayExample {
  private dataSource: DataSource;
  private factory: RowDataGatewayFactory;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.factory = new RowDataGatewayFactory(dataSource);
  }

  /**
   * 演示Row Data Gateway的使用
   */
  public async demonstrateRowDataGateway(): Promise<void> {
    console.log("=== Row Data Gateway 模式演示 ===");

    try {
      // 1. 创建新用户
      console.log("\n1. 创建新用户:");
      const newUser = UserRowDataGateway.createNew(
        this.dataSource,
        "john_doe",
        "john@example.com"
      );
      await newUser.save();
      console.log("✓ 用户创建成功，ID:", newUser.getId());

      // 2. 查找用户
      console.log("\n2. 查找用户:");
      const foundUser = await UserRowDataGateway.findById(
        this.dataSource,
        newUser.getId()
      );
      if (foundUser) {
        console.log(
          "✓ 找到用户:",
          foundUser.getUsername(),
          foundUser.getEmail()
        );
      }

      // 3. 更新用户
      console.log("\n3. 更新用户:");
      if (foundUser) {
        foundUser.setEmail("john.doe@example.com");
        await foundUser.save();
        console.log("✓ 用户邮箱更新成功");
      }

      // 4. 创建产品
      console.log("\n4. 创建产品:");
      const product = ProductRowDataGateway.createNew(
        this.dataSource,
        "笔记本电脑",
        8999.99,
        "高性能笔记本电脑",
        10
      );
      await product.save();
      console.log("✓ 产品创建成功，ID:", product.getId());

      // 5. 创建订单
      console.log("\n5. 创建订单:");
      const order = OrderRowDataGateway.createNew(
        this.dataSource,
        newUser.getId(),
        8999.99,
        "pending"
      );
      await order.save();
      console.log("✓ 订单创建成功，ID:", order.getId());

      // 6. 查找订单及其用户
      console.log("\n6. 查找订单及其用户:");
      const foundOrder = await OrderRowDataGateway.findById(
        this.dataSource,
        order.getId()
      );
      if (foundOrder) {
        console.log("✓ 找到订单:", foundOrder.getId(), foundOrder.getTotal());
        const orderUser = await foundOrder.getUser();
        if (orderUser) {
          console.log("✓ 订单用户:", orderUser.getUsername());
        }
      }

      // 7. 克隆对象
      console.log("\n7. 克隆对象:");
      const clonedProduct = product.clone();
      clonedProduct.setName("笔记本电脑 - 复制版");
      await clonedProduct.save();
      console.log("✓ 产品克隆成功，新ID:", clonedProduct.getId());

      // 8. 刷新数据
      console.log("\n8. 刷新数据:");
      await product.refresh();
      console.log("✓ 产品数据刷新成功");

      // 9. 演示工厂模式
      console.log("\n9. 使用工厂模式:");
      const userFromFactory = await this.factory.findUserById(newUser.getId());
      if (userFromFactory) {
        console.log("✓ 工厂获取用户成功:", userFromFactory.getUsername());
      }

      // 10. 批量查询
      console.log("\n10. 批量查询:");
      const lowStockProducts = await ProductRowDataGateway.findLowStock(
        this.dataSource,
        50
      );
      console.log("✓ 找到低库存产品:", lowStockProducts.length, "个");

      this.printRowDataGatewayGuidelines();
    } catch (error) {
      console.error("Row Data Gateway演示失败:", error);
    }
  }

  private printRowDataGatewayGuidelines(): void {
    console.log(`
Row Data Gateway模式使用指南：

设计原则：
- 一个实例对应一行记录
- 封装数据库访问逻辑
- 提供简单的CRUD操作
- 不包含业务逻辑

与Table Data Gateway的区别：
- Table Data Gateway：一个实例处理整个表
- Row Data Gateway：一个实例处理一行记录

适用场景：
- 需要对象形式操作数据
- 面向对象的数据访问
- 简单的CRUD操作
- 活动记录模式的轻量级替代

优点：
- 简单直观的一对一映射
- 封装数据库访问细节
- 易于理解和使用
- 支持对象关系映射

缺点：
- 可能产生大量小对象
- 内存使用量较大
- 数据库连接较多
- 不适合大量数据操作

最佳实践：
- 使用连接池管理数据库连接
- 实现适当的缓存机制
- 处理好异常情况
- 考虑使用工厂模式创建实例
- 为复杂查询提供静态方法
    `);
  }
}
