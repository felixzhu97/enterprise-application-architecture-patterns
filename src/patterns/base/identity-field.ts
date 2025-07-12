/**
 * Identity Field（标识字段）模式
 *
 * 在对象中保存一个数据库ID字段，用于维护内存对象和数据库行之间的标识关系。
 * 这个模式确保了对象的唯一性，并提供了对象到数据库记录的映射。
 *
 * 主要特点：
 * - 维护对象标识
 * - 支持对象相等性比较
 * - 简化对象-关系映射
 * - 提供唯一性约束
 *
 * 优点：
 * - 简单直观
 * - 性能高效
 * - 易于实现
 * - 支持数据库主键
 *
 * 缺点：
 * - 依赖数据库ID
 * - 可能暴露技术细节
 * - 复合主键支持有限
 *
 * 适用场景：
 * - 对象-关系映射
 * - 需要唯一标识的对象
 * - 数据库驱动的应用
 * - 简单的ID管理
 */

/**
 * 标识字段异常
 */
export class IdentityFieldException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "IdentityFieldException";
  }
}

/**
 * ID生成器接口
 */
export interface IdGenerator<T> {
  /**
   * 生成新的ID
   */
  generateId(): T;

  /**
   * 验证ID是否有效
   */
  isValidId(id: T): boolean;

  /**
   * 获取生成器类型
   */
  getType(): string;
}

/**
 * 标识字段接口
 */
export interface IdentityField<T> {
  /**
   * 获取ID
   */
  getId(): T;

  /**
   * 设置ID
   */
  setId(id: T): void;

  /**
   * 检查是否有ID
   */
  hasId(): boolean;

  /**
   * 检查是否为新对象
   */
  isNew(): boolean;

  /**
   * 获取ID类型
   */
  getIdType(): string;

  /**
   * 对象相等性比较
   */
  equals(other: IdentityField<T>): boolean;

  /**
   * 获取哈希码
   */
  hashCode(): string;
}

/**
 * 长整型ID生成器
 */
export class LongIdGenerator implements IdGenerator<number> {
  private currentId: number = 0;

  generateId(): number {
    return ++this.currentId;
  }

  isValidId(id: number): boolean {
    return typeof id === "number" && id > 0 && Number.isInteger(id);
  }

  getType(): string {
    return "long";
  }

  setCurrentId(id: number): void {
    this.currentId = Math.max(this.currentId, id);
  }
}

/**
 * UUID生成器
 */
export class UuidGenerator implements IdGenerator<string> {
  generateId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  isValidId(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof id === "string" && uuidRegex.test(id);
  }

  getType(): string {
    return "uuid";
  }
}

/**
 * 组合ID生成器
 */
export class CompositeIdGenerator implements IdGenerator<string> {
  private prefix: string;
  private counter: number = 0;

  constructor(prefix: string = "ID") {
    this.prefix = prefix;
  }

  generateId(): string {
    const timestamp = Date.now().toString(36);
    const counter = (++this.counter).toString(36);
    return `${this.prefix}_${timestamp}_${counter}`;
  }

  isValidId(id: string): boolean {
    return typeof id === "string" && id.startsWith(this.prefix + "_");
  }

  getType(): string {
    return "composite";
  }
}

/**
 * 抽象标识字段基类
 */
export abstract class AbstractIdentityField<T> implements IdentityField<T> {
  protected id: T | null = null;
  protected idGenerator: IdGenerator<T> | null = null;

  constructor(idGenerator?: IdGenerator<T>) {
    this.idGenerator = idGenerator || null;
  }

  getId(): T {
    if (this.id === null) {
      throw new IdentityFieldException("ID is not set");
    }
    return this.id;
  }

  setId(id: T): void {
    if (this.idGenerator && !this.idGenerator.isValidId(id)) {
      throw new IdentityFieldException(`Invalid ID: ${id}`);
    }
    this.id = id;
  }

  hasId(): boolean {
    return this.id !== null;
  }

  isNew(): boolean {
    return this.id === null;
  }

  abstract getIdType(): string;

  equals(other: IdentityField<T>): boolean {
    if (!this.hasId() || !other.hasId()) {
      return false;
    }
    return this.getId() === other.getId();
  }

  hashCode(): string {
    if (!this.hasId()) {
      return "0";
    }
    return String(this.getId());
  }

  /**
   * 生成并设置新ID
   */
  generateNewId(): T {
    if (!this.idGenerator) {
      throw new IdentityFieldException("No ID generator available");
    }
    const newId = this.idGenerator.generateId();
    this.setId(newId);
    return newId;
  }

  /**
   * 获取ID的字符串表示
   */
  getIdString(): string {
    return this.hasId() ? String(this.getId()) : "";
  }
}

/**
 * 长整型标识字段
 */
export class LongIdentityField extends AbstractIdentityField<number> {
  constructor(idGenerator?: LongIdGenerator) {
    super(idGenerator || new LongIdGenerator());
  }

  getIdType(): string {
    return "long";
  }

  /**
   * 从字符串设置ID
   */
  setIdFromString(idString: string): void {
    const id = parseInt(idString, 10);
    if (isNaN(id)) {
      throw new IdentityFieldException(`Invalid ID string: ${idString}`);
    }
    this.setId(id);
  }

  /**
   * 获取下一个ID
   */
  getNextId(): number {
    if (!this.hasId()) {
      throw new IdentityFieldException("Current ID is not set");
    }
    return this.getId() + 1;
  }
}

/**
 * UUID标识字段
 */
export class UuidIdentityField extends AbstractIdentityField<string> {
  constructor(idGenerator?: UuidGenerator) {
    super(idGenerator || new UuidGenerator());
  }

  getIdType(): string {
    return "uuid";
  }

  /**
   * 获取ID的短格式
   */
  getShortId(): string {
    if (!this.hasId()) {
      return "";
    }
    return this.getId().substring(0, 8);
  }

  /**
   * 验证ID格式
   */
  validateIdFormat(): boolean {
    if (!this.hasId()) {
      return false;
    }
    return this.idGenerator?.isValidId(this.getId()) || false;
  }
}

/**
 * 组合标识字段
 */
export class CompositeIdentityField extends AbstractIdentityField<string> {
  private prefix: string;

  constructor(prefix: string = "ID", idGenerator?: CompositeIdGenerator) {
    super(idGenerator || new CompositeIdGenerator(prefix));
    this.prefix = prefix;
  }

  getIdType(): string {
    return "composite";
  }

  /**
   * 获取ID前缀
   */
  getPrefix(): string {
    return this.prefix;
  }

  /**
   * 解析ID组件
   */
  parseIdComponents(): {
    prefix: string;
    timestamp: string;
    counter: string;
  } | null {
    if (!this.hasId()) {
      return null;
    }

    const parts = this.getId().split("_");
    if (parts.length !== 3) {
      return null;
    }

    return {
      prefix: parts[0],
      timestamp: parts[1],
      counter: parts[2],
    };
  }

  /**
   * 获取生成时间戳
   */
  getGenerationTimestamp(): Date | null {
    const components = this.parseIdComponents();
    if (!components) {
      return null;
    }

    const timestamp = parseInt(components.timestamp, 36);
    return new Date(timestamp);
  }
}

/**
 * 带标识字段的领域对象基类
 */
export abstract class DomainObjectWithIdentity<T> {
  protected identityField: IdentityField<T>;
  protected version: number = 0;
  protected createdAt: Date = new Date();
  protected updatedAt: Date = new Date();

  constructor(identityField: IdentityField<T>) {
    this.identityField = identityField;
  }

  /**
   * 获取ID
   */
  getId(): T {
    return this.identityField.getId();
  }

  /**
   * 设置ID
   */
  setId(id: T): void {
    this.identityField.setId(id);
  }

  /**
   * 检查是否有ID
   */
  hasId(): boolean {
    return this.identityField.hasId();
  }

  /**
   * 检查是否为新对象
   */
  isNew(): boolean {
    return this.identityField.isNew();
  }

  /**
   * 获取标识字段
   */
  getIdentityField(): IdentityField<T> {
    return this.identityField;
  }

  /**
   * 对象相等性比较
   */
  equals(other: DomainObjectWithIdentity<T>): boolean {
    return this.identityField.equals(other.identityField);
  }

  /**
   * 获取哈希码
   */
  hashCode(): string {
    return this.identityField.hashCode();
  }

  /**
   * 获取版本号
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * 增加版本号
   */
  incrementVersion(): void {
    this.version++;
    this.updatedAt = new Date();
  }

  /**
   * 获取创建时间
   */
  getCreatedAt(): Date {
    return this.createdAt;
  }

  /**
   * 获取更新时间
   */
  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  /**
   * 标记为已更新
   */
  protected markUpdated(): void {
    this.updatedAt = new Date();
  }

  /**
   * 验证对象
   */
  abstract validate(): boolean;

  /**
   * 获取对象的字符串表示
   */
  toString(): string {
    return `${this.constructor.name}[id=${this.identityField.getIdString()}]`;
  }
}

/**
 * 用户实体（使用长整型ID）
 */
export class User extends DomainObjectWithIdentity<number> {
  private username: string;
  private email: string;
  private firstName: string;
  private lastName: string;
  private isActive: boolean = true;

  constructor(
    username: string,
    email: string,
    firstName: string,
    lastName: string,
    identityField?: LongIdentityField
  ) {
    super(identityField || new LongIdentityField());
    this.username = username;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
  }

  // Getters and setters
  getUsername(): string {
    return this.username;
  }

  setUsername(username: string): void {
    this.username = username;
    this.markUpdated();
  }

  getEmail(): string {
    return this.email;
  }

  setEmail(email: string): void {
    this.email = email;
    this.markUpdated();
  }

  getFirstName(): string {
    return this.firstName;
  }

  setFirstName(firstName: string): void {
    this.firstName = firstName;
    this.markUpdated();
  }

  getLastName(): string {
    return this.lastName;
  }

  setLastName(lastName: string): void {
    this.lastName = lastName;
    this.markUpdated();
  }

  isUserActive(): boolean {
    return this.isActive;
  }

  setActive(active: boolean): void {
    this.isActive = active;
    this.markUpdated();
  }

  // Business methods
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  validate(): boolean {
    return (
      this.username.length >= 3 &&
      this.email.includes("@") &&
      this.firstName.length > 0 &&
      this.lastName.length > 0
    );
  }

  /**
   * 创建新用户
   */
  static createNew(
    username: string,
    email: string,
    firstName: string,
    lastName: string
  ): User {
    const user = new User(username, email, firstName, lastName);
    user.getIdentityField().generateNewId();
    return user;
  }
}

/**
 * 产品实体（使用UUID）
 */
export class Product extends DomainObjectWithIdentity<string> {
  private name: string;
  private description: string;
  private price: number;
  private category: string;
  private stock: number;

  constructor(
    name: string,
    description: string,
    price: number,
    category: string,
    stock: number,
    identityField?: UuidIdentityField
  ) {
    super(identityField || new UuidIdentityField());
    this.name = name;
    this.description = description;
    this.price = price;
    this.category = category;
    this.stock = stock;
  }

  // Getters and setters
  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    this.name = name;
    this.markUpdated();
  }

  getDescription(): string {
    return this.description;
  }

  setDescription(description: string): void {
    this.description = description;
    this.markUpdated();
  }

  getPrice(): number {
    return this.price;
  }

  setPrice(price: number): void {
    if (price < 0) {
      throw new Error("Price cannot be negative");
    }
    this.price = price;
    this.markUpdated();
  }

  getCategory(): string {
    return this.category;
  }

  setCategory(category: string): void {
    this.category = category;
    this.markUpdated();
  }

  getStock(): number {
    return this.stock;
  }

  setStock(stock: number): void {
    if (stock < 0) {
      throw new Error("Stock cannot be negative");
    }
    this.stock = stock;
    this.markUpdated();
  }

  // Business methods
  isInStock(): boolean {
    return this.stock > 0;
  }

  reduceStock(quantity: number): void {
    if (quantity > this.stock) {
      throw new Error("Insufficient stock");
    }
    this.stock -= quantity;
    this.markUpdated();
  }

  increaseStock(quantity: number): void {
    this.stock += quantity;
    this.markUpdated();
  }

  validate(): boolean {
    return (
      this.name.length > 0 &&
      this.price >= 0 &&
      this.stock >= 0 &&
      this.category.length > 0
    );
  }

  /**
   * 创建新产品
   */
  static createNew(
    name: string,
    description: string,
    price: number,
    category: string,
    stock: number
  ): Product {
    const product = new Product(name, description, price, category, stock);
    product.getIdentityField().generateNewId();
    return product;
  }
}

/**
 * 订单实体（使用组合ID）
 */
export class Order extends DomainObjectWithIdentity<string> {
  private userId: number;
  private totalAmount: number;
  private status: string;
  private orderDate: Date;
  private items: OrderItem[] = [];

  constructor(
    userId: number,
    totalAmount: number,
    status: string = "pending",
    identityField?: CompositeIdentityField
  ) {
    super(identityField || new CompositeIdentityField("ORDER"));
    this.userId = userId;
    this.totalAmount = totalAmount;
    this.status = status;
    this.orderDate = new Date();
  }

  // Getters and setters
  getUserId(): number {
    return this.userId;
  }

  getTotalAmount(): number {
    return this.totalAmount;
  }

  setTotalAmount(amount: number): void {
    this.totalAmount = amount;
    this.markUpdated();
  }

  getStatus(): string {
    return this.status;
  }

  setStatus(status: string): void {
    this.status = status;
    this.markUpdated();
  }

  getOrderDate(): Date {
    return this.orderDate;
  }

  getItems(): OrderItem[] {
    return [...this.items];
  }

  // Business methods
  addItem(item: OrderItem): void {
    this.items.push(item);
    this.recalculateTotal();
  }

  removeItem(itemId: string): void {
    this.items = this.items.filter((item) => item.getId() !== itemId);
    this.recalculateTotal();
  }

  private recalculateTotal(): void {
    this.totalAmount = this.items.reduce(
      (sum, item) => sum + item.getSubtotal(),
      0
    );
    this.markUpdated();
  }

  getItemCount(): number {
    return this.items.reduce((sum, item) => sum + item.getQuantity(), 0);
  }

  validate(): boolean {
    return (
      this.userId > 0 &&
      this.totalAmount >= 0 &&
      this.status.length > 0 &&
      this.items.length > 0
    );
  }

  /**
   * 创建新订单
   */
  static createNew(userId: number): Order {
    const order = new Order(userId, 0);
    order.getIdentityField().generateNewId();
    return order;
  }
}

/**
 * 订单项实体（使用UUID）
 */
export class OrderItem extends DomainObjectWithIdentity<string> {
  private productId: string;
  private productName: string;
  private price: number;
  private quantity: number;
  private subtotal: number;

  constructor(
    productId: string,
    productName: string,
    price: number,
    quantity: number,
    identityField?: UuidIdentityField
  ) {
    super(identityField || new UuidIdentityField());
    this.productId = productId;
    this.productName = productName;
    this.price = price;
    this.quantity = quantity;
    this.subtotal = price * quantity;
  }

  // Getters and setters
  getProductId(): string {
    return this.productId;
  }

  getProductName(): string {
    return this.productName;
  }

  getPrice(): number {
    return this.price;
  }

  getQuantity(): number {
    return this.quantity;
  }

  setQuantity(quantity: number): void {
    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }
    this.quantity = quantity;
    this.subtotal = this.price * quantity;
    this.markUpdated();
  }

  getSubtotal(): number {
    return this.subtotal;
  }

  validate(): boolean {
    return (
      this.productId.length > 0 &&
      this.price >= 0 &&
      this.quantity > 0 &&
      this.subtotal >= 0
    );
  }

  /**
   * 创建新订单项
   */
  static createNew(
    productId: string,
    productName: string,
    price: number,
    quantity: number
  ): OrderItem {
    const orderItem = new OrderItem(productId, productName, price, quantity);
    orderItem.getIdentityField().generateNewId();
    return orderItem;
  }
}

/**
 * 标识字段工厂
 */
export class IdentityFieldFactory {
  private static longIdGenerator = new LongIdGenerator();
  private static uuidGenerator = new UuidGenerator();

  /**
   * 创建长整型标识字段
   */
  static createLongIdentityField(): LongIdentityField {
    return new LongIdentityField(this.longIdGenerator);
  }

  /**
   * 创建UUID标识字段
   */
  static createUuidIdentityField(): UuidIdentityField {
    return new UuidIdentityField(this.uuidGenerator);
  }

  /**
   * 创建组合标识字段
   */
  static createCompositeIdentityField(prefix: string): CompositeIdentityField {
    return new CompositeIdentityField(prefix);
  }

  /**
   * 设置长整型ID生成器的当前值
   */
  static setLongIdGeneratorCurrentId(id: number): void {
    this.longIdGenerator.setCurrentId(id);
  }
}

/**
 * Identity Field演示类
 */
export class IdentityFieldExample {
  /**
   * 演示Identity Field模式
   */
  public demonstrateIdentityField(): void {
    console.log("=== Identity Field 模式演示 ===");

    try {
      // 1. 长整型ID演示
      console.log("\n1. 长整型ID演示:");
      this.demonstrateLongId();

      // 2. UUID演示
      console.log("\n2. UUID演示:");
      this.demonstrateUuid();

      // 3. 组合ID演示
      console.log("\n3. 组合ID演示:");
      this.demonstrateCompositeId();

      // 4. 领域对象演示
      console.log("\n4. 领域对象演示:");
      this.demonstrateDomainObjects();

      // 5. 对象相等性演示
      console.log("\n5. 对象相等性演示:");
      this.demonstrateObjectEquality();

      this.printIdentityFieldGuidelines();
    } catch (error) {
      console.error("Identity Field演示失败:", error);
    }
  }

  private demonstrateLongId(): void {
    const longIdField = IdentityFieldFactory.createLongIdentityField();

    console.log("✓ 是否为新对象:", longIdField.isNew());

    // 生成ID
    const newId = longIdField.generateNewId();
    console.log("✓ 生成的ID:", newId);
    console.log("✓ 是否有ID:", longIdField.hasId());
    console.log("✓ 是否为新对象:", longIdField.isNew());

    // 设置ID
    const anotherField = new LongIdentityField();
    anotherField.setId(123);
    console.log("✓ 设置ID后:", anotherField.getId());

    // 验证ID
    try {
      anotherField.setId(-1);
    } catch (error) {
      console.log("✓ 无效ID验证:", (error as Error).message);
    }
  }

  private demonstrateUuid(): void {
    const uuidField = IdentityFieldFactory.createUuidIdentityField();

    // 生成UUID
    const uuid = uuidField.generateNewId();
    console.log("✓ 生成的UUID:", uuid);
    console.log("✓ 短ID:", uuidField.getShortId());
    console.log("✓ 格式验证:", uuidField.validateIdFormat());

    // 创建另一个UUID
    const anotherUuid = IdentityFieldFactory.createUuidIdentityField();
    anotherUuid.generateNewId();
    console.log("✓ 另一个UUID:", anotherUuid.getId());
    console.log("✓ UUID相等性:", uuidField.equals(anotherUuid));
  }

  private demonstrateCompositeId(): void {
    const compositeField =
      IdentityFieldFactory.createCompositeIdentityField("USER");

    // 生成组合ID
    const compositeId = compositeField.generateNewId();
    console.log("✓ 生成的组合ID:", compositeId);
    console.log("✓ ID前缀:", compositeField.getPrefix());

    // 解析ID组件
    const components = compositeField.parseIdComponents();
    console.log("✓ ID组件:", components);

    // 获取生成时间
    const timestamp = compositeField.getGenerationTimestamp();
    console.log("✓ 生成时间:", timestamp?.toISOString());
  }

  private demonstrateDomainObjects(): void {
    // 创建用户
    const user = User.createNew("john_doe", "john@example.com", "John", "Doe");
    console.log("✓ 创建用户:", user.toString());
    console.log("✓ 用户ID:", user.getId());
    console.log("✓ 用户全名:", user.getFullName());
    console.log("✓ 用户验证:", user.validate());

    // 创建产品
    const product = Product.createNew(
      "笔记本电脑",
      "高性能笔记本电脑",
      1299.99,
      "电子产品",
      10
    );
    console.log("✓ 创建产品:", product.toString());
    console.log("✓ 产品ID:", product.getId());
    console.log("✓ 产品是否有库存:", product.isInStock());

    // 创建订单
    const order = Order.createNew(user.getId());
    console.log("✓ 创建订单:", order.toString());
    console.log("✓ 订单ID:", order.getId());

    // 添加订单项
    const orderItem = OrderItem.createNew(
      product.getId(),
      product.getName(),
      product.getPrice(),
      1
    );
    order.addItem(orderItem);
    console.log("✓ 添加订单项:", orderItem.toString());
    console.log("✓ 订单总额:", order.getTotalAmount());
    console.log("✓ 订单验证:", order.validate());
  }

  private demonstrateObjectEquality(): void {
    // 创建相同ID的对象
    const user1 = new User("john", "john@example.com", "John", "Doe");
    user1.setId(1);

    const user2 = new User("jane", "jane@example.com", "Jane", "Smith");
    user2.setId(1);

    const user3 = new User("bob", "bob@example.com", "Bob", "Johnson");
    user3.setId(2);

    console.log("✓ 相同ID的对象相等:", user1.equals(user2));
    console.log("✓ 不同ID的对象不相等:", user1.equals(user3));
    console.log(
      "✓ 对象哈希码:",
      user1.hashCode(),
      user2.hashCode(),
      user3.hashCode()
    );

    // 新对象不相等
    const newUser1 = new User("new1", "new1@example.com", "New", "User");
    const newUser2 = new User("new2", "new2@example.com", "New", "User");
    console.log("✓ 新对象不相等:", newUser1.equals(newUser2));
  }

  private printIdentityFieldGuidelines(): void {
    console.log(`
Identity Field模式使用指南：

设计原则：
- 每个对象都有唯一标识
- 标识字段独立于业务属性
- 支持对象相等性比较
- 简化对象-关系映射

ID类型选择：
- 长整型：简单、高效、占用空间小
- UUID：全局唯一、分布式友好、无序列依赖
- 组合ID：可读性好、包含业务信息、支持分区

实现要点：
- 提供ID生成器
- 验证ID的有效性
- 支持相等性比较
- 处理新对象和已持久化对象的区别

适用场景：
- 对象-关系映射
- 需要唯一标识的领域对象
- 数据库主键映射
- 分布式系统中的对象标识

最佳实践：
- 使用工厂模式创建标识字段
- 在构造函数中设置标识字段
- 重写equals和hashCode方法
- 提供toString方法用于调试
- 考虑ID的生成策略和性能

与其他模式的关系：
- 与Active Record配合使用
- 与Data Mapper提供对象标识
- 与Repository模式管理对象生命周期
- 与Unit of Work跟踪对象状态

注意事项：
- 避免在业务逻辑中直接使用ID
- 考虑ID的可读性和调试友好性
- 处理好新对象和已持久化对象的区别
- 注意ID的唯一性和一致性
- 考虑性能和存储效率
    `);
  }
}
