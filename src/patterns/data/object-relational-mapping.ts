/**
 * 对象关系映射模式 (Object-Relational Mapping Patterns)
 *
 * 处理对象模型与关系数据库之间复杂关系的映射策略
 * 包含三种主要模式：
 * 1. Foreign Key Mapping - 外键映射
 * 2. Association Table Mapping - 关联表映射
 * 3. Embedded Value - 嵌入值
 */

import { DatabaseConnection } from "../../infrastructure/database/data-source";

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * 领域对象基类
 */
abstract class DomainObject {
  constructor(
    public id: string,
    public version: number = 0,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}
}

// ============================================================================
// 嵌入值对象 (Embedded Value Objects)
// ============================================================================

/**
 * 金额值对象
 */
class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string = "USD"
  ) {
    if (amount < 0) {
      throw new Error("金额不能为负数");
    }
    if (!currency || currency.length !== 3) {
      throw new Error("货币代码必须是3位字符");
    }
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("不能添加不同货币的金额");
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("不能减去不同货币的金额");
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toString(): string {
    return `${this.amount} ${this.currency}`;
  }

  /**
   * 序列化为数据库存储格式
   */
  toDbFormat(): { amount: number; currency: string } {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }

  /**
   * 从数据库格式反序列化
   */
  static fromDbFormat(data: { amount: number; currency: string }): Money {
    return new Money(data.amount, data.currency);
  }
}

/**
 * 地址值对象
 */
class Address {
  constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly state: string,
    public readonly postalCode: string,
    public readonly country: string = "US"
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.street?.trim()) throw new Error("街道地址不能为空");
    if (!this.city?.trim()) throw new Error("城市不能为空");
    if (!this.state?.trim()) throw new Error("州/省不能为空");
    if (!this.postalCode?.trim()) throw new Error("邮政编码不能为空");
    if (!this.country?.trim()) throw new Error("国家不能为空");
  }

  getFullAddress(): string {
    return `${this.street}, ${this.city}, ${this.state} ${this.postalCode}, ${this.country}`;
  }

  equals(other: Address): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.state === other.state &&
      this.postalCode === other.postalCode &&
      this.country === other.country
    );
  }

  /**
   * 序列化为数据库存储格式
   */
  toDbFormat(): {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  } {
    return {
      street: this.street,
      city: this.city,
      state: this.state,
      postal_code: this.postalCode,
      country: this.country,
    };
  }

  /**
   * 从数据库格式反序列化
   */
  static fromDbFormat(data: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  }): Address {
    return new Address(
      data.street,
      data.city,
      data.state,
      data.postal_code,
      data.country
    );
  }
}

/**
 * 日期范围值对象
 */
class DateRange {
  constructor(public readonly startDate: Date, public readonly endDate: Date) {
    if (startDate >= endDate) {
      throw new Error("开始日期必须早于结束日期");
    }
  }

  contains(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  overlaps(other: DateRange): boolean {
    return this.startDate < other.endDate && this.endDate > other.startDate;
  }

  getDurationInDays(): number {
    const diffTime = Math.abs(
      this.endDate.getTime() - this.startDate.getTime()
    );
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  equals(other: DateRange): boolean {
    return (
      this.startDate.getTime() === other.startDate.getTime() &&
      this.endDate.getTime() === other.endDate.getTime()
    );
  }

  toDbFormat(): { start_date: Date; end_date: Date } {
    return {
      start_date: this.startDate,
      end_date: this.endDate,
    };
  }

  static fromDbFormat(data: { start_date: Date; end_date: Date }): DateRange {
    return new DateRange(data.start_date, data.end_date);
  }
}

// ============================================================================
// 领域模型类
// ============================================================================

/**
 * 客户实体
 */
class Customer extends DomainObject {
  constructor(
    id: string,
    public name: string,
    public email: string,
    public address: Address,
    public creditLimit: Money,
    version: number = 0,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, version, createdAt, updatedAt);
  }

  canAfford(amount: Money): boolean {
    return (
      this.creditLimit.amount >= amount.amount &&
      this.creditLimit.currency === amount.currency
    );
  }
}

/**
 * 产品实体
 */
class Product extends DomainObject {
  constructor(
    id: string,
    public name: string,
    public description: string,
    public price: Money,
    public category: ProductCategory | null = null,
    version: number = 0,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, version, createdAt, updatedAt);
  }
}

/**
 * 产品分类实体
 */
class ProductCategory extends DomainObject {
  constructor(
    id: string,
    public name: string,
    public description: string,
    public parentCategory: ProductCategory | null = null,
    version: number = 0,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, version, createdAt, updatedAt);
  }
}

/**
 * 订单实体
 */
class Order extends DomainObject {
  private _items: OrderItem[] = [];

  constructor(
    id: string,
    public customer: Customer,
    public orderDate: Date,
    public deliveryPeriod: DateRange,
    public shippingAddress: Address,
    version: number = 0,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, version, createdAt, updatedAt);
  }

  get items(): readonly OrderItem[] {
    return this._items;
  }

  addItem(product: Product, quantity: number, unitPrice: Money): void {
    const item = new OrderItem(
      `${this.id}-item-${this._items.length + 1}`,
      this,
      product,
      quantity,
      unitPrice
    );
    this._items.push(item);
  }

  removeItem(itemId: string): void {
    this._items = this._items.filter((item) => item.id !== itemId);
  }

  getTotalAmount(): Money {
    if (this._items.length === 0) {
      return new Money(0);
    }

    return this._items.reduce(
      (total, item) => total.add(item.getSubtotal()),
      new Money(0, this._items[0].unitPrice.currency)
    );
  }

  getItemCount(): number {
    return this._items.length;
  }
}

/**
 * 订单项实体
 */
class OrderItem extends DomainObject {
  constructor(
    id: string,
    public order: Order,
    public product: Product,
    public quantity: number,
    public unitPrice: Money,
    version: number = 0,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, version, createdAt, updatedAt);

    if (quantity <= 0) {
      throw new Error("数量必须大于0");
    }
  }

  getSubtotal(): Money {
    return this.unitPrice.multiply(this.quantity);
  }
}

/**
 * 标签实体 (用于多对多关系演示)
 */
class Tag extends DomainObject {
  constructor(
    id: string,
    public name: string,
    public color: string,
    version: number = 0,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    super(id, version, createdAt, updatedAt);
  }
}

// ============================================================================
// 1. Foreign Key Mapping - 外键映射
// ============================================================================

/**
 * 外键映射器
 *
 * 处理对象之间的单向和双向关联关系，通过外键维护引用完整性
 *
 * 特点：
 * - 一对一关系：子表包含父表主键作为外键
 * - 一对多关系：多方包含一方的外键
 * - 支持延迟加载和即时加载
 */
class ForeignKeyMapper {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * 保存客户（包含嵌入的地址和金额）
   */
  async saveCustomer(customer: Customer): Promise<void> {
    const addressData = customer.address.toDbFormat();
    const creditData = customer.creditLimit.toDbFormat();

    await this.db.query(
      `
      INSERT INTO customers (
        id, name, email, version, created_at, updated_at,
        address_street, address_city, address_state, address_postal_code, address_country,
        credit_limit_amount, credit_limit_currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        email = VALUES(email),
        version = VALUES(version),
        updated_at = VALUES(updated_at),
        address_street = VALUES(address_street),
        address_city = VALUES(address_city),
        address_state = VALUES(address_state),
        address_postal_code = VALUES(address_postal_code),
        address_country = VALUES(address_country),
        credit_limit_amount = VALUES(credit_limit_amount),
        credit_limit_currency = VALUES(credit_limit_currency)
    `,
      [
        customer.id,
        customer.name,
        customer.email,
        customer.version,
        customer.createdAt,
        customer.updatedAt,
        addressData.street,
        addressData.city,
        addressData.state,
        addressData.postal_code,
        addressData.country,
        creditData.amount,
        creditData.currency,
      ]
    );
  }

  /**
   * 查找客户
   */
  async findCustomer(id: string): Promise<Customer | null> {
    const result = await this.db.query("SELECT * FROM customers WHERE id = ?", [
      id,
    ]);

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    const address = Address.fromDbFormat({
      street: row.address_street,
      city: row.address_city,
      state: row.address_state,
      postal_code: row.address_postal_code,
      country: row.address_country,
    });

    const creditLimit = Money.fromDbFormat({
      amount: row.credit_limit_amount,
      currency: row.credit_limit_currency,
    });

    return new Customer(
      row.id,
      row.name,
      row.email,
      address,
      creditLimit,
      row.version,
      row.created_at,
      row.updated_at
    );
  }

  /**
   * 保存产品分类（支持父子关系的外键映射）
   */
  async saveProductCategory(category: ProductCategory): Promise<void> {
    await this.db.query(
      `
      INSERT INTO product_categories (
        id, name, description, parent_category_id, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        parent_category_id = VALUES(parent_category_id),
        version = VALUES(version),
        updated_at = VALUES(updated_at)
    `,
      [
        category.id,
        category.name,
        category.description,
        category.parentCategory?.id || null,
        category.version,
        category.createdAt,
        category.updatedAt,
      ]
    );
  }

  /**
   * 查找产品分类（延迟加载父分类）
   */
  async findProductCategory(
    id: string,
    loadParent: boolean = false
  ): Promise<ProductCategory | null> {
    const result = await this.db.query(
      "SELECT * FROM product_categories WHERE id = ?",
      [id]
    );

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    const category = new ProductCategory(
      row.id,
      row.name,
      row.description,
      null,
      row.version,
      row.created_at,
      row.updated_at
    );

    // 延迟加载父分类
    if (loadParent && row.parent_category_id) {
      category.parentCategory = await this.findProductCategory(
        row.parent_category_id,
        false
      );
    }

    return category;
  }

  /**
   * 保存产品（外键引用分类）
   */
  async saveProduct(product: Product): Promise<void> {
    const priceData = product.price.toDbFormat();

    await this.db.query(
      `
      INSERT INTO products (
        id, name, description, category_id, version, created_at, updated_at,
        price_amount, price_currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        category_id = VALUES(category_id),
        version = VALUES(version),
        updated_at = VALUES(updated_at),
        price_amount = VALUES(price_amount),
        price_currency = VALUES(price_currency)
    `,
      [
        product.id,
        product.name,
        product.description,
        product.category?.id || null,
        product.version,
        product.createdAt,
        product.updatedAt,
        priceData.amount,
        priceData.currency,
      ]
    );
  }

  /**
   * 查找产品（即时加载分类）
   */
  async findProduct(
    id: string,
    loadCategory: boolean = true
  ): Promise<Product | null> {
    let query = "SELECT * FROM products WHERE id = ?";
    let params = [id];

    if (loadCategory) {
      query = `
        SELECT p.*, 
               c.id as category_id, c.name as category_name, 
               c.description as category_description,
               c.parent_category_id, c.version as category_version,
               c.created_at as category_created_at, c.updated_at as category_updated_at
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.id = ?
      `;
    }

    const result = await this.db.query(query, params);

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    const price = Money.fromDbFormat({
      amount: row.price_amount,
      currency: row.price_currency,
    });

    let category: ProductCategory | null = null;
    if (loadCategory && row.category_id) {
      category = new ProductCategory(
        row.category_id,
        row.category_name,
        row.category_description,
        null,
        row.category_version,
        row.category_created_at,
        row.category_updated_at
      );
    }

    return new Product(
      row.id,
      row.name,
      row.description,
      price,
      category,
      row.version,
      row.created_at,
      row.updated_at
    );
  }

  /**
   * 根据分类查找产品
   */
  async findProductsByCategory(categoryId: string): Promise<Product[]> {
    const result = await this.db.query(
      "SELECT * FROM products WHERE category_id = ?",
      [categoryId]
    );

    return Promise.all(
      result.map(async (row: any) => {
        const price = Money.fromDbFormat({
          amount: row.price_amount,
          currency: row.price_currency,
        });

        return new Product(
          row.id,
          row.name,
          row.description,
          price,
          null,
          row.version,
          row.created_at,
          row.updated_at
        );
      })
    );
  }
}

// ============================================================================
// 2. Association Table Mapping - 关联表映射
// ============================================================================

/**
 * 关联表映射器
 *
 * 处理多对多关系，通过中间关联表维护对象之间的关系
 *
 * 特点：
 * - 支持多对多关系
 * - 关联表可以包含额外的属性
 * - 支持关联的创建、删除和查询
 */
class AssociationTableMapper {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * 保存标签
   */
  async saveTag(tag: Tag): Promise<void> {
    await this.db.query(
      `
      INSERT INTO tags (id, name, color, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        color = VALUES(color),
        version = VALUES(version),
        updated_at = VALUES(updated_at)
    `,
      [tag.id, tag.name, tag.color, tag.version, tag.createdAt, tag.updatedAt]
    );
  }

  /**
   * 查找标签
   */
  async findTag(id: string): Promise<Tag | null> {
    const result = await this.db.query("SELECT * FROM tags WHERE id = ?", [id]);

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    return new Tag(
      row.id,
      row.name,
      row.color,
      row.version,
      row.created_at,
      row.updated_at
    );
  }

  /**
   * 为产品添加标签
   */
  async addProductTag(
    productId: string,
    tagId: string,
    addedBy: string,
    notes?: string
  ): Promise<void> {
    await this.db.query(
      `
      INSERT INTO product_tags (product_id, tag_id, added_by, notes, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        added_by = VALUES(added_by),
        notes = VALUES(notes),
        created_at = VALUES(created_at)
    `,
      [productId, tagId, addedBy, notes || null, new Date()]
    );
  }

  /**
   * 移除产品标签
   */
  async removeProductTag(productId: string, tagId: string): Promise<void> {
    await this.db.query(
      "DELETE FROM product_tags WHERE product_id = ? AND tag_id = ?",
      [productId, tagId]
    );
  }

  /**
   * 获取产品的所有标签
   */
  async getProductTags(
    productId: string
  ): Promise<
    { tag: Tag; addedBy: string; notes: string | null; createdAt: Date }[]
  > {
    const result = await this.db.query(
      `
      SELECT t.*, pt.added_by, pt.notes, pt.created_at as association_created_at
      FROM tags t
      INNER JOIN product_tags pt ON t.id = pt.tag_id
      WHERE pt.product_id = ?
      ORDER BY pt.created_at DESC
    `,
      [productId]
    );

    return result.map((row: any) => ({
      tag: new Tag(
        row.id,
        row.name,
        row.color,
        row.version,
        row.created_at,
        row.updated_at
      ),
      addedBy: row.added_by,
      notes: row.notes,
      createdAt: row.association_created_at,
    }));
  }

  /**
   * 获取使用某标签的所有产品
   */
  async getProductsByTag(
    tagId: string
  ): Promise<{ productId: string; addedBy: string; notes: string | null }[]> {
    const result = await this.db.query(
      `
      SELECT product_id, added_by, notes
      FROM product_tags
      WHERE tag_id = ?
      ORDER BY created_at DESC
    `,
      [tagId]
    );

    return result.map((row: any) => ({
      productId: row.product_id,
      addedBy: row.added_by,
      notes: row.notes,
    }));
  }

  /**
   * 批量为产品设置标签
   */
  async setProductTags(
    productId: string,
    tagIds: string[],
    addedBy: string
  ): Promise<void> {
    // 开始事务
    await this.db.query("START TRANSACTION");

    try {
      // 删除现有标签
      await this.db.query("DELETE FROM product_tags WHERE product_id = ?", [
        productId,
      ]);

      // 添加新标签
      for (const tagId of tagIds) {
        await this.addProductTag(productId, tagId, addedBy);
      }

      await this.db.query("COMMIT");
    } catch (error) {
      await this.db.query("ROLLBACK");
      throw error;
    }
  }

  /**
   * 查找相似标签的产品（基于共同标签）
   */
  async findSimilarProducts(
    productId: string,
    limit: number = 5
  ): Promise<string[]> {
    const result = await this.db.query(
      `
      SELECT DISTINCT p2.product_id, COUNT(*) as common_tags
      FROM product_tags p1
      INNER JOIN product_tags p2 ON p1.tag_id = p2.tag_id
      WHERE p1.product_id = ? AND p2.product_id != ?
      GROUP BY p2.product_id
      ORDER BY common_tags DESC, p2.product_id
      LIMIT ?
    `,
      [productId, productId, limit]
    );

    return result.map((row: any) => row.product_id);
  }
}

// ============================================================================
// 3. Embedded Value Mapping - 嵌入值映射
// ============================================================================

/**
 * 嵌入值映射器
 *
 * 将值对象映射到拥有对象的表中的列，而不是单独的表
 *
 * 特点：
 * - 值对象没有独立的标识
 * - 值对象的生命周期依赖于拥有对象
 * - 提供值对象的序列化和反序列化
 */
class EmbeddedValueMapper {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * 保存订单（包含嵌入的地址和日期范围）
   */
  async saveOrder(order: Order): Promise<void> {
    const deliveryData = order.deliveryPeriod.toDbFormat();
    const shippingData = order.shippingAddress.toDbFormat();

    await this.db.query(
      `
      INSERT INTO orders (
        id, customer_id, order_date, version, created_at, updated_at,
        delivery_start_date, delivery_end_date,
        shipping_street, shipping_city, shipping_state, 
        shipping_postal_code, shipping_country
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        customer_id = VALUES(customer_id),
        order_date = VALUES(order_date),
        version = VALUES(version),
        updated_at = VALUES(updated_at),
        delivery_start_date = VALUES(delivery_start_date),
        delivery_end_date = VALUES(delivery_end_date),
        shipping_street = VALUES(shipping_street),
        shipping_city = VALUES(shipping_city),
        shipping_state = VALUES(shipping_state),
        shipping_postal_code = VALUES(shipping_postal_code),
        shipping_country = VALUES(shipping_country)
    `,
      [
        order.id,
        order.customer.id,
        order.orderDate,
        order.version,
        order.createdAt,
        order.updatedAt,
        deliveryData.start_date,
        deliveryData.end_date,
        shippingData.street,
        shippingData.city,
        shippingData.state,
        shippingData.postal_code,
        shippingData.country,
      ]
    );

    // 保存订单项
    for (const item of order.items) {
      await this.saveOrderItem(item);
    }
  }

  /**
   * 保存订单项（包含嵌入的金额）
   */
  async saveOrderItem(item: OrderItem): Promise<void> {
    const priceData = item.unitPrice.toDbFormat();

    await this.db.query(
      `
      INSERT INTO order_items (
        id, order_id, product_id, quantity, version, created_at, updated_at,
        unit_price_amount, unit_price_currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        product_id = VALUES(product_id),
        quantity = VALUES(quantity),
        version = VALUES(version),
        updated_at = VALUES(updated_at),
        unit_price_amount = VALUES(unit_price_amount),
        unit_price_currency = VALUES(unit_price_currency)
    `,
      [
        item.id,
        item.order.id,
        item.product.id,
        item.quantity,
        item.version,
        item.createdAt,
        item.updatedAt,
        priceData.amount,
        priceData.currency,
      ]
    );
  }

  /**
   * 查找订单（包含所有嵌入值和关联对象）
   */
  async findOrder(id: string): Promise<Order | null> {
    // 查询订单基本信息
    const orderResult = await this.db.query(
      `
      SELECT o.*, c.name as customer_name, c.email as customer_email,
             c.address_street as customer_street, c.address_city as customer_city,
             c.address_state as customer_state, c.address_postal_code as customer_postal_code,
             c.address_country as customer_country,
             c.credit_limit_amount, c.credit_limit_currency
      FROM orders o
      INNER JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `,
      [id]
    );

    if (!orderResult || orderResult.length === 0) {
      return null;
    }

    const orderRow = orderResult[0];

    // 重建嵌入的值对象
    const deliveryPeriod = DateRange.fromDbFormat({
      start_date: orderRow.delivery_start_date,
      end_date: orderRow.delivery_end_date,
    });

    const shippingAddress = Address.fromDbFormat({
      street: orderRow.shipping_street,
      city: orderRow.shipping_city,
      state: orderRow.shipping_state,
      postal_code: orderRow.shipping_postal_code,
      country: orderRow.shipping_country,
    });

    const customerAddress = Address.fromDbFormat({
      street: orderRow.customer_street,
      city: orderRow.customer_city,
      state: orderRow.customer_state,
      postal_code: orderRow.customer_postal_code,
      country: orderRow.customer_country,
    });

    const creditLimit = Money.fromDbFormat({
      amount: orderRow.credit_limit_amount,
      currency: orderRow.credit_limit_currency,
    });

    const customer = new Customer(
      orderRow.customer_id,
      orderRow.customer_name,
      orderRow.customer_email,
      customerAddress,
      creditLimit
    );

    const order = new Order(
      orderRow.id,
      customer,
      orderRow.order_date,
      deliveryPeriod,
      shippingAddress,
      orderRow.version,
      orderRow.created_at,
      orderRow.updated_at
    );

    // 查询并加载订单项
    const itemsResult = await this.db.query(
      `
      SELECT oi.*, p.name as product_name, p.description as product_description,
             p.price_amount as product_price_amount, p.price_currency as product_price_currency
      FROM order_items oi
      INNER JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.created_at
    `,
      [id]
    );

    for (const itemRow of itemsResult) {
      const productPrice = Money.fromDbFormat({
        amount: itemRow.product_price_amount,
        currency: itemRow.product_price_currency,
      });

      const product = new Product(
        itemRow.product_id,
        itemRow.product_name,
        itemRow.product_description,
        productPrice,
        null,
        itemRow.version,
        itemRow.created_at,
        itemRow.updated_at
      );

      const unitPrice = Money.fromDbFormat({
        amount: itemRow.unit_price_amount,
        currency: itemRow.unit_price_currency,
      });

      // 直接创建订单项并添加到内部数组（避免重复验证）
      const item = new OrderItem(
        itemRow.id,
        order,
        product,
        itemRow.quantity,
        unitPrice,
        itemRow.version,
        itemRow.created_at,
        itemRow.updated_at
      );

      (order as any)._items.push(item);
    }

    return order;
  }

  /**
   * 查找客户的订单（按日期范围过滤）
   */
  async findOrdersByCustomerAndDateRange(
    customerId: string,
    dateRange: DateRange
  ): Promise<Order[]> {
    const result = await this.db.query(
      `
      SELECT id FROM orders 
      WHERE customer_id = ? 
        AND order_date >= ? 
        AND order_date <= ?
      ORDER BY order_date DESC
    `,
      [customerId, dateRange.startDate, dateRange.endDate]
    );

    const orders: Order[] = [];
    for (const row of result) {
      const order = await this.findOrder(row.id);
      if (order) {
        orders.push(order);
      }
    }

    return orders;
  }

  /**
   * 计算订单统计信息（使用嵌入值）
   */
  async getOrderStatistics(orderId: string): Promise<{
    itemCount: number;
    totalAmount: Money;
    averageItemPrice: Money;
    deliveryDays: number;
  } | null> {
    const order = await this.findOrder(orderId);
    if (!order) {
      return null;
    }

    const itemCount = order.getItemCount();
    const totalAmount = order.getTotalAmount();

    let averageItemPrice = new Money(0);
    if (itemCount > 0) {
      averageItemPrice = totalAmount.multiply(1 / itemCount);
    }

    const deliveryDays = order.deliveryPeriod.getDurationInDays();

    return {
      itemCount,
      totalAmount,
      averageItemPrice,
      deliveryDays,
    };
  }
}

// ============================================================================
// 统一的ORM映射器
// ============================================================================

/**
 * 对象关系映射器工厂
 */
class ORMappingFactory {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  createForeignKeyMapper(): ForeignKeyMapper {
    return new ForeignKeyMapper(this.db);
  }

  createAssociationTableMapper(): AssociationTableMapper {
    return new AssociationTableMapper(this.db);
  }

  createEmbeddedValueMapper(): EmbeddedValueMapper {
    return new EmbeddedValueMapper(this.db);
  }
}

// ============================================================================
// 使用示例和测试
// ============================================================================

/**
 * 对象关系映射模式使用示例
 */
export class ORMappingDemo {
  private factory: ORMappingFactory;

  constructor(db: DatabaseConnection) {
    this.factory = new ORMappingFactory(db);
  }

  /**
   * 演示外键映射
   */
  async demonstrateForeignKeyMapping(): Promise<void> {
    console.log("\n=== 外键映射模式演示 ===");

    const mapper = this.factory.createForeignKeyMapper();

    // 创建产品分类层次结构
    const electronics = new ProductCategory(
      "cat-electronics",
      "电子产品",
      "各种电子设备和配件"
    );

    const computers = new ProductCategory(
      "cat-computers",
      "计算机",
      "台式机、笔记本等",
      electronics
    );

    const laptops = new ProductCategory(
      "cat-laptops",
      "笔记本电脑",
      "便携式计算机",
      computers
    );

    // 保存分类（外键关系）
    await mapper.saveProductCategory(electronics);
    await mapper.saveProductCategory(computers);
    await mapper.saveProductCategory(laptops);

    console.log("已保存产品分类层次结构");

    // 创建产品并关联分类
    const laptop = new Product(
      "prod-laptop-1",
      "MacBook Pro",
      "专业级笔记本电脑",
      new Money(2499, "USD"),
      laptops
    );

    await mapper.saveProduct(laptop);
    console.log("已保存产品，关联到分类");

    // 查询产品及其分类
    const retrievedProduct = await mapper.findProduct("prod-laptop-1", true);
    if (retrievedProduct && retrievedProduct.category) {
      console.log(`产品: ${retrievedProduct.name}`);
      console.log(`分类: ${retrievedProduct.category.name}`);
      console.log(`价格: ${retrievedProduct.price.toString()}`);
    }

    // 查询分类下的所有产品
    const categoryProducts = await mapper.findProductsByCategory("cat-laptops");
    console.log(`笔记本分类下有 ${categoryProducts.length} 个产品`);
  }

  /**
   * 演示关联表映射
   */
  async demonstrateAssociationTableMapping(): Promise<void> {
    console.log("\n=== 关联表映射模式演示 ===");

    const mapper = this.factory.createAssociationTableMapper();

    // 创建标签
    const tags = [
      new Tag("tag-premium", "高端", "#FFD700"),
      new Tag("tag-portable", "便携", "#00FF00"),
      new Tag("tag-professional", "专业", "#0000FF"),
      new Tag("tag-gaming", "游戏", "#FF0000"),
    ];

    for (const tag of tags) {
      await mapper.saveTag(tag);
    }
    console.log("已保存标签");

    // 为产品添加标签（多对多关系）
    await mapper.addProductTag(
      "prod-laptop-1",
      "tag-premium",
      "system",
      "高端产品"
    );
    await mapper.addProductTag(
      "prod-laptop-1",
      "tag-portable",
      "system",
      "便于携带"
    );
    await mapper.addProductTag(
      "prod-laptop-1",
      "tag-professional",
      "admin",
      "专业用途"
    );

    console.log("已为产品添加标签");

    // 查询产品的标签
    const productTags = await mapper.getProductTags("prod-laptop-1");
    console.log(`产品标签:`);
    productTags.forEach((pt) => {
      console.log(`- ${pt.tag.name} (${pt.tag.color}) - 添加者: ${pt.addedBy}`);
      if (pt.notes) {
        console.log(`  备注: ${pt.notes}`);
      }
    });

    // 批量设置标签
    await mapper.setProductTags(
      "prod-laptop-1",
      ["tag-premium", "tag-gaming"],
      "admin"
    );
    console.log("已批量更新产品标签");

    // 查找使用特定标签的产品
    const premiumProducts = await mapper.getProductsByTag("tag-premium");
    console.log(`使用"高端"标签的产品数量: ${premiumProducts.length}`);
  }

  /**
   * 演示嵌入值映射
   */
  async demonstrateEmbeddedValueMapping(): Promise<void> {
    console.log("\n=== 嵌入值映射模式演示 ===");

    const mapper = this.factory.createEmbeddedValueMapper();

    // 创建客户（包含嵌入的地址和金额值对象）
    const customerAddress = new Address(
      "123 Main St",
      "Seattle",
      "WA",
      "98101",
      "US"
    );
    const creditLimit = new Money(10000, "USD");

    const customer = new Customer(
      "cust-1",
      "John Doe",
      "john@example.com",
      customerAddress,
      creditLimit
    );

    // 使用外键映射器保存客户
    const fkMapper = this.factory.createForeignKeyMapper();
    await fkMapper.saveCustomer(customer);
    console.log("已保存客户（包含嵌入值对象）");

    // 创建订单（包含嵌入的日期范围和地址）
    const deliveryPeriod = new DateRange(
      new Date("2024-02-01"),
      new Date("2024-02-05")
    );

    const shippingAddress = new Address(
      "456 Oak Ave",
      "Portland",
      "OR",
      "97201",
      "US"
    );

    const order = new Order(
      "order-1",
      customer,
      new Date(),
      deliveryPeriod,
      shippingAddress
    );

    // 添加订单项
    const product = new Product(
      "prod-mouse-1",
      "无线鼠标",
      "人体工学无线鼠标",
      new Money(29.99, "USD")
    );

    order.addItem(product, 2, new Money(25.99, "USD")); // 折扣价

    await mapper.saveOrder(order);
    console.log("已保存订单（包含嵌入的值对象）");

    // 查询订单和统计信息
    const retrievedOrder = await mapper.findOrder("order-1");
    if (retrievedOrder) {
      console.log(`订单客户: ${retrievedOrder.customer.name}`);
      console.log(
        `发货地址: ${retrievedOrder.shippingAddress.getFullAddress()}`
      );
      console.log(
        `交付期间: ${retrievedOrder.deliveryPeriod.getDurationInDays()} 天`
      );
      console.log(`订单总额: ${retrievedOrder.getTotalAmount().toString()}`);
    }

    // 获取订单统计
    const stats = await mapper.getOrderStatistics("order-1");
    if (stats) {
      console.log(`订单统计:`);
      console.log(`- 商品数量: ${stats.itemCount}`);
      console.log(`- 总金额: ${stats.totalAmount.toString()}`);
      console.log(`- 平均单价: ${stats.averageItemPrice.toString()}`);
      console.log(`- 交付天数: ${stats.deliveryDays}`);
    }

    // 按日期范围查询订单
    const searchRange = new DateRange(
      new Date("2024-01-01"),
      new Date("2024-12-31")
    );

    const customerOrders = await mapper.findOrdersByCustomerAndDateRange(
      "cust-1",
      searchRange
    );
    console.log(`客户在指定期间的订单数量: ${customerOrders.length}`);
  }

  /**
   * 演示复合使用场景
   */
  async demonstrateComplexScenario(): Promise<void> {
    console.log("\n=== 复合映射场景演示 ===");

    const fkMapper = this.factory.createForeignKeyMapper();
    const assocMapper = this.factory.createAssociationTableMapper();
    const embeddedMapper = this.factory.createEmbeddedValueMapper();

    // 场景：创建一个完整的电商订单流程

    // 1. 创建产品分类和产品
    const gaming = new ProductCategory(
      "cat-gaming",
      "游戏设备",
      "游戏相关硬件设备"
    );
    await fkMapper.saveProductCategory(gaming);

    const gamepad = new Product(
      "prod-gamepad-1",
      "无线手柄",
      "专业游戏手柄",
      new Money(59.99, "USD"),
      gaming
    );
    await fkMapper.saveProduct(gamepad);

    // 2. 为产品添加标签
    await assocMapper.addProductTag("prod-gamepad-1", "tag-gaming", "system");
    await assocMapper.addProductTag("prod-gamepad-1", "tag-premium", "system");

    // 3. 创建客户和订单
    const address = new Address("789 Gaming St", "Austin", "TX", "73301", "US");
    const customer = new Customer(
      "cust-gamer",
      "Alex Gamer",
      "alex@gamer.com",
      address,
      new Money(5000, "USD")
    );
    await fkMapper.saveCustomer(customer);

    const deliveryRange = new DateRange(
      new Date("2024-02-10"),
      new Date("2024-02-15")
    );

    const order = new Order(
      "order-gaming",
      customer,
      new Date(),
      deliveryRange,
      address
    );
    order.addItem(gamepad, 1, new Money(54.99, "USD")); // 促销价

    await embeddedMapper.saveOrder(order);

    console.log("已完成复合场景：产品分类 -> 产品 -> 标签 -> 客户 -> 订单");
    console.log("演示了外键映射、关联表映射和嵌入值映射的协同使用");

    // 验证数据完整性
    const finalOrder = await embeddedMapper.findOrder("order-gaming");
    const productTags = await assocMapper.getProductTags("prod-gamepad-1");

    console.log(`\n最终验证:`);
    if (finalOrder) {
      console.log(`- 订单总额: ${finalOrder.getTotalAmount().toString()}`);
      console.log(`- 产品分类: ${finalOrder.items[0].product.category?.name}`);
    }
    console.log(`- 产品标签数: ${productTags.length}`);
  }
}

// 导出主要类和接口
export {
  Money,
  Address,
  DateRange,
  Customer,
  Product,
  ProductCategory,
  Order,
  OrderItem,
  Tag,
  ForeignKeyMapper,
  AssociationTableMapper,
  EmbeddedValueMapper,
  ORMappingFactory,
};
