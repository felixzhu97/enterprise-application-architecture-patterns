/**
 * Special Case（特殊情况）模式
 *
 * 为特殊情况提供特殊行为的子类。
 * 通过多态来处理特殊情况，避免客户端代码中的条件判断。
 *
 * 主要特点：
 * - 使用多态替代条件判断
 * - 为特殊情况提供默认行为
 * - 简化客户端代码
 * - 提高代码可读性
 *
 * 优点：
 * - 消除重复的null检查
 * - 提高代码可读性
 * - 符合开闭原则
 * - 减少客户端复杂度
 *
 * 缺点：
 * - 增加类的数量
 * - 可能隐藏业务逻辑
 * - 需要仔细设计接口
 *
 * 适用场景：
 * - 频繁的null检查
 * - 重复的特殊情况处理
 * - 默认行为需求
 * - 简化客户端代码
 */

/**
 * 用户接口
 */
export interface IUser {
  getId(): string;
  getName(): string;
  getEmail(): string;
  getRole(): string;
  isActive(): boolean;
  canAccess(resource: string): boolean;
  getPreferences(): UserPreferences;
  getLastLoginDate(): Date | null;
  getDisplayName(): string;
  toString(): string;
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  language: string;
  theme: string;
  timezone: string;
  notifications: boolean;
}

/**
 * 普通用户实现
 */
export class User implements IUser {
  constructor(
    private id: string,
    private name: string,
    private email: string,
    private role: string,
    private active: boolean = true,
    private preferences: UserPreferences = {
      language: "zh-CN",
      theme: "light",
      timezone: "Asia/Shanghai",
      notifications: true,
    },
    private lastLoginDate: Date | null = null
  ) {}

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getEmail(): string {
    return this.email;
  }

  getRole(): string {
    return this.role;
  }

  isActive(): boolean {
    return this.active;
  }

  canAccess(resource: string): boolean {
    if (!this.active) {
      return false;
    }

    // 基于角色的访问控制
    const rolePermissions: { [role: string]: string[] } = {
      admin: ["*"],
      manager: ["users", "products", "orders", "reports"],
      user: ["profile", "orders"],
      guest: ["public"],
    };

    const permissions = rolePermissions[this.role] || [];
    return permissions.includes("*") || permissions.includes(resource);
  }

  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  getLastLoginDate(): Date | null {
    return this.lastLoginDate;
  }

  getDisplayName(): string {
    return this.name;
  }

  toString(): string {
    return `User(${this.id}, ${this.name}, ${this.email})`;
  }
}

/**
 * 未知用户特殊情况 - Null Object Pattern的实现
 */
export class UnknownUser implements IUser {
  private static instance: UnknownUser;

  private constructor() {}

  static getInstance(): UnknownUser {
    if (!UnknownUser.instance) {
      UnknownUser.instance = new UnknownUser();
    }
    return UnknownUser.instance;
  }

  getId(): string {
    return "unknown";
  }

  getName(): string {
    return "未知用户";
  }

  getEmail(): string {
    return "unknown@example.com";
  }

  getRole(): string {
    return "guest";
  }

  isActive(): boolean {
    return false;
  }

  canAccess(resource: string): boolean {
    // 未知用户只能访问公共资源
    return resource === "public";
  }

  getPreferences(): UserPreferences {
    return {
      language: "zh-CN",
      theme: "light",
      timezone: "Asia/Shanghai",
      notifications: false,
    };
  }

  getLastLoginDate(): Date | null {
    return null;
  }

  getDisplayName(): string {
    return "访客";
  }

  toString(): string {
    return "UnknownUser(guest)";
  }
}

/**
 * 管理员用户特殊情况
 */
export class AdminUser extends User {
  constructor(id: string, name: string, email: string) {
    super(id, name, email, "admin", true, {
      language: "zh-CN",
      theme: "dark",
      timezone: "Asia/Shanghai",
      notifications: true,
    });
  }

  canAccess(resource: string): boolean {
    // 管理员可以访问所有资源
    return true;
  }

  getDisplayName(): string {
    return `${this.getName()} (管理员)`;
  }

  toString(): string {
    return `AdminUser(${this.getId()}, ${this.getName()})`;
  }
}

/**
 * 系统用户特殊情况
 */
export class SystemUser implements IUser {
  private static instance: SystemUser;

  private constructor() {}

  static getInstance(): SystemUser {
    if (!SystemUser.instance) {
      SystemUser.instance = new SystemUser();
    }
    return SystemUser.instance;
  }

  getId(): string {
    return "system";
  }

  getName(): string {
    return "系统";
  }

  getEmail(): string {
    return "system@localhost";
  }

  getRole(): string {
    return "system";
  }

  isActive(): boolean {
    return true;
  }

  canAccess(resource: string): boolean {
    // 系统用户可以访问所有资源
    return true;
  }

  getPreferences(): UserPreferences {
    return {
      language: "zh-CN",
      theme: "dark",
      timezone: "UTC",
      notifications: false,
    };
  }

  getLastLoginDate(): Date | null {
    return new Date(); // 系统用户始终在线
  }

  getDisplayName(): string {
    return "系统";
  }

  toString(): string {
    return "SystemUser";
  }
}

// ======================== 产品特殊情况 ========================

/**
 * 产品接口
 */
export interface IProduct {
  getId(): string;
  getName(): string;
  getPrice(): number;
  getCurrency(): string;
  getStock(): number;
  isAvailable(): boolean;
  canPurchase(quantity: number): boolean;
  getDescription(): string;
  getImageUrl(): string;
  getFormattedPrice(): string;
  toString(): string;
}

/**
 * 普通产品实现
 */
export class Product implements IProduct {
  constructor(
    private id: string,
    private name: string,
    private price: number,
    private currency: string = "CNY",
    private stock: number = 0,
    private description: string = "",
    private imageUrl: string = "/images/default-product.jpg"
  ) {}

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getPrice(): number {
    return this.price;
  }

  getCurrency(): string {
    return this.currency;
  }

  getStock(): number {
    return this.stock;
  }

  isAvailable(): boolean {
    return this.stock > 0;
  }

  canPurchase(quantity: number): boolean {
    return this.isAvailable() && this.stock >= quantity;
  }

  getDescription(): string {
    return this.description;
  }

  getImageUrl(): string {
    return this.imageUrl;
  }

  getFormattedPrice(): string {
    const symbols: { [currency: string]: string } = {
      CNY: "¥",
      USD: "$",
      EUR: "€",
    };
    return `${symbols[this.currency] || this.currency} ${this.price.toFixed(
      2
    )}`;
  }

  toString(): string {
    return `Product(${this.id}, ${this.name}, ${this.getFormattedPrice()})`;
  }
}

/**
 * 缺货产品特殊情况
 */
export class OutOfStockProduct implements IProduct {
  constructor(private originalProduct: IProduct) {}

  getId(): string {
    return this.originalProduct.getId();
  }

  getName(): string {
    return `${this.originalProduct.getName()} (缺货)`;
  }

  getPrice(): number {
    return this.originalProduct.getPrice();
  }

  getCurrency(): string {
    return this.originalProduct.getCurrency();
  }

  getStock(): number {
    return 0;
  }

  isAvailable(): boolean {
    return false;
  }

  canPurchase(quantity: number): boolean {
    return false;
  }

  getDescription(): string {
    return `${this.originalProduct.getDescription()}\n\n该商品暂时缺货，请关注后续补货信息。`;
  }

  getImageUrl(): string {
    return "/images/out-of-stock.jpg";
  }

  getFormattedPrice(): string {
    return `${this.originalProduct.getFormattedPrice()} (缺货)`;
  }

  toString(): string {
    return `OutOfStockProduct(${this.originalProduct.toString()})`;
  }
}

/**
 * 未找到产品特殊情况
 */
export class NotFoundProduct implements IProduct {
  private static instance: NotFoundProduct;

  private constructor() {}

  static getInstance(): NotFoundProduct {
    if (!NotFoundProduct.instance) {
      NotFoundProduct.instance = new NotFoundProduct();
    }
    return NotFoundProduct.instance;
  }

  getId(): string {
    return "not-found";
  }

  getName(): string {
    return "产品未找到";
  }

  getPrice(): number {
    return 0;
  }

  getCurrency(): string {
    return "CNY";
  }

  getStock(): number {
    return 0;
  }

  isAvailable(): boolean {
    return false;
  }

  canPurchase(quantity: number): boolean {
    return false;
  }

  getDescription(): string {
    return "抱歉，您查找的产品不存在或已下架。";
  }

  getImageUrl(): string {
    return "/images/not-found.jpg";
  }

  getFormattedPrice(): string {
    return "价格未知";
  }

  toString(): string {
    return "NotFoundProduct";
  }
}

/**
 * 免费产品特殊情况
 */
export class FreeProduct extends Product {
  constructor(
    id: string,
    name: string,
    description: string = "",
    imageUrl: string = ""
  ) {
    super(id, name, 0, "CNY", Number.MAX_SAFE_INTEGER, description, imageUrl);
  }

  getFormattedPrice(): string {
    return "免费";
  }

  canPurchase(quantity: number): boolean {
    return true; // 免费产品总是可以获取
  }

  toString(): string {
    return `FreeProduct(${this.getId()}, ${this.getName()})`;
  }
}

// ======================== 订单特殊情况 ========================

/**
 * 订单接口
 */
export interface IOrder {
  getId(): string;
  getUserId(): string;
  getStatus(): string;
  getTotalAmount(): number;
  getItems(): OrderItem[];
  canCancel(): boolean;
  canRefund(): boolean;
  getStatusMessage(): string;
  getEstimatedDelivery(): Date | null;
  toString(): string;
}

/**
 * 订单项
 */
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * 普通订单实现
 */
export class Order implements IOrder {
  constructor(
    private id: string,
    private userId: string,
    private status: string,
    private totalAmount: number,
    private items: OrderItem[],
    private createdAt: Date = new Date()
  ) {}

  getId(): string {
    return this.id;
  }

  getUserId(): string {
    return this.userId;
  }

  getStatus(): string {
    return this.status;
  }

  getTotalAmount(): number {
    return this.totalAmount;
  }

  getItems(): OrderItem[] {
    return [...this.items];
  }

  canCancel(): boolean {
    return ["pending", "confirmed"].includes(this.status);
  }

  canRefund(): boolean {
    return ["delivered"].includes(this.status);
  }

  getStatusMessage(): string {
    const statusMessages: { [status: string]: string } = {
      pending: "待处理",
      confirmed: "已确认",
      shipped: "已发货",
      delivered: "已送达",
      cancelled: "已取消",
    };
    return statusMessages[this.status] || "未知状态";
  }

  getEstimatedDelivery(): Date | null {
    if (this.status === "shipped") {
      const delivery = new Date(this.createdAt);
      delivery.setDate(delivery.getDate() + 3); // 3天后送达
      return delivery;
    }
    return null;
  }

  toString(): string {
    return `Order(${this.id}, ${this.status}, ¥${this.totalAmount})`;
  }
}

/**
 * 空订单特殊情况
 */
export class EmptyOrder implements IOrder {
  private static instance: EmptyOrder;

  private constructor() {}

  static getInstance(): EmptyOrder {
    if (!EmptyOrder.instance) {
      EmptyOrder.instance = new EmptyOrder();
    }
    return EmptyOrder.instance;
  }

  getId(): string {
    return "empty";
  }

  getUserId(): string {
    return "";
  }

  getStatus(): string {
    return "empty";
  }

  getTotalAmount(): number {
    return 0;
  }

  getItems(): OrderItem[] {
    return [];
  }

  canCancel(): boolean {
    return false;
  }

  canRefund(): boolean {
    return false;
  }

  getStatusMessage(): string {
    return "空订单";
  }

  getEstimatedDelivery(): Date | null {
    return null;
  }

  toString(): string {
    return "EmptyOrder";
  }
}

/**
 * 已取消订单特殊情况
 */
export class CancelledOrder extends Order {
  constructor(
    id: string,
    userId: string,
    totalAmount: number,
    items: OrderItem[],
    private cancellationReason: string = "用户取消",
    private cancelledAt: Date = new Date()
  ) {
    super(id, userId, "cancelled", totalAmount, items);
  }

  canCancel(): boolean {
    return false; // 已取消的订单不能再次取消
  }

  canRefund(): boolean {
    return false; // 已取消的订单不需要退款
  }

  getStatusMessage(): string {
    return `已取消 - ${this.cancellationReason}`;
  }

  getCancellationReason(): string {
    return this.cancellationReason;
  }

  getCancelledAt(): Date {
    return this.cancelledAt;
  }

  toString(): string {
    return `CancelledOrder(${this.getId()}, ${this.cancellationReason})`;
  }
}

// ======================== 服务类 - 使用Special Case ========================

/**
 * 用户服务
 */
export class UserService {
  private users: Map<string, IUser> = new Map();

  constructor() {
    // 初始化一些测试用户
    this.users.set(
      "admin",
      new AdminUser("admin", "管理员", "admin@example.com")
    );
    this.users.set(
      "user1",
      new User("user1", "张三", "zhangsan@example.com", "user")
    );
  }

  /**
   * 根据ID查找用户，使用Special Case处理未找到的情况
   */
  findUserById(id: string): IUser {
    const user = this.users.get(id);
    if (user) {
      return user;
    }

    // 返回UnknownUser特殊情况，而不是null
    return UnknownUser.getInstance();
  }

  /**
   * 获取系统用户
   */
  getSystemUser(): IUser {
    return SystemUser.getInstance();
  }

  /**
   * 检查用户权限的客户端代码变得非常简洁
   */
  checkUserAccess(userId: string, resource: string): boolean {
    const user = this.findUserById(userId);
    // 不需要null检查，Special Case会处理
    return user.canAccess(resource);
  }

  /**
   * 获取用户显示名称
   */
  getUserDisplayName(userId: string): string {
    const user = this.findUserById(userId);
    // 不需要null检查
    return user.getDisplayName();
  }
}

/**
 * 产品服务
 */
export class ProductService {
  private products: Map<string, IProduct> = new Map();

  constructor() {
    // 初始化一些测试产品
    this.products.set("p1", new Product("p1", "iPhone 15", 5999, "CNY", 10));
    this.products.set("p2", new Product("p2", "MacBook Pro", 15999, "CNY", 0)); // 缺货
    this.products.set(
      "free1",
      new FreeProduct("free1", "免费电子书", "程序设计指南")
    );
  }

  /**
   * 根据ID查找产品，使用Special Case处理各种情况
   */
  findProductById(id: string): IProduct {
    const product = this.products.get(id);

    if (!product) {
      return NotFoundProduct.getInstance();
    }

    if (product.getStock() === 0 && !(product instanceof FreeProduct)) {
      return new OutOfStockProduct(product);
    }

    return product;
  }

  /**
   * 检查产品是否可购买
   */
  canPurchaseProduct(productId: string, quantity: number): boolean {
    const product = this.findProductById(productId);
    // 不需要null检查和库存检查，Special Case会处理
    return product.canPurchase(quantity);
  }

  /**
   * 获取产品价格显示
   */
  getProductPriceDisplay(productId: string): string {
    const product = this.findProductById(productId);
    // 不需要null检查
    return product.getFormattedPrice();
  }
}

/**
 * Special Case使用示例
 */
export class SpecialCaseExample {
  private userService: UserService;
  private productService: ProductService;

  constructor() {
    this.userService = new UserService();
    this.productService = new ProductService();
  }

  /**
   * 演示Special Case模式的使用
   */
  async demonstrateSpecialCase() {
    console.log("=== Special Case模式演示 ===");

    // 1. 用户特殊情况
    console.log("\n1. 用户Special Case:");

    // 正常用户
    const normalUser = this.userService.findUserById("user1");
    console.log("✓ 正常用户:", normalUser.getDisplayName());
    console.log("  - 可以访问订单:", normalUser.canAccess("orders"));

    // 管理员用户
    const adminUser = this.userService.findUserById("admin");
    console.log("✓ 管理员用户:", adminUser.getDisplayName());
    console.log("  - 可以访问用户管理:", adminUser.canAccess("users"));

    // 未知用户（不存在的用户ID）
    const unknownUser = this.userService.findUserById("nonexistent");
    console.log("✓ 未知用户:", unknownUser.getDisplayName());
    console.log("  - 可以访问公共资源:", unknownUser.canAccess("public"));
    console.log("  - 可以访问订单:", unknownUser.canAccess("orders"));

    // 系统用户
    const systemUser = this.userService.getSystemUser();
    console.log("✓ 系统用户:", systemUser.getDisplayName());
    console.log("  - 始终在线:", systemUser.getLastLoginDate() !== null);

    // 2. 产品特殊情况
    console.log("\n2. 产品Special Case:");

    // 正常产品
    const normalProduct = this.productService.findProductById("p1");
    console.log("✓ 正常产品:", normalProduct.getName());
    console.log("  - 价格:", normalProduct.getFormattedPrice());
    console.log("  - 可购买2个:", normalProduct.canPurchase(2));

    // 缺货产品
    const outOfStockProduct = this.productService.findProductById("p2");
    console.log("✓ 缺货产品:", outOfStockProduct.getName());
    console.log("  - 价格:", outOfStockProduct.getFormattedPrice());
    console.log("  - 可购买1个:", outOfStockProduct.canPurchase(1));

    // 免费产品
    const freeProduct = this.productService.findProductById("free1");
    console.log("✓ 免费产品:", freeProduct.getName());
    console.log("  - 价格:", freeProduct.getFormattedPrice());
    console.log("  - 可购买100个:", freeProduct.canPurchase(100));

    // 不存在的产品
    const notFoundProduct = this.productService.findProductById("nonexistent");
    console.log("✓ 未找到产品:", notFoundProduct.getName());
    console.log("  - 价格:", notFoundProduct.getFormattedPrice());
    console.log("  - 可购买:", notFoundProduct.canPurchase(1));

    // 3. 客户端代码简化演示
    console.log("\n3. 客户端代码简化:");

    // 不需要复杂的null检查和条件判断
    const userIds = ["user1", "admin", "nonexistent"];
    userIds.forEach((userId) => {
      const canAccessOrders = this.userService.checkUserAccess(
        userId,
        "orders"
      );
      const displayName = this.userService.getUserDisplayName(userId);
      console.log(`✓ ${displayName} 访问订单权限: ${canAccessOrders}`);
    });

    const productIds = ["p1", "p2", "free1", "nonexistent"];
    productIds.forEach((productId) => {
      const canPurchase = this.productService.canPurchaseProduct(productId, 1);
      const priceDisplay =
        this.productService.getProductPriceDisplay(productId);
      console.log(
        `✓ 产品 ${productId} - ${priceDisplay}, 可购买: ${canPurchase}`
      );
    });

    // 4. 订单特殊情况
    console.log("\n4. 订单Special Case:");

    const normalOrder = new Order("order1", "user1", "pending", 299.99, [
      {
        productId: "p1",
        productName: "iPhone 15",
        quantity: 1,
        unitPrice: 299.99,
        totalPrice: 299.99,
      },
    ]);
    console.log("✓ 正常订单:", normalOrder.getStatusMessage());
    console.log("  - 可取消:", normalOrder.canCancel());

    const cancelledOrder = new CancelledOrder(
      "order2",
      "user1",
      299.99,
      [],
      "库存不足"
    );
    console.log("✓ 已取消订单:", cancelledOrder.getStatusMessage());
    console.log("  - 可取消:", cancelledOrder.canCancel());

    const emptyOrder = EmptyOrder.getInstance();
    console.log("✓ 空订单:", emptyOrder.getStatusMessage());
    console.log("  - 商品数量:", emptyOrder.getItems().length);

    this.printSpecialCaseGuidelines();
  }

  private printSpecialCaseGuidelines(): void {
    console.log(`
Special Case模式使用指南：

设计原则：
- 使用多态替代条件判断
- 为特殊情况提供默认行为
- 让特殊情况对象知道如何处理自己
- 保持接口一致性

常见的Special Case：
- Null Object：处理null值
- Empty Object：处理空集合
- Default Object：提供默认值
- Error Object：处理错误状态

优点：
- 消除重复的null检查
- 简化客户端代码
- 提高代码可读性
- 符合开闭原则

使用场景：
- 频繁的null检查
- 重复的特殊情况处理
- 需要默认行为
- 简化条件逻辑

实现技巧：
- 使用单例模式（如Null Object）
- 继承基类提供默认实现
- 确保Special Case对象行为一致
- 考虑使用工厂方法创建

注意事项：
- 不要滥用，只在真正简化代码时使用
- 确保Special Case行为符合业务逻辑
- 仔细设计接口，确保所有实现都合理
- 文档化Special Case的行为
    `);
  }
}
